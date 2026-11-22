import { EngineDefaults, type OneRepMaxFormula } from './engineDefaults'

/** Round to a 32-bit float, like Kotlin's Float, so results match the Android app digit for digit. */
export const f = Math.fround

export function calculateOneRepMax(weight: number, reps: number, formula: OneRepMaxFormula = 'EPLEY'): number {
  if (weight <= 0 || reps <= 0 || reps > EngineDefaults.MAX_ESTIMATE_REPS) return 0
  if (reps === 1) return weight
  switch (formula) {
    case 'BRZYCKI':
      return f(f(weight * 36) / f(37 - reps))
    case 'LANDER':
      return f(f(weight * 100) / f(f(101.3) - f(f(2.67123) * reps)))
    case 'EPLEY':
      return f(weight * f(1 + f(reps / 30)))
  }
}

/** Reps that take about the same effort at the weight as the target 1RM, kept within a sensible range. */
export function calculateIntensityMatch(target1RM: number, weight: number, targetReps = 10): number {
  if (weight <= 0 || target1RM <= 0) return 0
  // Kotlin's roundToInt rounds ties up, like Math.round.
  const rawReps = Math.round(f(37 - f(f(weight * 36) / target1RM)))
  const minReps = Math.max(targetReps - 4, 3)
  const maxReps = targetReps + 5
  return Math.min(Math.max(rawReps, minReps), maxReps)
}

/** "80", "82.5": no trailing zeros, always a dot. */
export function formatWeight(w: number): string {
  if (w % 1 === 0) return String(Math.trunc(w))
  return w.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}
