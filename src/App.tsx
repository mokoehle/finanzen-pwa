import { useEffect, useState } from 'react'
import { BackupReminder } from './BackupReminder'
import type { Expense } from './db'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseList } from './ExpenseList'
import { today } from './format'
import { generateDue } from './recurring'
import { Settings } from './Settings'
import { Stats } from './Stats'

type Tab = 'add' | 'list' | 'stats' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'add', label: 'Neu' },
  { id: 'list', label: 'Ausgaben' },
  { id: 'stats', label: 'Auswertung' },
  { id: 'settings', label: 'Einstellungen' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('add')
  const [editing, setEditing] = useState<Expense | null>(null)
  // Shared by list and stats, so switching between them keeps the month.
  const [month, setMonth] = useState(() => today().slice(0, 7))

  // Book due recurring expenses on start and whenever the app comes back to the foreground.
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'visible') generateDue().catch(console.error)
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [])

  function go(next: Tab) {
    setEditing(null)
    setTab(next)
  }

  return (
    <div className="app">
      <main>
        {editing ? (
          <>
            <h1>Ausgabe bearbeiten</h1>
            <ExpenseForm key={editing.id} expense={editing} onDone={() => setEditing(null)} />
          </>
        ) : tab === 'add' ? (
          <>
            <h1>Neue Ausgabe</h1>
            <ExpenseForm />
          </>
        ) : tab === 'list' ? (
          <>
            <BackupReminder onOpen={() => go('settings')} />
            <ExpenseList month={month} onMonthChange={setMonth} onEdit={setEditing} />
          </>
        ) : tab === 'stats' ? (
          <Stats month={month} onMonthChange={setMonth} />
        ) : (
          <Settings />
        )}
      </main>

      <nav className="tabs">
        {TABS.map((t) => (
          <button type="button" key={t.id} aria-current={tab === t.id} onClick={() => go(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
