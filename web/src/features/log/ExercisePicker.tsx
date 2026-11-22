import { useMemo, useState } from 'preact/hooks'
import type { Category, Exercise } from '../../domain/model/types'
import { matchesSearch } from '../../domain/search/exerciseSearch'
import { addExercise } from '../../data/repository'
import { Sheet } from '../../ui/sheet'

const CATEGORY_ORDER: Category[] = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'OTHER']
const label = (c: Category): string => c.charAt(0) + c.slice(1).toLowerCase()

function subtitle(e: Exercise): string {
  if (e.progressionMode === 'REPS_ONLY') return 'Reps only'
  const equipment = e.equipment === 'EZ_BAR' ? 'EZ bar' : label(e.equipment.replace('_', ' ') as Category)
  return `${equipment} · ${e.preferredTargetReps} reps`
}

/** Pick an exercise from the list, or add one. Search forgives typos and extra spaces. */
export function ExercisePicker(props: { exercises: Exercise[]; onPick: (exercise: Exercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const groups = useMemo(() => {
    const matching = props.exercises.filter((e) => e.progressionMode !== 'TIMED' && matchesSearch(e.name, query))
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: matching.filter((e) => e.category === category),
    })).filter((g) => g.items.length > 0)
  }, [props.exercises, query])

  if (adding) {
    return <AddExerciseSheet initialName={query.trim()} onPick={props.onPick} onClose={() => setAdding(false)} />
  }

  return (
    <Sheet title="Select an exercise" onClose={props.onClose}>
      <input
        class="search"
        type="search"
        placeholder="Search exercises"
        value={query}
        onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
      />
      {groups.length === 0 ? (
        <div class="empty">
          <strong>No exercises found</strong>
          <p>Try adjusting your search query.</p>
        </div>
      ) : null}
      {groups.map((g) => (
        <div key={g.category}>
          <h3 class="group-title">{label(g.category)}</h3>
          <div class="list">
            {g.items.map((e) => (
              <button class="row" key={e.id} onClick={() => props.onPick(e)}>
                <span class="row-main">{e.name}</span>
                <span class="row-sub">{subtitle(e)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button class="secondary-button" onClick={() => setAdding(true)}>
        Add exercise
      </button>
    </Sheet>
  )
}

function AddExerciseSheet(props: { initialName: string; onPick: (exercise: Exercise) => void; onClose: () => void }) {
  const [name, setName] = useState(props.initialName)
  const [category, setCategory] = useState<Category>('OTHER')
  const [usesWeight, setUsesWeight] = useState(true)
  const [targetReps, setTargetReps] = useState('10')
  const [error, setError] = useState('')

  const save = async () => {
    const reps = Number.parseInt(targetReps, 10)
    if (name.trim() === '') {
      setError('Enter a name')
      return
    }
    if (!Number.isFinite(reps) || reps < 1) {
      setError('Enter the target reps')
      return
    }
    props.onPick(await addExercise(name, category, usesWeight, reps))
  }

  return (
    <Sheet title="Add exercise" onClose={props.onClose}>
      <label class="field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onInput={(e) => {
            setName((e.currentTarget as HTMLInputElement).value)
            setError('')
          }}
        />
      </label>
      <div class="segmented" role="group" aria-label="Progression">
        <button class={usesWeight ? 'on' : ''} onClick={() => setUsesWeight(true)}>
          Weight &amp; reps
        </button>
        <button class={usesWeight ? '' : 'on'} onClick={() => setUsesWeight(false)}>
          Reps only
        </button>
      </div>
      <label class="field">
        <span>Category</span>
        <select value={category} onChange={(e) => setCategory((e.currentTarget as HTMLSelectElement).value as Category)}>
          {CATEGORY_ORDER.map((c) => (
            <option value={c} key={c}>
              {label(c)}
            </option>
          ))}
        </select>
      </label>
      <label class="field">
        <span>Target reps</span>
        <input
          type="text"
          inputMode="numeric"
          value={targetReps}
          onInput={(e) => {
            setTargetReps((e.currentTarget as HTMLInputElement).value.replace(/\D/g, ''))
            setError('')
          }}
        />
      </label>
      {error ? <p class="error">{error}</p> : null}
      <button class="primary-button" onClick={() => void save()}>
        Save
      </button>
    </Sheet>
  )
}
