import { useMemo, useState } from 'preact/hooks'
import { count, t, type StringKey } from '../../domain/i18n/strings'
import type { Category, Exercise } from '../../domain/model/types'
import { matchesSearch } from '../../domain/search/exerciseSearch'
import { addExercise } from '../../data/repository'
import { Sheet } from '../../ui/sheet'

const CATEGORY_ORDER: Category[] = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'OTHER']
const label = (c: Category): string => t(`cat_${c}` as StringKey)

function subtitle(e: Exercise): string {
  if (e.progressionMode === 'REPS_ONLY') return t('repsOnly')
  return `${t(`eq_${e.equipment}` as StringKey)} · ${count(e.preferredTargetReps, 'rep')}`
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
    <Sheet title={t('selectExercise')} onClose={props.onClose}>
      <input
        class="search"
        type="search"
        placeholder={t('searchExercises')}
        value={query}
        onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
      />
      {groups.length === 0 ? (
        <div class="empty">
          <strong>{t('noExercisesFound')}</strong>
          <p>{t('adjustSearch')}</p>
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
        {t('addExercise')}
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
      setError(t('enterName'))
      return
    }
    if (!Number.isFinite(reps) || reps < 1) {
      setError(t('enterTargetReps'))
      return
    }
    props.onPick(await addExercise(name, category, usesWeight, reps))
  }

  return (
    <Sheet title={t('addExercise')} onClose={props.onClose}>
      <label class="field">
        <span>{t('name')}</span>
        <input
          type="text"
          value={name}
          onInput={(e) => {
            setName((e.currentTarget as HTMLInputElement).value)
            setError('')
          }}
        />
      </label>
      <div class="segmented" role="group" aria-label={t('weightAndReps')}>
        <button class={usesWeight ? 'on' : ''} onClick={() => setUsesWeight(true)}>
          {t('weightAndReps')}
        </button>
        <button class={usesWeight ? '' : 'on'} onClick={() => setUsesWeight(false)}>
          {t('repsOnly')}
        </button>
      </div>
      <label class="field">
        <span>{t('category')}</span>
        <select value={category} onChange={(e) => setCategory((e.currentTarget as HTMLSelectElement).value as Category)}>
          {CATEGORY_ORDER.map((c) => (
            <option value={c} key={c}>
              {label(c)}
            </option>
          ))}
        </select>
      </label>
      <label class="field">
        <span>{t('targetReps')}</span>
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
        {t('save')}
      </button>
    </Sheet>
  )
}
