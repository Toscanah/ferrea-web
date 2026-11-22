export type ProgressionCategory = 'READY_TO_OVERLOAD' | 'GOAL_REACHED' | 'BUILD_VOLUME' | 'OTHER'

export type Category = 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE' | 'OTHER'
export type Equipment =
  | 'MACHINE' | 'SMITH_MACHINE' | 'DUMBBELL' | 'BARBELL' | 'EZ_BAR' | 'KETTLEBELL'
  | 'CABLE' | 'RESISTANCE_BAND' | 'BODYWEIGHT' | 'OTHER'
export type ProgressionMode = 'WEIGHT_REPS' | 'REPS_ONLY' | 'TIMED'

export interface Exercise {
  id: string
  name: string
  category: Category
  equipment: Equipment
  preferredTargetReps: number
  weightStepKg: number
  weightStepLb: number
  stepTiersKg?: { from: number; step: number }[] | null
  stepTiersLb?: { from: number; step: number }[] | null
  progressionMode: ProgressionMode
  repsCeiling?: number | null
  durationCeilingSeconds?: number | null
  plannedSets?: number | null
  isUserEdited: boolean
  isArchived: boolean
}

/** What the engines read from a set: weights are in kg, warm-ups are removed before the engines. */
export interface EngineSet {
  timestamp: number
  weight: number
  reps: number
}

export interface ExerciseSet extends EngineSet {
  id: number
  exerciseId: string
  note: string
  isWarmup: boolean
  targetRepsAtLog?: number | null
  stepKgAtLog?: number | null
  stepLbAtLog?: number | null
  plannedSetsAtLog?: number | null
  createdAt: number
  updatedAt: number
  durationSeconds?: number | null
}

export interface TargetOption {
  weight: number
  reps: number
}

export type MetricReason =
  | { type: 'FirstSession' }
  | { type: 'Target'; target: number; lastBest: number; held: boolean }
  | { type: 'Remaining'; target: number; repsLeft: number }
  | { type: 'GoalReached'; cleared: number; nextTarget: number }
  | { type: 'AtCeiling'; ceiling: number }

export type VolumeReason =
  | { type: 'Overshoot'; targetReps: number; nextWeight: number }
  | { type: 'RepsRemaining'; repsLeft: number; targetReps: number; weight: number }
  | { type: 'ShortOnReps'; repsShort: number; targetReps: number; nextWeight: number }
  | { type: 'StandardTarget'; targetReps: number; nextWeight: number }

export type ProgressionSuggestion =
  | { type: 'StartTracking'; targetReps: number }
  | { type: 'OverloadReady'; targetReps: number; nextWeight: number; lighterSessionSkipped: boolean }
  | { type: 'GoalReached'; nextWeight: number; targetReps: number; weight: number }
  | { type: 'BuildVolume'; reason: VolumeReason; lighterSessionSkipped: boolean }
  | { type: 'SingleMetric'; unit: 'REPS'; reason: MetricReason }

/** The part of the Android ProgressionState the web app uses. */
export interface ProgressionState {
  category: ProgressionCategory
  latestWeight: number
  latestReps: number
  previousWeight: number
  previousReps: number
  previousSessionSetCount: number
  nextWeight: number
  backOff: TargetOption | null
  progressionSuggestion: ProgressionSuggestion
  repsAtNextWeight: number
  daysCount: number
  targetMatrix: TargetOption[]
  staleSessionsCount: number
  setsToday: number
  sessionLastWeight: number
  sessionLastReps: number
  lighterSession: TargetOption | null
}
