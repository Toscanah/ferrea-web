import { count, t } from '../i18n/strings'
import { formatWeight } from '../progression/math'

// Port of GhisaGrammarFormatter, kilograms only.

/** "1 rep" or "8 reps" ("1 ripetizione", "8 ripetizioni"). */
export const formatReps = (reps: number): string => count(reps, 'rep')

/** "80kg × 8", or "8 reps" when there is no weight. */
export function formatSetCompact(weight: number, reps: number): string {
  return weight <= 0 ? formatReps(reps) : `${formatWeight(weight)}kg × ${reps}`
}

/** "Target: 80kg × 8", or "Target: 8 reps" when there is no weight yet. */
export function formatTargetInstruction(targetReps: number, nextWeight: number): string {
  return `${t('target')}: ${formatSetCompact(nextWeight, targetReps)}`
}

/** "Cleared 80kg × 8 · Next 82.5kg × 8". */
export function formatMilestoneCleared(currentWeight: number, targetReps: number, nextWeight: number): string {
  return `${t('cleared')} ${formatWeight(currentWeight)}kg × ${targetReps} · ${t('next')} ${formatWeight(nextWeight)}kg × ${targetReps}`
}

/** The chip on the card: "Last: 80kg × 8", "Last: 8 reps" or "First session". */
export function formatLastSessionHeader(
  hasHistory: boolean,
  weight: number,
  reps: number,
  isRepsOnly: boolean,
): string {
  if (!hasHistory) return t('firstSessionChip')
  return isRepsOnly || weight <= 0 ? `${t('last')}: ${formatReps(reps)}` : `${t('last')}: ${formatWeight(weight)}kg × ${reps}`
}

/** "Any weight × 10". */
export const formatFirstSessionPlaceholder = (targetReps: number): string => t('anyWeight', { n: targetReps })
