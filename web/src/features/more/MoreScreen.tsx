import { useRef, useState } from 'preact/hooks'
import { allExercises, allSets, replaceAll } from '../../data/repository'
import { backupFileName, buildBackup, parseBackup } from '../../data/backup'
import { formatCount } from '../../domain/formatter/formatter'
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
      showToast('Backup completed')
    } catch {
      showToast('Export error')
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
            ? 'This backup was created by a newer version of Ferrea'
            : result.reason === 'noExercises'
              ? 'Import error: no exercises found'
              : 'Import error: invalid format',
        )
        return
      }
      const ok = window.confirm(
        `Replace all logged sets with the ${formatCount(result.sets.length, 'set')} in this file?`,
      )
      if (!ok) return
      await replaceAll(result.exercises, result.sets)
      showToast(
        result.skippedSets > 0
          ? `Import completed: ${formatCount(result.sets.length, 'set')}, ${result.skippedSets} skipped`
          : `Import completed: ${formatCount(result.sets.length, 'set')}`,
      )
    } catch {
      showToast('Import error: invalid format')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div class="screen">
      <h1 class="title">Backup</h1>

      <p class="sub">
        Backup files hold your exercises and sets. Weights are saved in kg. Sets are stored on this device only, and
        removing the app from the home screen deletes them.
      </p>

      <h2 class="section-title">Your data</h2>
      <div class="stack">
        <button class="setting" disabled={busy} onClick={() => void exportData()}>
          <span class="setting-title">Export data</span>
          <span class="setting-desc">Saves a backup file to your device.</span>
        </button>
        <button class="setting" disabled={busy} onClick={() => fileInput.current?.click()}>
          <span class="setting-title">Import data</span>
          <span class="setting-desc">Replaces all logged sets with the ones in the file.</span>
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
