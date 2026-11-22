import type { Exercise, ProgressionState, TargetOption } from '../model/types'
import {
  formatFirstSessionPlaceholder,
  formatLastSessionHeader,
  formatReps,
  formatSetCompact,
} from '../formatter/formatter'
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
    case 'CALIBRATION': return 'TARGET'
    case 'IN_PROGRESS_NOT_REACHED': return targetAheadOfToday ? 'NEXT' : 'TARGET'
    case 'IN_PROGRESS_REACHED': return 'NEXT'
    default: return 'NEXT SESSION'
  }
}

const captionFor = (state: DashboardState, targetAheadOfToday: boolean, lighterSessionSkipped: boolean): string | null => {
  switch (state) {
    case 'CALIBRATION': return lighterSessionSkipped ? 'Last session was lighter, so the target stays.' : null
    case 'IN_PROGRESS_NOT_REACHED': return targetAheadOfToday ? "Lighter sets don't change your target." : null
    case 'IN_PROGRESS_REACHED': return 'Target cleared. Advance, repeat, or back-off.'
    case 'DONE_NOT_REACHED': return 'Same target next session.'
    case 'DONE_REACHED': return 'Target cleared. Next session moves up.'
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
      headerLeft: 'FIRST SESSION',
      headerRight: 'NEW EXERCISE',
      targetValue: isRepsOnly ? 'As many as you can' : formatFirstSessionPlaceholder(targetReps),
      hint: isRepsOnly ? 'Your best set today sets the target.' : 'Your heaviest set today sets the target.',
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
  if (isUserDone && hasGoalDetails) headerLeft = 'SESSION DONE · GOAL REACHED'
  else if (goalReached && weightGoal) headerLeft = `GOAL REACHED · ${formatSetCompact(weightGoal.weight, weightGoal.targetReps)}`
  else if (goalReached && repsGoal) headerLeft = `GOAL REACHED · ${formatReps(repsGoal.cleared)}`
  else if (isUserDone) headerLeft = 'SESSION DONE'
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
            { label: 'LIGHTER', value: option(matrix[0]), primary: false },
            centerColumn,
            { label: 'HEAVIER', value: option(matrix[2]), primary: false },
          ]
        : [
            ...(state.backOff ? [{ label: 'BACK-OFF', value: option(state.backOff), primary: false }] : []),
            centerColumn,
          ]
    body = { kind: 'matrix', caption: captionFor(dashboard, targetAheadOfToday, lighterSkipped), columns }
  } else if (goalReached && repsGoal) {
    body = {
      kind: 'repsGoal',
      message: isUserDone ? 'Progression unlocked for next session.' : 'Target cleared. Advance, repeat, or back-off.',
      chipLabel: isUserDone ? 'NEXT SESSION' : 'NEXT',
      value: formatReps(repsGoal.nextTarget),
    }
  } else if (suggestion.type === 'SingleMetric' && suggestion.reason.type !== 'FirstSession') {
    const r = suggestion.reason
    if (r.type === 'Target') body = { kind: 'repsTarget', target: formatReps(r.target), caption: `Last session best: ${formatReps(r.lastBest)}.` }
    else if (r.type === 'Remaining') body = { kind: 'repsTarget', target: formatReps(r.target), caption: `${formatReps(r.repsLeft)} to go.` }
    else if (r.type === 'AtCeiling') body = { kind: 'repsTarget', target: formatReps(r.ceiling), caption: 'The target stays at the ceiling.' }
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
