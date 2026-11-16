import { db, type Account, type Category, type Expense, type Recurring } from './db'
import { today } from './format'

interface Backup {
  version: 1
  exportedAt: string
  expenses: Expense[]
  categories: Category[]
  accounts: Account[]
  recurring: Recurring[]
}

const LAST_BACKUP_KEY = 'lastBackupAt'

/** Timestamp of the last JSON backup made on this device, if any. */
export function lastBackupAt(): number | null {
  return Number(localStorage.getItem(LAST_BACKUP_KEY)) || null
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportJSON() {
  const backup: Backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses: await db.expenses.toArray(),
    categories: await db.categories.toArray(),
    accounts: await db.accounts.toArray(),
    recurring: await db.recurring.toArray(),
  }
  download(`finanzen-backup-${today()}.json`, JSON.stringify(backup, null, 2), 'application/json')
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Semicolon-separated with decimal commas and a BOM, so German Excel opens it correctly. */
export async function exportCSV() {
  const [expenses, categories, accounts] = await Promise.all([
    db.expenses.orderBy('date').toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
  ])
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const accountName = new Map(accounts.map((a) => [a.id, a.name]))
  const rows = expenses.map((e) =>
    [
      e.date,
      csvField(e.subject),
      csvField(categoryName.get(e.categoryId) ?? ''),
      csvField(accountName.get(e.accountId) ?? ''),
      (e.amount / 100).toFixed(2).replace('.', ','),
    ].join(';'),
  )
  const csv = ['Datum;Betreff;Kategorie;Zahlungsart;Betrag', ...rows].join('\r\n')
  download(`finanzen-${today()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8')
}

function isBackup(data: unknown): data is Backup {
  if (typeof data !== 'object' || data === null) return false
  const b = data as Partial<Backup>
  return (
    b.version === 1 &&
    Array.isArray(b.categories) &&
    b.categories.every((c) => typeof c?.id === 'number' && typeof c.name === 'string') &&
    Array.isArray(b.accounts) &&
    b.accounts.every((a) => typeof a?.id === 'number' && typeof a.name === 'string') &&
    Array.isArray(b.expenses) &&
    (b.recurring === undefined ||
      (Array.isArray(b.recurring) &&
        b.recurring.every(
          (r) =>
            typeof r?.id === 'number' &&
            Number.isInteger(r.amount) &&
            Number.isInteger(r.dayOfMonth) &&
            typeof r.lastGenerated === 'string' &&
            /^\d{4}-\d{2}$/.test(r.lastGenerated),
        ))) &&
    b.expenses.every(
      (e) =>
        typeof e?.id === 'number' &&
        Number.isInteger(e.amount) &&
        typeof e.subject === 'string' &&
        typeof e.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date),
    )
  )
}

/** Reads and validates a backup file without touching the database. */
export async function readBackup(file: File): Promise<Backup> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (!isBackup(data)) throw new Error('Die Datei ist kein Finanzen-Backup.')
  return data
}

/** Replaces all data with the contents of the backup. */
export async function restoreBackup(backup: Backup) {
  await db.transaction('rw', [db.expenses, db.categories, db.accounts, db.recurring], async () => {
    await Promise.all([db.expenses.clear(), db.categories.clear(), db.accounts.clear(), db.recurring.clear()])
    await db.categories.bulkAdd(backup.categories)
    await db.accounts.bulkAdd(backup.accounts)
    await db.expenses.bulkAdd(backup.expenses)
    await db.recurring.bulkAdd(backup.recurring ?? [])
  })
}
