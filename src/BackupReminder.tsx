import { useLiveQuery } from 'dexie-react-hooks'
import { lastBackupAt } from './backup'
import { db } from './db'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

/** Shown when there is data and the last backup (or the first entry) is over 30 days old. */
export function BackupReminder({ onOpen }: { onOpen: () => void }) {
  const due = useLiveQuery(async () => {
    const first = await db.expenses.orderBy(':id').first()
    if (!first) return false
    return Date.now() - (lastBackupAt() ?? first.createdAt) > THIRTY_DAYS
  })
  if (!due) return null
  return (
    <button type="button" className="notice reminder" onClick={onOpen}>
      Dein letztes Backup ist über 30 Tage her. Jetzt sichern ›
    </button>
  )
}
