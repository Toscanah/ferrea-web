import type { Category, Exercise, ExerciseSet } from '../domain/model/types'
import { getDb } from './db'
import { emitDataChanged } from './events'

export async function listExercises(): Promise<Exercise[]> {
  const db = await getDb()
  const all = await db.getAll('exercises')
  return all.filter((e) => !e.isArchived).sort((a, b) => a.name.localeCompare(b.name))
}

/** Every exercise, archived ones too: History must still name them. */
export async function allExercises(): Promise<Exercise[]> {
  return (await getDb()).getAll('exercises')
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  return (await getDb()).get('exercises', id)
}

/** A new exercise: the given target reps, 2.5kg steps and three planned sets. */
export async function addExercise(
  name: string,
  category: Category,
  usesWeight: boolean,
  targetReps = 10,
): Promise<Exercise> {
  const exercise: Exercise = {
    id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    category,
    equipment: usesWeight ? 'OTHER' : 'BODYWEIGHT',
    preferredTargetReps: targetReps,
    weightStepKg: 2.5,
    weightStepLb: 5,
    stepTiersKg: null,
    stepTiersLb: null,
    progressionMode: usesWeight ? 'WEIGHT_REPS' : 'REPS_ONLY',
    repsCeiling: usesWeight ? null : 20,
    durationCeilingSeconds: null,
    plannedSets: 3,
    isUserEdited: true,
    isArchived: false,
  }
  await (await getDb()).put('exercises', exercise)
  emitDataChanged()
  return exercise
}

export async function setsForExercise(exerciseId: string): Promise<ExerciseSet[]> {
  return (await getDb()).getAllFromIndex('sets', 'byExercise', exerciseId)
}

/** Sets with a timestamp from start (inclusive) to end (exclusive), oldest first. */
export async function setsInRange(start: number, end: number): Promise<ExerciseSet[]> {
  const db = await getDb()
  const range = IDBKeyRange.bound(start, end, false, true)
  return db.getAllFromIndex('sets', 'byTime', range)
}

export async function allSets(): Promise<ExerciseSet[]> {
  return (await getDb()).getAll('sets')
}

export async function addSet(set: Omit<ExerciseSet, 'id'>): Promise<ExerciseSet> {
  const db = await getDb()
  const id = (await db.add('sets', set as ExerciseSet)) as number
  emitDataChanged()
  return { ...set, id }
}

export async function updateSet(set: ExerciseSet): Promise<void> {
  await (await getDb()).put('sets', { ...set, updatedAt: Date.now() })
  emitDataChanged()
}

export async function deleteSets(ids: number[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('sets', 'readwrite')
  for (const id of ids) await tx.store.delete(id)
  await tx.done
  emitDataChanged()
}

/** Puts sets back exactly as they were (undo of a delete): same ids, same fields. */
export async function restoreSets(sets: ExerciseSet[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('sets', 'readwrite')
  for (const set of sets) await tx.store.put(set)
  await tx.done
  emitDataChanged()
}

/** Restores a backup: exercises are added or updated, and every set is replaced. One transaction. */
export async function replaceAll(exercises: Exercise[], sets: Omit<ExerciseSet, 'id'>[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['exercises', 'sets'], 'readwrite')
  for (const exercise of exercises) await tx.objectStore('exercises').put(exercise)
  await tx.objectStore('sets').clear()
  for (const set of sets) await tx.objectStore('sets').add(set as ExerciseSet)
  await tx.done
  emitDataChanged()
}

/** Asks the browser not to clear this app's data when space runs low. Safe to call every launch. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    // Not available: the export button is the safety net.
  }
  return false
}
