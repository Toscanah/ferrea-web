import type { ProgressionSuggestion } from '../model/types'
import {
  formatMilestoneCleared,
  formatReps,
  formatSetCompact,
  formatTargetInstruction,
} from '../formatter/formatter'

export const LIGHTER_SESSION_NOTE = 'Last session was lighter, target kept'

const withLighterSessionNote = (message: string, skipped: boolean): string =>
  skipped ? `${message} · ${LIGHTER_SESSION_NOTE}` : message

/**
 * Status label and body line for a suggestion (port of toDisplayMessage in ProgressionCategoryMapper.kt).
 * The label is uppercase; the body is short fragments joined by " · ".
 */
export function toDisplayMessage(
  suggestion: ProgressionSuggestion,
  repsAtNextWeight = 0,
): [label: string, message: string] {
  switch (suggestion.type) {
    case 'StartTracking':
      return ['FIRST SESSION', `Target: any weight × ${suggestion.targetReps}`]

    case 'OverloadReady':
      return [
        'NEW TARGET',
        withLighterSessionNote(
          formatTargetInstruction(suggestion.targetReps, suggestion.nextWeight),
          suggestion.lighterSessionSkipped,
        ),
      ]

    case 'GoalReached': {
      const cleared = formatMilestoneCleared(suggestion.weight, suggestion.targetReps, suggestion.nextWeight)
      const remaining = suggestion.targetReps - repsAtNextWeight
      return ['GOAL REACHED', repsAtNextWeight > 0 && remaining > 0 ? `${cleared} (${remaining} remaining)` : cleared]
    }

    case 'BuildVolume': {
      const r = suggestion.reason
      let message: string
      switch (r.type) {
        case 'Overshoot':
          message = `Heavier weight kept · ${formatTargetInstruction(r.targetReps, r.nextWeight)}`
          break
        case 'RepsRemaining':
          message =
            `Best: ${formatSetCompact(r.weight, r.targetReps - r.repsLeft)} · ` +
            `Target: ${formatReps(r.targetReps)} (${r.repsLeft} remaining)`
          break
        case 'ShortOnReps':
          message = `${formatReps(r.repsShort)} short of last session · ${formatTargetInstruction(r.targetReps, r.nextWeight)}`
          break
        case 'StandardTarget':
          message = formatTargetInstruction(r.targetReps, r.nextWeight)
          break
      }
      return ['SAME TARGET', withLighterSessionNote(message, suggestion.lighterSessionSkipped)]
    }

    case 'SingleMetric': {
      const r = suggestion.reason
      switch (r.type) {
        case 'FirstSession':
          return ['FIRST SESSION', 'Target: as many as you can']
        case 'Target':
          return [r.held ? 'SAME TARGET' : 'NEW TARGET', `Best: ${formatReps(r.lastBest)} · Target: ${formatReps(r.target)}`]
        case 'Remaining':
          return ['SAME TARGET', `Target: ${formatReps(r.target)} (${r.repsLeft} remaining)`]
        case 'GoalReached':
          return ['GOAL REACHED', `Cleared ${formatReps(r.cleared)} · Next ${formatReps(r.nextTarget)}`]
        case 'AtCeiling':
          return ['AT CEILING', `Target stays at ${formatReps(r.ceiling)}`]
      }
    }
  }
}
