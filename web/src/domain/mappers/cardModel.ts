import type { Exercise, ProgressionState, TargetOption } from '../model/types'
import {
  formatFirstSessionPlaceholder,
  formatLastSessionHeader,
  formatReps,
  formatSetCompact,
} from '../formatter/formatter'
import { t } from '../i18n/strings'
import { formatWeight } from '../progression/math'
import { toDisplayMessage } from './progressionText'

// The target card of the Log screen as plain data (port of the decisions in ExerciseSuggestion.kt and
// SuggestionMatrix.kt), so the screen only draws it.

export interface MatrixColumn {
  label: string
  value: string
  primary: boolean
}

export type CardBody =
  | { kind: 'matrix'; caption: string | null; columns: MatrixColumn[] }
  | { kind: 'repsGoal'; message: string; chipLabel: string; value: string }
  | { kind: 'repsTarget'; target: string; caption: string }
  | { kind: 'text'; text: string }

export type CardModel =
  | { kind: 'first'; headerLeft: string; headerRight: string; targetValue: string; hint: string }
  | { kind: 'tracked'; headerLeft: string; headerRight: string; goalReached: boolean; body: CardBody }

type DashboardState = 'CALIBRATION' | 'IN_PROGRESS_NOT_REACHED' | 'IN_PROGRESS_REACHED' | 'DONE_NOT_REACHED' | 'DONE_REACHED'

const centerLabel = (state: DashboardState, targetAheadOfToday: boolean): string => {
  switch (state) {
    case 'CALIBRATION': return t('tag_target')
    case 'IN_PROGRESS_NOT_REACHED': return targetAheadOfToday ? t('tag_next') : t('tag_target')
    case 'IN_PROGRESS_REACHED': return t('tag_next')
    default: return t('tag_nextSession')
  }
}

const captionFor = (state: DashboardState, targetAheadOfToday: boolean, lighterSessionSkipped: boolean): string | null => {
  switch (state) {
    case 'CALIBRATION': return lighterSessionSkipped ? t('lighterSkipped') : null
    case 'IN_PROGRESS_NOT_REACHED': return targetAheadOfToday ? t('lighterSetsNoChange') : null
    case 'IN_PROGRESS_REACHED': return t('clearedAdvance')
    case 'DONE_NOT_REACHED': return t('sameNextSession')
    case 'DONE_REACHED': return t('clearedNextSession')
  }
}

const option = (o: TargetOption): string => formatSetCompact(o.weight, o.reps)

/** Three options for the LIGHTER | TARGET | HEAVIER row, or null when there is no matrix to show. */
function displayMatrixOf(matrix: TargetOption[], isRepsOnly: boolean): TargetOption[] | null {
  if (isRepsOnly || matrix.length === 0) return null
  if (matrix.length >= 3) return [matrix[0], matrix[Math.trunc(matrix.length / 2)], matrix[matrix.length - 1]]
  return [matrix[0], matrix[0], matrix[matrix.length - 1]]
}

export function buildCardModel(exercise: Exercise, state: ProgressionState): CardModel {
  const suggestion = state.progressionSuggestion
  const isRepsOnly = suggestion.type === 'SingleMetric'

  if (state.daysCount === 0) {
    const targetReps = suggestion.type === 'StartTracking' ? suggestion.targetReps : exercise.preferredTargetReps
    return {
      kind: 'first',
      headerLeft: t('firstSession'),
      headerRight: t('newExercise'),
      targetValue: isRepsOnly ? t('asManyAsYouCan') : formatFirstSessionPlaceholder(targetReps),
      hint: isRepsOnly ? t('bestSetDecides') : t('heaviestSetDecides'),
    }
  }

  const goalReached = state.category === 'GOAL_REACHED'
  const planned = exercise.plannedSets ?? null
  const isUserDone = planned !== null && planned > 0 && state.setsToday >= planned
  const [statusText, statusMessage] = toDisplayMessage(suggestion, state.repsAtNextWeight)

  const weightGoal = suggestion.type === 'GoalReached' ? suggestion : null
  const repsGoal = suggestion.type === 'SingleMetric' && suggestion.reason.type === 'GoalReached' ? suggestion.reason : null
  const hasGoalDetails = goalReached && (weightGoal !== null || repsGoal !== null)

  let headerLeft: string
  if (isUserDone && hasGoalDetails) headerLeft = t('sessionDoneGoal')
  else if (goalReached && weightGoal) headerLeft = `${t('goalReached')} · ${formatSetCompact(weightGoal.weight, weightGoal.targetReps)}`
  else if (goalReached && repsGoal) headerLeft = `${t('goalReached')} · ${formatReps(repsGoal.cleared)}`
  else if (isUserDone) headerLeft = t('sessionDone')
  else headerLeft = statusText

  const headerRight = formatLastSessionHeader(
    state.previousSessionSetCount > 0 || state.previousReps > 0,
    state.lighterSession?.weight ?? state.previousWeight,
    state.lighterSession?.reps ?? state.previousReps,
    isRepsOnly,
  )

  const matrix = displayMatrixOf(state.targetMatrix, isRepsOnly)
  let body: CardBody
  if (matrix) {
    const isPostSet = state.setsToday >= 1
    const dashboard: DashboardState =
      !isPostSet ? 'CALIBRATION'
      : isUserDone && goalReached ? 'DONE_REACHED'
      : isUserDone ? 'DONE_NOT_REACHED'
      : goalReached ? 'IN_PROGRESS_REACHED'
      : 'IN_PROGRESS_NOT_REACHED'
    const center = matrix[1] ?? matrix[0]
    const targetAheadOfToday = center.weight - state.latestWeight > 0.001
    const lighterSkipped = state.lighterSession !== null
    const centerColumn: MatrixColumn = { label: centerLabel(dashboard, targetAheadOfToday), value: option(center), primary: true }
    const columns: MatrixColumn[] =
      dashboard === 'CALIBRATION'
        ? [
            { label: t('tag_lighter'), value: option(matrix[0]), primary: false },
            centerColumn,
            { label: t('tag_heavier'), value: option(matrix[2]), primary: false },
          ]
        : [
            ...(state.backOff ? [{ label: t('tag_backOff'), value: option(state.backOff), primary: false }] : []),
            centerColumn,
          ]
    body = { kind: 'matrix', caption: captionFor(dashboard, targetAheadOfToday, lighterSkipped), columns }
  } else if (goalReached && repsGoal) {
    body = {
      kind: 'repsGoal',
      message: isUserDone ? t('unlocked') : t('clearedAdvance'),
      chipLabel: isUserDone ? t('tag_nextSession') : t('tag_next'),
      value: formatReps(repsGoal.nextTarget),
    }
  } else if (suggestion.type === 'SingleMetric' && suggestion.reason.type !== 'FirstSession') {
    const r = suggestion.reason
    if (r.type === 'Target') body = { kind: 'repsTarget', target: formatReps(r.target), caption: t('lastBestCaption', { reps: formatReps(r.lastBest) }) }
    else if (r.type === 'Remaining') body = { kind: 'repsTarget', target: formatReps(r.target), caption: t('repsToGo', { reps: formatReps(r.repsLeft) }) }
    else if (r.type === 'AtCeiling') body = { kind: 'repsTarget', target: formatReps(r.ceiling), caption: t('ceilingStays') }
    else body = { kind: 'text', text: statusMessage }
  } else {
    body = { kind: 'text', text: statusMessage }
  }

  return { kind: 'tracked', headerLeft, headerRight, goalReached, body }
}

/** What to put in the weight and reps fields before the first tap: the session's last set, else last session's. */
export function prefillFor(state: ProgressionState): { reps: string; weight: string } {
  const hasSessionSet = state.sessionLastReps > 0
  const reps = hasSessionSet ? state.sessionLastReps : state.previousReps
  const weight = hasSessionSet ? state.sessionLastWeight : state.previousWeight
  return { reps: reps > 0 ? String(reps) : '', weight: weight > 0 ? formatWeight(weight) : '' }
}
