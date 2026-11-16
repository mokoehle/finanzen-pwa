import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { exportCSV, exportJSON, lastBackupAt, readBackup, restoreBackup } from './backup'
import { db } from './db'
import { centsToInput, parseCents } from './format'
import { RecurringSection } from './RecurringSection'

const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

async function usageCount(field: 'categoryId' | 'accountId', id: number): Promise<number> {
  const [expenses, recurring] = await Promise.all([
    db.expenses.where(field).equals(id).count(),
    db.recurring.filter((r) => r[field] === id).count(),
  ])
  return expenses + recurring
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim())
    setName('')
  }
  return (
    <form className="edit-row" onSubmit={submit}>
      <input
        type="text"
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="small">
        Hinzufügen
      </button>
    </form>
  )
}

export function Settings() {
  const categories = useLiveQuery(() => db.categories.toArray())
  const accounts = useLiveQuery(() => db.accounts.toArray())
  const [message, setMessage] = useState('')
  const [lastBackup, setLastBackup] = useState(lastBackupAt)
  const fileRef = useRef<HTMLInputElement>(null)

  async function removeCategory(id: number, name: string) {
    const used = await usageCount('categoryId', id)
    if (used > 0) return setMessage(`„${name}“ wird noch verwendet (${used}×) und kann nicht gelöscht werden.`)
    if (!confirm(`Kategorie „${name}“ löschen?`)) return
    await db.categories.delete(id)
    setMessage('')
  }

  async function removeAccount(id: number, name: string) {
    if (accounts?.length === 1) return setMessage('Mindestens eine Zahlungsart muss bleiben.')
    const used = await usageCount('accountId', id)
    if (used > 0) return setMessage(`„${name}“ wird noch verwendet (${used}×) und kann nicht gelöscht werden.`)
    if (!confirm(`Zahlungsart „${name}“ löschen?`)) return
    await db.accounts.delete(id)
    setMessage('')
  }

  function rename(table: 'categories' | 'accounts', id: number, old: string, input: HTMLInputElement) {
    const name = input.value.trim()
    if (!name) input.value = old
    else if (name !== old) db[table].update(id, { name })
  }

  function setBudget(id: number, old: number | undefined, input: HTMLInputElement) {
    const text = input.value.trim()
    const budget = text ? parseCents(text) : undefined
    if (budget === null) {
      input.value = old ? centsToInput(old) : ''
      setMessage('Bitte ein gültiges Budget eingeben, z. B. 250 oder 250,00.')
    } else if (budget !== old) {
      db.categories.update(id, { budget })
      setMessage('')
    }
  }

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const backup = await readBackup(file)
      const current = await db.expenses.count()
      const ok = confirm(
        `Backup mit ${backup.expenses.length} Ausgaben einspielen? ` +
          `Die aktuellen Daten (${current} Ausgaben) werden dabei ersetzt.`,
      )
      if (!ok) return
      await restoreBackup(backup)
      setMessage(`Backup eingespielt: ${backup.expenses.length} Ausgaben.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import fehlgeschlagen.')
    }
  }

  return (
    <div className="settings">
      <h1>Einstellungen</h1>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      <section>
        <h2>Kategorien</h2>
        {categories?.map((c) => (
          <div className="edit-row" key={c.id}>
            <input
              type="color"
              aria-label={`Farbe von ${c.name}`}
              value={c.color}
              onChange={(e) => db.categories.update(c.id, { color: e.target.value })}
            />
            <input
              type="text"
              aria-label="Name der Kategorie"
              defaultValue={c.name}
              onBlur={(e) => rename('categories', c.id, c.name, e.target)}
            />
            <input
              type="text"
              className="budget"
              inputMode="decimal"
              placeholder="Budget €"
              aria-label={`Monatsbudget für ${c.name}`}
              autoComplete="off"
              key={c.budget}
              defaultValue={c.budget ? centsToInput(c.budget) : ''}
              onBlur={(e) => setBudget(c.id, c.budget, e.target)}
            />
            <button
              type="button"
              className="icon"
              aria-label={`${c.name} löschen`}
              onClick={() => removeCategory(c.id, c.name)}
            >
              ✕
            </button>
          </div>
        ))}
        <AddRow
          placeholder="Neue Kategorie"
          onAdd={(name) =>
            db.categories.add({ name, color: PALETTE[(categories?.length ?? 0) % PALETTE.length] })
          }
        />
      </section>

      <section>
        <h2>Zahlungsarten</h2>
        {accounts?.map((a) => (
          <div className="edit-row" key={a.id}>
            <input
              type="text"
              aria-label="Name der Zahlungsart"
              defaultValue={a.name}
              onBlur={(e) => rename('accounts', a.id, a.name, e.target)}
            />
            <button
              type="button"
              className="icon"
              aria-label={`${a.name} löschen`}
              onClick={() => removeAccount(a.id, a.name)}
            >
              ✕
            </button>
          </div>
        ))}
        <AddRow placeholder="Neue Zahlungsart" onAdd={(name) => db.accounts.add({ name })} />
      </section>

      <RecurringSection />

      <section>
        <h2>Backup</h2>
        <p className="hint">
          Die Daten liegen nur auf diesem Gerät. Sichere sie regelmäßig als Backup-Datei.{' '}
          {lastBackup
            ? `Letztes Backup: ${new Date(lastBackup).toLocaleDateString('de-DE', { dateStyle: 'long' })}.`
            : 'Noch kein Backup gespeichert.'}
        </p>
        <button type="button" className="secondary" onClick={() => exportJSON().then(() => setLastBackup(lastBackupAt()))}>
          Backup speichern (JSON)
        </button>
        <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
          Backup einspielen
        </button>
        <button type="button" className="secondary" onClick={exportCSV}>
          Als Tabelle exportieren (CSV)
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </section>
    </div>
  )
}
