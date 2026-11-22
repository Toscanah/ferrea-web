import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { HistoryScreen } from './features/history/HistoryScreen'
import { LogScreen } from './features/log/LogScreen'
import { MoreScreen } from './features/more/MoreScreen'
import { ToastHost } from './ui/toast'

type Tab = 'log' | 'history' | 'more'

const ICONS: Record<Tab, JSX.Element> = {
  log: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v12M5 14l3 3 3-3M16 19V7M13 10l3-3 3 3" />
    </svg>
  ),
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'history', label: 'History' },
  { id: 'more', label: 'Backup' },
]

/** Three tabs. Every screen stays mounted, so switching never loses what was half typed. */
export function App() {
  const [tab, setTab] = useState<Tab>('log')
  return (
    <>
      <main>
        <div class={tab === 'log' ? 'pane' : 'pane hidden'}>
          <LogScreen />
        </div>
        <div class={tab === 'history' ? 'pane' : 'pane hidden'}>
          <HistoryScreen />
        </div>
        <div class={tab === 'more' ? 'pane' : 'pane hidden'}>
          <MoreScreen />
        </div>
      </main>
      <nav class="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button
            key={t.id}
            class={tab === t.id ? 'tab active' : 'tab'}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {ICONS[t.id]}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <ToastHost />
    </>
  )
}
