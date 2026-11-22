import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Exercise, ExerciseSet } from '../domain/model/types'
import defaults from './defaultExercises.json'

interface FerreaDB extends DBSchema {
  exercises: { key: string; value: Exercise }
  sets: { key: number; value: ExerciseSet; indexes: { byExercise: string; byTime: number } }
  meta: { key: string; value: unknown }
}

const SEED_VERSION = 1

let dbPromise: Promise<IDBPDatabase<FerreaDB>> | null = null

interface DefaultExercise {
  id: string
  name: string
  preferredTargetReps: number
  plannedSets?: number
  weightStepKg: number
  weightStepLb: number
  category: Exercise['category']
  equipment: Exercise['equipment']
  progressionMode?: Exercise['progressionMode']
  repsCeiling?: number
}

export function defaultExercises(): Exercise[] {
  return (defaults as DefaultExercise[]).map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    equipment: d.equipment,
    preferredTargetReps: d.preferredTargetReps,
    weightStepKg: d.weightStepKg,
    weightStepLb: d.weightStepLb,
    stepTiersKg: null,
    stepTiersLb: null,
    progressionMode: d.progressionMode ?? 'WEIGHT_REPS',
    repsCeiling: d.repsCeiling ?? null,
    durationCeilingSeconds: null,
    plannedSets: d.plannedSets ?? null,
    isUserEdited: false,
    isArchived: false,
  }))
}

/** Opens the database, creating it and adding the bundled exercises on first use. */
export function getDb(): Promise<IDBPDatabase<FerreaDB>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDB<FerreaDB>('ferrea', 1, {
        upgrade(database) {
          database.createObjectStore('exercises', { keyPath: 'id' })
          const sets = database.createObjectStore('sets', { keyPath: 'id', autoIncrement: true })
          sets.createIndex('byExercise', 'exerciseId')
          sets.createIndex('byTime', 'timestamp')
          database.createObjectStore('meta')
        },
      })
      await seedIfNeeded(db)
      return db
    })()
  }
  return dbPromise
}

/** Inserts bundled exercises that are missing; never overwrites an existing one (user edits stay). */
async function seedIfNeeded(db: IDBPDatabase<FerreaDB>): Promise<void> {
  const seeded = await db.get('meta', 'seedVersion')
  if (seeded === SEED_VERSION) return
  const tx = db.transaction(['exercises', 'meta'], 'readwrite')
  for (const exercise of defaultExercises()) {
    if (!(await tx.objectStore('exercises').get(exercise.id))) await tx.objectStore('exercises').put(exercise)
  }
  await tx.objectStore('meta').put(SEED_VERSION, 'seedVersion')
  await tx.done
}

/** Test helper: close the open connection and forget it, so a fresh database can be opened. */
export async function resetDbForTests(): Promise<void> {
  const open = dbPromise
  dbPromise = null
  if (open) (await open).close()
}
