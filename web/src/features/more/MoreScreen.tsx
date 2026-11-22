import { useRef, useState } from 'preact/hooks'
import { allExercises, allSets, replaceAll } from '../../data/repository'
import { backupFileName, buildBackup, parseBackup } from '../../data/backup'
import { count, t } from '../../domain/i18n/strings'
import { showToast } from '../../ui/toast'

/** Backup: export and import are the only way to keep or move the data, so they are the whole screen. */
export function MoreScreen() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const exportData = async () => {
    setBusy(true)
    try {
      const [exercises, sets] = await Promise.all([allExercises(), allSets()])
      const now = Date.now()
      const text = JSON.stringify(buildBackup(exercises, sets, now), null, 2)
      const name = backupFileName(new Date(now))
      const file = new File([text], name, { type: 'application/json' })

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Ferrea backup' })
        } catch (error) {
          if ((error as DOMException)?.name === 'AbortError') return // the share sheet was closed
          throw error
        }
      } else {
        const url = URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = name
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      showToast(t('backupCompleted'))
    } catch {
      showToast(t('exportError'))
    } finally {
      setBusy(false)
    }
  }

  const importData = async (file: File) => {
    setBusy(true)
    try {
      const known = new Set((await allExercises()).map((e) => e.id))
      const result = parseBackup(await file.text(), known)
      if (!result.ok) {
        showToast(
          result.reason === 'tooNew'
            ? t('importTooNew')
            : result.reason === 'noExercises'
              ? t('importNoExercises')
              : t('importInvalid'),
        )
        return
      }
      const ok = window.confirm(
        t('confirmReplace', { sets: count(result.sets.length, 'set') }),
      )
      if (!ok) return
      await replaceAll(result.exercises, result.sets)
      showToast(
        result.skippedSets > 0
          ? t('importCompletedSkipped', { sets: count(result.sets.length, 'set'), skipped: result.skippedSets })
          : t('importCompleted', { sets: count(result.sets.length, 'set') }),
      )
    } catch {
      showToast(t('importInvalid'))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div class="screen">
      <h1 class="title">{t('backup')}</h1>

      <p class="sub">
        {t('backupIntro')}
      </p>

      <h2 class="section-title">{t('yourData')}</h2>
      <div class="stack">
        <button class="setting" disabled={busy} onClick={() => void exportData()}>
          <span class="setting-title">{t('exportData')}</span>
          <span class="setting-desc">{t('exportDesc')}</span>
        </button>
        <button class="setting" disabled={busy} onClick={() => fileInput.current?.click()}>
          <span class="setting-title">{t('importData')}</span>
          <span class="setting-desc">{t('importDesc')}</span>
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = (e.currentTarget as HTMLInputElement).files?.[0]
          if (file) void importData(file)
        }}
      />
    </div>
  )
}
