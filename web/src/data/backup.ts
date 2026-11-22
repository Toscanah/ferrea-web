import type { Category, Equipment, Exercise, ExerciseSet, ProgressionMode } from '../domain/model/types'

// The backup file is the same JSON the Android app writes (kg, formatVersion, tolerant import), so a file
// from either app opens in the other.
export const BACKUP_FORMAT_VERSION = 2

interface StepTierDto { from: number; step: number }

interface ExerciseDto {
  id: string
  name: string
  category: string
  equipment: string
  preferredTargetReps: number
  weightStepKg: number
  weightStepLb: number
  stepTiersKg?: StepTierDto[] | null
  stepTiersLb?: StepTierDto[] | null
  progressionMode: string
  repsCeiling?: number | null
  durationCeilingSeconds?: number | null
  plannedSets?: number | null
  isUserEdited: boolean
  isArchived: boolean
}

interface SetDto {
  exerciseId: string
  reps: number
  weight: number
  note: string
  timestamp: number
  targetRepsAtLog?: number | null
  stepKgAtLog?: number | null
  stepLbAtLog?: number | null
  plannedSetsAtLog?: number | null
  isWarmup: boolean
  createdAt?: number | null
  updatedAt?: number | null
  durationSeconds?: number | null
}

export interface BackupFile {
  formatVersion: number
  weightUnit: 'kg'
  exportedAt: number
  exercises: ExerciseDto[]
  sets: SetDto[]
}

export function buildBackup(exercises: Exercise[], sets: ExerciseSet[], now: number): BackupFile {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    weightUnit: 'kg',
    exportedAt: now,
    exercises: exercises.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      equipment: e.equipment,
      preferredTargetReps: e.preferredTargetReps,
      weightStepKg: e.weightStepKg,
      weightStepLb: e.weightStepLb,
      stepTiersKg: e.stepTiersKg ?? null,
      stepTiersLb: e.stepTiersLb ?? null,
      progressionMode: e.progressionMode,
      repsCeiling: e.repsCeiling ?? null,
      durationCeilingSeconds: e.durationCeilingSeconds ?? null,
      plannedSets: e.plannedSets ?? null,
      isUserEdited: e.isUserEdited,
      isArchived: e.isArchived,
    })),
    sets: sets
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((s) => ({
        exerciseId: s.exerciseId,
        reps: s.reps,
        weight: s.weight,
        note: s.note,
        timestamp: s.timestamp,
        targetRepsAtLog: s.targetRepsAtLog ?? null,
        stepKgAtLog: s.stepKgAtLog ?? null,
        stepLbAtLog: s.stepLbAtLog ?? null,
        plannedSetsAtLog: s.plannedSetsAtLog ?? null,
        isWarmup: s.isWarmup,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        durationSeconds: s.durationSeconds ?? null,
      })),
  }
}

export type ParsedBackup =
  | { ok: true; exercises: Exercise[]; sets: Omit<ExerciseSet, 'id'>[]; skippedSets: number }
  | { ok: false; reason: 'invalid' | 'tooNew' | 'noExercises' }

const CATEGORIES: Category[] = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'OTHER']
const EQUIPMENT: Equipment[] = [
  'MACHINE', 'SMITH_MACHINE', 'DUMBBELL', 'BARBELL', 'EZ_BAR', 'KETTLEBELL', 'CABLE', 'RESISTANCE_BAND', 'BODYWEIGHT', 'OTHER',
]
const MODES: ProgressionMode[] = ['WEIGHT_REPS', 'REPS_ONLY', 'TIMED']

const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

const num = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
const optNum = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const tiers = (value: unknown): { from: number; step: number }[] | null =>
  Array.isArray(value) && value.length > 0
    ? value.map((t) => ({ from: num((t as StepTierDto).from, 0), step: num((t as StepTierDto).step, 0) }))
    : null

/**
 * Reads a backup tolerantly: missing keys use defaults, unknown keys are ignored, a newer format version is
 * refused. A bare list of sets (the oldest format) is accepted too, but needs exercises to exist already.
 */
export function parseBackup(text: string, knownExerciseIds: Set<string> = new Set()): ParsedBackup {
  let root: unknown
  try {
    root = JSON.parse(text.trim())
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  let rawExercises: unknown[] = []
  let rawSets: unknown[]
  if (Array.isArray(root)) {
    rawSets = root
  } else if (root !== null && typeof root === 'object') {
    const obj = root as Record<string, unknown>
    if (typeof obj.formatVersion === 'number' && obj.formatVersion > BACKUP_FORMAT_VERSION) {
      return { ok: false, reason: 'tooNew' }
    }
    rawExercises = Array.isArray(obj.exercises) ? obj.exercises : []
    rawSets = Array.isArray(obj.sets) ? obj.sets : []
  } else {
    return { ok: false, reason: 'invalid' }
  }

  const exercises: Exercise[] = []
  for (const raw of rawExercises) {
    const e = raw as Partial<ExerciseDto>
    if (!e || typeof e.id !== 'string' || e.id === '') continue
    exercises.push({
      id: e.id,
      name: typeof e.name === 'string' && e.name !== '' ? e.name : 'Imported exercise',
      category: pick(e.category, CATEGORIES, 'OTHER'),
      equipment: pick(e.equipment, EQUIPMENT, 'OTHER'),
      preferredTargetReps: num(e.preferredTargetReps, 8),
      weightStepKg: num(e.weightStepKg, 2.5),
      weightStepLb: num(e.weightStepLb, 5),
      stepTiersKg: tiers(e.stepTiersKg),
      stepTiersLb: tiers(e.stepTiersLb),
      progressionMode: pick(e.progressionMode, MODES, 'WEIGHT_REPS'),
      repsCeiling: optNum(e.repsCeiling),
      durationCeilingSeconds: optNum(e.durationCeilingSeconds),
      plannedSets: optNum(e.plannedSets),
      isUserEdited: e.isUserEdited !== false,
      isArchived: e.isArchived === true,
    })
  }

  const valid = new Set([...knownExerciseIds, ...exercises.map((e) => e.id)])
  if (valid.size === 0) return { ok: false, reason: 'noExercises' }

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const now = Date.now()
  const sets: Omit<ExerciseSet, 'id'>[] = []
  let skippedSets = 0
  for (const raw of rawSets) {
    const s = raw as Partial<SetDto>
    if (!s || typeof s.exerciseId !== 'string' || !valid.has(s.exerciseId)) {
      skippedSets++
      continue
    }
    const timestamp = num(s.timestamp, 0) > 0 ? num(s.timestamp, now) : now
    const exercise = byId.get(s.exerciseId)
    sets.push({
      exerciseId: s.exerciseId,
      reps: num(s.reps, 0),
      weight: num(s.weight, 0),
      note: typeof s.note === 'string' ? s.note : '',
      timestamp,
      targetRepsAtLog: optNum(s.targetRepsAtLog) ?? exercise?.preferredTargetReps ?? null,
      stepKgAtLog: optNum(s.stepKgAtLog) ?? exercise?.weightStepKg ?? null,
      stepLbAtLog: optNum(s.stepLbAtLog) ?? exercise?.weightStepLb ?? null,
      plannedSetsAtLog: optNum(s.plannedSetsAtLog),
      isWarmup: s.isWarmup === true,
      createdAt: optNum(s.createdAt) ?? timestamp,
      updatedAt: optNum(s.updatedAt) ?? timestamp,
      durationSeconds: optNum(s.durationSeconds),
    })
  }
  return { ok: true, exercises, sets, skippedSets }
}

export function backupFileName(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `ferrea_backup_${date.getFullYear()}_${pad(date.getMonth() + 1)}_${pad(date.getDate())}.json`
}
