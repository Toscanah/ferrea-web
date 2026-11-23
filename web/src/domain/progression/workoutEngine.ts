import type {
  EngineSet,
  ProgressionCategory,
  ProgressionState,
  ProgressionSuggestion,
  TargetOption,
  VolumeReason,
} from '../model/types'
import { calculateBackOff } from './backOff'
import { EngineDefaults, FIXED_SETTINGS } from './engineDefaults'
import { calculateOneRepMax, f } from './math'
import { groupIntoSessions, maxWith } from './sessions'
import { next, type StepScale } from './stepScale'
import { calculateMatrix } from './targetMatrix'

const byWeightThenReps = (a: EngineSet, b: EngineSet): number => a.weight - b.weight || a.reps - b.reps

const workingFloor = (targetReps: number): number =>
  Math.max(Math.trunc(targetReps / 2), EngineDefaults.QUALITY_FLOOR)

/**
 * The newest sessions to skip as the reference: all of them much lighter than the last normal session,
 * and that session recent. Otherwise the drop is treated as real.
 */
function countLighterSessions(
  completed: EngineSet[][],
  relativeTime: number,
  topSetOf: (session: EngineSet[]) => EngineSet | undefined,
): number {
  for (let index = 1; index < completed.length; index++) {
    const anchor = completed[index]
    const anchorEnd = Math.max(...anchor.map((s) => s.timestamp))
    if (relativeTime - anchorEnd > EngineDefaults.LIGHTER_SESSION_WINDOW_MS) return 0

    const anchorWeight = topSetOf(anchor)?.weight ?? 0
    const limit = f(f(anchorWeight * f(1 - EngineDefaults.LIGHTER_SESSION_DROP)) + EngineDefaults.WEIGHT_EPSILON)
    const allLighter = completed.slice(0, index).every((session) => (topSetOf(session)?.weight ?? 0) <= limit)
    if (anchorWeight > 0 && allLighter) return index
  }
  return 0
}

const sameWeight = (a: number, b: number): boolean => Math.abs(f(a - b)) <= EngineDefaults.WEIGHT_EPSILON

function generateSuggestion(
  category: ProgressionCategory,
  isOvershoot: boolean,
  targetReps: number,
  nextWeight: number,
  todayWeight: number,
  refWeight: number,
  todayMaxReps: number,
  refReps: number,
  lighterSessionSkipped: boolean,
): ProgressionSuggestion {
  switch (category) {
    case 'READY_TO_OVERLOAD':
      return { type: 'OverloadReady', targetReps, nextWeight, lighterSessionSkipped }
    case 'GOAL_REACHED':
      return { type: 'GoalReached', nextWeight, targetReps, weight: todayWeight }
    case 'BUILD_VOLUME': {
      let reason: VolumeReason
      if (isOvershoot) {
        reason = { type: 'Overshoot', targetReps, nextWeight }
      } else if (todayWeight > f(nextWeight + EngineDefaults.WEIGHT_EPSILON)) {
        // A heavier set with too few reps to count: the target is unchanged.
        reason = { type: 'StandardTarget', targetReps, nextWeight }
      } else if (todayWeight > 0 && todayWeight >= f(nextWeight - EngineDefaults.WEIGHT_EPSILON) && todayMaxReps < targetReps) {
        reason = { type: 'RepsRemaining', repsLeft: targetReps - todayMaxReps, targetReps, weight: todayWeight }
      } else if (todayWeight === 0 && sameWeight(refWeight, nextWeight) && refReps >= 1 && refReps < targetReps) {
        reason = { type: 'RepsRemaining', repsLeft: targetReps - refReps, targetReps, weight: refWeight }
      } else if (todayWeight > 0 && sameWeight(todayWeight, refWeight) && todayMaxReps < refReps) {
        reason = { type: 'ShortOnReps', repsShort: refReps - todayMaxReps, targetReps, nextWeight }
      } else {
        reason = { type: 'StandardTarget', targetReps, nextWeight }
      }
      return { type: 'BuildVolume', reason, lighterSessionSkipped }
    }
    default:
      return { type: 'StartTracking', targetReps }
  }
}

/**
 * Port of WorkoutEngine.calculateProgressionOfExercise, without the history, records and chart data the
 * web app does not show. Weights are kg. [sets] must exclude warm-ups. Stateless: everything is derived
 * from the sets and the time passed in.
 */
export function calculateProgression(
  sets: EngineSet[],
  targetReps: number,
  stepScale: StepScale,
  relativeTime: number,
): ProgressionState {
  const formula = FIXED_SETTINGS.formula
  const floor = workingFloor(targetReps)

  // 1. Group sets into sessions (newest first).
  const sortedSets = [...sets].sort((a, b) => b.timestamp - a.timestamp)
  const sessions = groupIntoSessions(sortedSets)

  // 2. Is a session running right now?
  const newest = sortedSets[0]
  const isSessionActive = newest !== undefined && relativeTime - newest.timestamp < EngineDefaults.SESSION_THRESHOLD_MS
  const todaySets = isSessionActive ? (sessions[0] ?? []) : []
  const completed = isSessionActive ? sessions.slice(1) : sessions

  const topSetOf = (session: EngineSet[]): EngineSet | undefined => {
    const working = session.filter((s) => s.reps >= floor)
    return maxWith(working.length > 0 ? working : session, byWeightThenReps)
  }

  // A session with no working set whose heaviest set is above the last session that had one (a max test of
  // heavy singles) says nothing about the working weight, so it is not used as the reference. A bad day at or
  // below that weight still counts: it keeps the target where it is.
  let lastWorkingWeight: number | null = null
  const usable = [...completed]
    .reverse()
    .filter((session) => {
      const working = session.filter((s) => s.reps >= floor)
      if (working.length > 0) {
        lastWorkingWeight = Math.max(...working.map((s) => s.weight))
        return true
      }
      return lastWorkingWeight === null || Math.max(...session.map((s) => s.weight)) <= f(lastWorkingWeight + EngineDefaults.WEIGHT_EPSILON)
    })
    .reverse()

  const skipped = countLighterSessions(usable, relativeTime, topSetOf)
  const referenceSets = usable[skipped] ?? []
  const lighterSession: TargetOption | null =
    skipped > 0 ? (() => { const t = topSetOf(usable[0]); return t ? { weight: t.weight, reps: t.reps } : null })() : null

  // 3. The best performances.
  const refBest = topSetOf(referenceSets)
  const refWeight = refBest?.weight ?? 0
  const refReps = refBest?.reps ?? 0

  const todayBest = maxWith(todaySets, byWeightThenReps)
  const todayWeight = todayBest?.weight ?? 0
  const todayMaxReps = todayBest?.reps ?? 0
  const today1RM = todayBest ? calculateOneRepMax(todayBest.weight, todayBest.reps, formula) : 0

  // 4. The progression rule.
  const lastSessionCleared = refBest !== undefined && refReps >= targetReps

  const baseNextWeight =
    refWeight > 0 ? (lastSessionCleared ? next(stepScale, refWeight) : refWeight)
    : todayWeight > 0 ? todayWeight
    : sets.length > 0 ? Math.max(...sets.map((s) => s.weight))
    : 0

  const thresholdWeightForCheck = refWeight === 0 ? todayWeight : baseNextWeight

  const todayGoalClearedSet = maxWith(
    todaySets.filter((s) => s.reps >= targetReps && s.weight >= f(thresholdWeightForCheck - EngineDefaults.WEIGHT_EPSILON)),
    byWeightThenReps,
  )
  const hitGoalToday = isSessionActive && todayGoalClearedSet !== undefined && todayGoalClearedSet.weight > 0
  const activeGoalWeight = todayGoalClearedSet?.weight ?? 0

  // Ratchet, applied today: a heavier set with enough reps to count becomes the target now.
  const todayTopSet = topSetOf(todaySets)
  const heavierSetCounts =
    isSessionActive && !hitGoalToday && refWeight > 0 && todayTopSet !== undefined &&
    todayTopSet.weight > f(thresholdWeightForCheck + EngineDefaults.WEIGHT_EPSILON) && todayTopSet.reps >= floor

  const effectiveNextWeight =
    hitGoalToday && activeGoalWeight > 0 ? next(stepScale, activeGoalWeight)
    : heavierSetCounts ? todayTopSet!.weight
    : thresholdWeightForCheck

  const category: ProgressionCategory =
    sessions.length === 0 ? 'OTHER'
    : hitGoalToday ? 'GOAL_REACHED'
    : isSessionActive ? 'BUILD_VOLUME'
    : lastSessionCleared ? 'READY_TO_OVERLOAD'
    : 'BUILD_VOLUME'

  const repsAtNextWeight = isSessionActive
    ? Math.max(0, ...todaySets.filter((s) => s.weight >= f(effectiveNextWeight - EngineDefaults.WEIGHT_EPSILON)).map((s) => s.reps))
    : 0

  let staleSessionsCount = 0
  for (const session of usable.slice(skipped)) {
    const best = topSetOf(session)
    if (best !== undefined && best.reps < targetReps) staleSessionsCount++
    else break
  }

  // 5. The suggestion text input.
  const isOvershoot = heavierSetCounts && category === 'BUILD_VOLUME' && todayMaxReps < refReps
  const progressionSuggestion = generateSuggestion(
    category,
    isOvershoot,
    targetReps,
    effectiveNextWeight,
    hitGoalToday ? activeGoalWeight : todayWeight,
    refWeight,
    todayMaxReps,
    refReps,
    skipped > 0 && !isSessionActive,
  )

  const targetMatrix = calculateMatrix(
    effectiveNextWeight, todayWeight, refWeight, today1RM, targetReps, stepScale, FIXED_SETTINGS.matrixSpread,
  )

  // 6. The back-off after the latest working set today.
  const recentLoggedSet = isSessionActive ? todaySets[0] : undefined
  // A first set far below the target is almost surely an unflagged warm-up: no back-off after it.
  const lightFloor = f(effectiveNextWeight * EngineDefaults.BACK_OFF_MIN_WEIGHT_FRACTION)
  const onlyLightSets = effectiveNextWeight > 0 && todaySets.every((s) => s.weight < lightFloor)
  const backOff =
    recentLoggedSet !== undefined && recentLoggedSet.weight > 0 && !onlyLightSets
      ? calculateBackOff(recentLoggedSet.weight, recentLoggedSet.reps, stepScale, targetReps, formula)
      : null

  return {
    category,
    latestWeight: isSessionActive && todayBest ? todayWeight : refWeight,
    latestReps: isSessionActive && todayBest ? todayMaxReps : refReps,
    previousWeight: refWeight,
    previousReps: refReps,
    previousSessionSetCount: (completed[0] ?? []).length,
    nextWeight: effectiveNextWeight,
    backOff,
    progressionSuggestion,
    repsAtNextWeight,
    daysCount: sessions.length,
    targetMatrix,
    staleSessionsCount,
    setsToday: todaySets.length,
    sessionLastWeight: recentLoggedSet?.weight ?? 0,
    sessionLastReps: todaySets[0]?.reps ?? 0,
    lighterSession,
  }
}
