import { formatWeight } from '../progression/math'

// Port of GhisaGrammarFormatter, kilograms only.

/** "1 rep" or "8 reps". */
export function formatCount(count: number, singular: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${singular}s`
}

export const formatReps = (reps: number): string => formatCount(reps, 'rep')

/** "80kg × 8", or "8 reps" when there is no weight. */
export function formatSetCompact(weight: number, reps: number): string {
  return weight <= 0 ? formatReps(reps) : `${formatWeight(weight)}kg × ${reps}`
}

/** "Target: 80kg × 8", or "Target: 8 reps" when there is no weight yet. */
export function formatTargetInstruction(targetReps: number, nextWeight: number): string {
  return `Target: ${formatSetCompact(nextWeight, targetReps)}`
}

/** "Cleared 80kg × 8 · Next 82.5kg × 8". */
export function formatMilestoneCleared(currentWeight: number, targetReps: number, nextWeight: number): string {
  return `Cleared ${formatWeight(currentWeight)}kg × ${targetReps} · Next ${formatWeight(nextWeight)}kg × ${targetReps}`
}

/** The chip on the card: "Last: 80kg × 8", "Last: 8 reps" or "First session". */
export function formatLastSessionHeader(
  hasHistory: boolean,
  weight: number,
  reps: number,
  isRepsOnly: boolean,
): string {
  if (!hasHistory) return 'First session'
  return isRepsOnly || weight <= 0 ? `Last: ${formatReps(reps)}` : `Last: ${formatWeight(weight)}kg × ${reps}`
}

/** "Any weight × 10". */
export const formatFirstSessionPlaceholder = (targetReps: number): string => `Any weight × ${targetReps}`
