import type { EngineSet, MetricReason, ProgressionCategory, ProgressionState } from '../model/types'
import { EngineDefaults } from './engineDefaults'
import { groupIntoSessions } from './sessions'

const STEP_REPS = 1

/**
 * Progression for an exercise with no weight, where the one number to beat is the reps (port of
 * SingleMetricEngine.kt, reps only). Reaching the target raises it to the session's best plus one, up to a
 * ceiling; missing it leaves it where it was; three misses in a row rebase it. Worked out by walking the
 * sessions oldest first, so nothing is stored.
 */
export function calculateRepsOnlyProgression(
  sets: EngineSet[],
  ceiling: number,
  relativeTime: number,
): ProgressionState {
  const metric = (s: EngineSet): number => s.reps
  const maxOf = (list: EngineSet[]): number => (list.length === 0 ? 0 : Math.max(...list.map(metric)))

  const sortedSets = [...sets].sort((a, b) => b.timestamp - a.timestamp)
  const sessions = groupIntoSessions(sortedSets)

  const newest = sortedSets[0]
  const isSessionActive = newest !== undefined && relativeTime - newest.timestamp < EngineDefaults.SESSION_THRESHOLD_MS

  const todaySets = isSessionActive ? (sessions[0] ?? []) : []
  const referenceIndex = isSessionActive ? 1 : 0
  const referenceSets = sessions[referenceIndex] ?? []
  const hasReference = referenceIndex < sessions.length

  const refBest = maxOf(referenceSets)
  const todayBest = maxOf(todaySets)

  // Walk the finished sessions oldest first.
  const finished = (isSessionActive ? sessions.slice(1) : sessions).slice().reverse()
  let runningTarget: number | null = null
  let targetBeforeLast: number | null = null
  let missedBests: number[] = []
  let missStreak = 0
  finished.forEach((session, index) => {
    const best = maxOf(session)
    if (index === finished.length - 1) targetBeforeLast = runningTarget
    const current = runningTarget
    if (current === null || best >= current) {
      runningTarget = Math.min(best + STEP_REPS, ceiling)
      missedBests = []
      missStreak = 0
    } else {
      missStreak++
      missedBests.push(best)
      if (missedBests.length >= EngineDefaults.REBASE_AFTER_MISSED_SESSIONS) {
        // A lasting drop is the new baseline.
        runningTarget = Math.min(Math.max(...missedBests) + STEP_REPS, ceiling)
        missedBests = []
      }
    }
  })
  const refTarget: number = runningTarget ?? Math.min(refBest + STEP_REPS, ceiling)

  let category: ProgressionCategory
  let reason: MetricReason
  if (sessions.length === 0) {
    category = 'OTHER'
    reason = { type: 'FirstSession' }
  } else if (!hasReference) {
    category = 'BUILD_VOLUME'
    reason = { type: 'Target', target: Math.min(todayBest + STEP_REPS, ceiling), lastBest: todayBest, held: false }
  } else if (!isSessionActive) {
    if (refBest >= ceiling) {
      category = 'READY_TO_OVERLOAD'
      reason = { type: 'AtCeiling', ceiling }
    } else {
      // The target moved (cleared last time, or rebased): a new target. Missed it once or twice: the same one.
      const previous = targetBeforeLast
      const moved = previous === null || refTarget !== previous
      category = moved ? 'READY_TO_OVERLOAD' : 'BUILD_VOLUME'
      reason = { type: 'Target', target: refTarget, lastBest: refBest, held: !moved }
    }
  } else if (todayBest >= ceiling) {
    category = 'GOAL_REACHED'
    reason = { type: 'AtCeiling', ceiling }
  } else if (todayBest >= refTarget) {
    category = 'GOAL_REACHED'
    reason = { type: 'GoalReached', cleared: todayBest, nextTarget: Math.min(todayBest + STEP_REPS, ceiling) }
  } else if (todayBest > 0) {
    category = 'BUILD_VOLUME'
    reason = { type: 'Remaining', target: refTarget, repsLeft: refTarget - todayBest }
  } else {
    category = 'BUILD_VOLUME'
    reason = {
      type: 'Target',
      target: refTarget,
      lastBest: refBest,
      held: refTarget > Math.min(refBest + STEP_REPS, ceiling),
    }
  }

  return {
    category,
    latestWeight: 0,
    latestReps: isSessionActive && todayBest > 0 ? todayBest : refBest,
    previousWeight: 0,
    previousReps: refBest,
    previousSessionSetCount: referenceSets.length,
    nextWeight: 0,
    backOff: null,
    progressionSuggestion: { type: 'SingleMetric', unit: 'REPS', reason },
    repsAtNextWeight: 0,
    daysCount: sessions.length,
    targetMatrix: [],
    staleSessionsCount: missStreak,
    setsToday: todaySets.length,
    sessionLastWeight: 0,
    sessionLastReps: todaySets[0]?.reps ?? 0,
    lighterSession: null,
  }
}
