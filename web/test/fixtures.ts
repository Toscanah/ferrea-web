import type { Exercise } from '../src/domain/model/types'

// Two exercises the tests use, kept here so they do not depend on the bundled list (which is only the user's schedule).
const base: Exercise = {
  id: '',
  name: '',
  category: 'CHEST',
  equipment: 'BARBELL',
  preferredTargetReps: 8,
  weightStepKg: 2.5,
  weightStepLb: 5,
  stepTiersKg: null,
  stepTiersLb: null,
  progressionMode: 'WEIGHT_REPS',
  repsCeiling: null,
  durationCeilingSeconds: null,
  plannedSets: 3,
  isUserEdited: false,
  isArchived: false,
}

export const bench: Exercise = { ...base, id: '32', name: 'Barbell Bench Press' }
export const pushUp: Exercise = {
  ...base,
  id: '45',
  name: 'Bodyweight Push-Up',
  equipment: 'BODYWEIGHT',
  preferredTargetReps: 10,
  weightStepKg: 0,
  weightStepLb: 0,
  progressionMode: 'REPS_ONLY',
  repsCeiling: 20,
}
