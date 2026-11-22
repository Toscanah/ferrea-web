import { t, tn } from '../i18n/strings'
import type { ProgressionSuggestion } from '../model/types'
import {
  formatMilestoneCleared,
  formatReps,
  formatSetCompact,
  formatTargetInstruction,
} from '../formatter/formatter'

export const lighterSessionNote = (): string => t('lighterNote')

const withLighterSessionNote = (message: string, skipped: boolean): string =>
  skipped ? `${message} · ${lighterSessionNote()}` : message

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
      return [t('firstSession'), t('targetAnyWeight', { n: suggestion.targetReps })]

    case 'OverloadReady':
      return [
        t('newTarget'),
        withLighterSessionNote(
          formatTargetInstruction(suggestion.targetReps, suggestion.nextWeight),
          suggestion.lighterSessionSkipped,
        ),
      ]

    case 'GoalReached': {
      const cleared = formatMilestoneCleared(suggestion.weight, suggestion.targetReps, suggestion.nextWeight)
      const remaining = suggestion.targetReps - repsAtNextWeight
      return [t('goalReached'), repsAtNextWeight > 0 && remaining > 0 ? `${cleared} (${tn('remaining', remaining)})` : cleared]
    }

    case 'BuildVolume': {
      const r = suggestion.reason
      let message: string
      switch (r.type) {
        case 'Overshoot':
          message = `${t('heavierKept')} · ${formatTargetInstruction(r.targetReps, r.nextWeight)}`
          break
        case 'RepsRemaining':
          message =
            `${t('best')}: ${formatSetCompact(r.weight, r.targetReps - r.repsLeft)} · ` +
            `${t('target')}: ${formatReps(r.targetReps)} (${tn('remaining', r.repsLeft)})`
          break
        case 'ShortOnReps':
          message = `${t('shortOfLast', { reps: formatReps(r.repsShort) })} · ${formatTargetInstruction(r.targetReps, r.nextWeight)}`
          break
        case 'StandardTarget':
          message = formatTargetInstruction(r.targetReps, r.nextWeight)
          break
      }
      return [t('sameTarget'), withLighterSessionNote(message, suggestion.lighterSessionSkipped)]
    }

    case 'SingleMetric': {
      const r = suggestion.reason
      switch (r.type) {
        case 'FirstSession':
          return [t('firstSession'), t('targetAsMany')]
        case 'Target':
          return [r.held ? t('sameTarget') : t('newTarget'), `${t('best')}: ${formatReps(r.lastBest)} · ${t('target')}: ${formatReps(r.target)}`]
        case 'Remaining':
          return [t('sameTarget'), `${t('target')}: ${formatReps(r.target)} (${tn('remaining', r.repsLeft)})`]
        case 'GoalReached':
          return [t('goalReached'), `${t('cleared')} ${formatReps(r.cleared)} · ${t('next')} ${formatReps(r.nextTarget)}`]
        case 'AtCeiling':
          return [t('atCeiling'), t('targetStays', { reps: formatReps(r.ceiling) })]
      }
    }
  }
}
