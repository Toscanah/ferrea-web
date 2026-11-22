import type { TargetOption } from '../model/types'
import { EngineDefaults, type OneRepMaxFormula } from './engineDefaults'
import { calculateOneRepMax, f } from './math'
import { previous, type StepScale } from './stepScale'

/** The weight that takes the same effort for toReps as weight did for fromReps. */
function equivalentWeight(weight: number, fromReps: number, toReps: number, formula: OneRepMaxFormula): number {
  const oneRepMax = calculateOneRepMax(weight, fromReps, formula)
  const perKg = calculateOneRepMax(1, toReps, formula)
  return oneRepMax <= 0 || perKg <= 0 ? weight : f(oneRepMax / perKg)
}

/**
 * The lighter set suggested after a working set (port of BackOff.kt). Effort-based: the weight the last
 * set implies at the target reps, times 90%, rounded DOWN to the step ladder, and never less than two
 * steps below the last set.
 */
export function calculateBackOff(
  topWeight: number,
  topReps: number,
  scale: StepScale,
  targetReps: number,
  formula: OneRepMaxFormula,
): TargetOption | null {
  if (topWeight <= 0) return null

  // Weights below the set on the step ladder, heaviest first.
  const ladder: number[] = []
  let curr = topWeight
  for (;;) {
    const prev = previous(scale, curr)
    if (prev >= curr || prev < scale.base || prev >= topWeight) break
    ladder.push(prev)
    curr = prev
  }
  if (ladder.length === 0) return null

  const ideal = f(equivalentWeight(topWeight, topReps, targetReps, formula) * EngineDefaults.BACK_OFF_FRACTION)
  // Skip the first steps down; with only one step available, use it.
  let allowed = ladder.slice(EngineDefaults.BACK_OFF_MIN_STEPS - 1)
  if (allowed.length === 0) allowed = ladder
  const weight =
    allowed.find((w) => w <= f(ideal + EngineDefaults.WEIGHT_EPSILON)) ?? allowed[allowed.length - 1]
  return { weight, reps: targetReps }
}
