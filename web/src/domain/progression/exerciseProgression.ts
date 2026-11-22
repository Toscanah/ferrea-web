import type { Exercise, ExerciseSet, ProgressionState } from '../model/types'
import { EngineDefaults } from './engineDefaults'
import { f } from './math'
import { calculateRepsOnlyProgression } from './singleMetricEngine'
import { makeStepScale, stepUp, type StepScale } from './stepScale'
import { calculateProgression } from './workoutEngine'

/** The kg step ladder of an exercise (base step plus optional tiers). */
export function stepScaleFor(exercise: Pick<Exercise, 'weightStepKg' | 'stepTiersKg'>): StepScale {
  return makeStepScale(exercise.weightStepKg, exercise.stepTiersKg ?? [])
}

/**
 * Progression for an exercise from all of its logged sets. This is the boundary the Android ViewModel
 * plays: warm-ups are removed here, before the engines, and the engine is picked by the exercise's mode.
 */
export function progressionFor(exercise: Exercise, sets: ExerciseSet[], now: number): ProgressionState {
  const working = sets.filter((s) => !s.isWarmup)
  if (exercise.progressionMode === 'REPS_ONLY') {
    return calculateRepsOnlyProgression(working, exercise.repsCeiling ?? EngineDefaults.DEFAULT_REPS_CEILING, now)
  }
  return calculateProgression(working, exercise.preferredTargetReps, stepScaleFor(exercise), now)
}

const LB_PER_KG = 1 / 0.45359237

/** kg to lb rounded to 2 decimals, as the Android app stores its log-time snapshot. */
const kgToLb = (kg: number): number => Math.round(kg * LB_PER_KG * 100) / 100

/**
 * A new set with its log-time snapshots (port of buildLoggedSet). Weight is kg; a reps-only set stores 0 weight.
 */
export function buildLoggedSet(
  exercise: Exercise,
  reps: number,
  weightKg: number,
  timestamp: number,
  isWarmup: boolean,
  targetRepsAtLog: number | null,
  now: number,
  note = '',
): Omit<ExerciseSet, 'id'> {
  const hasNoWeight = exercise.progressionMode !== 'WEIGHT_REPS'
  const weight = hasNoWeight ? 0 : weightKg
  const lbScale = makeStepScale(exercise.weightStepLb, exercise.stepTiersLb ?? [])
  return {
    exerciseId: exercise.id,
    reps,
    weight,
    note,
    timestamp,
    targetRepsAtLog,
    stepKgAtLog: hasNoWeight ? null : f(stepUp(stepScaleFor(exercise), weight)),
    stepLbAtLog: hasNoWeight ? null : f(stepUp(lbScale, kgToLb(weight))),
    plannedSetsAtLog: exercise.plannedSets ?? null,
    isWarmup,
    createdAt: now,
    updatedAt: now,
    durationSeconds: null,
  }
}
