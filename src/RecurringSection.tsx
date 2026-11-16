import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db, type Recurring } from './db'
import { centsToInput, formatCents, parseCents, shortDate } from './format'
import { generateDue, initialLastGenerated, nextDue } from './recurring'

function RecurringForm({ recurring, onDone }: { recurring?: Recurring; onDone: () => void }) {
  const categories = useLiveQuery(() => db.categories.toArray())
  const accounts = useLiveQuery(() => db.accounts.toArray())

  const [amount, setAmount] = useState(recurring ? centsToInput(recurring.amount) : '')
  const [subject, setSubject] = useState(recurring?.subject ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(recurring?.categoryId ?? '')
  const [chosenAccountId, setAccountId] = useState<number | ''>(recurring?.accountId ?? '')
  const [day, setDay] = useState(String(recurring?.dayOfMonth ?? 1))
  const [error, setError] = useState('')

  const accountId = chosenAccountId || (accounts?.[0]?.id ?? '')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseCents(amount)
    const dayOfMonth = Number(day)
    if (cents === null) return setError('Bitte einen gültigen Betrag eingeben.')
    if (!subject.trim()) return setError('Bitte einen Betreff eingeben.')
    if (categoryId === '') return setError('Bitte eine Kategorie wählen.')
    if (accountId === '') return setError('Bitte eine Zahlungsart wählen.')
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return setError('Bitte einen Tag zwischen 1 und 31 eingeben.')
    }

    const data = { amount: cents, subject: subject.trim(), categoryId, accountId, dayOfMonth }
    if (recurring) {
      await db.recurring.update(recurring.id, data)
    } else {
      await db.recurring.add({ ...data, lastGenerated: initialLastGenerated(dayOfMonth) })
      await generateDue()
    }
    onDone()
  }

  async function remove() {
    if (!recurring) return
    if (!confirm(`„${recurring.subject}“ löschen? Bereits gebuchte Ausgaben bleiben erhalten.`)) return
    await db.recurring.delete(recurring.id)
    onDone()
  }

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <div className="row">
        <label className="field">
          <span>Betrag €</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Tag im Monat</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span>Betreff</span>
        <input
          type="text"
          placeholder="z. B. Miete"
          autoComplete="off"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <div className="row">
        <label className="field">
          <span>Kategorie</span>
          <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
            <option value="" disabled>
              Wählen …
            </option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Zahlungsart</span>
          <select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="hint">
        In kürzeren Monaten wird am letzten Tag gebucht. Änderungen gelten nur für künftige Buchungen.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary">
        Speichern
      </button>
      <div className="row">
        <button type="button" className="secondary" onClick={onDone}>
          Abbrechen
        </button>
        {recurring && (
          <button type="button" className="danger" onClick={remove}>
            Löschen
          </button>
        )}
      </div>
    </form>
  )
}

export function RecurringSection() {
  const recurring = useLiveQuery(() => db.recurring.toArray())
  const categories = useLiveQuery(() => db.categories.toArray())
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)

  const categoryById = new Map(categories?.map((c) => [c.id, c]))
  const total = recurring?.reduce((s, r) => s + r.amount, 0) ?? 0

  return (
    <section>
      <h2>Wiederkehrende Ausgaben</h2>
      {editing ? (
        <RecurringForm
          key={editing === 'new' ? 'new' : editing.id}
          recurring={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <>
          <p className="hint">
            Werden am festgelegten Tag automatisch gebucht, sobald du die App öffnest.
            {total > 0 && ` Zusammen ${formatCents(total)} pro Monat.`}
          </p>
          {!!recurring?.length && (
            <ul className="rec-list">
              {[...recurring]
                .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
                .map((r) => {
                  const category = categoryById.get(r.categoryId)
                  return (
                    <li key={r.id}>
                      <button type="button" className="item" onClick={() => setEditing(r)}>
                        <span className="dot" style={{ background: category?.color ?? '#999' }} />
                        <span className="item-text">
                          <span className="item-subject">{r.subject}</span>
                          <span className="item-meta">
                            Am {r.dayOfMonth}. · nächste Buchung {shortDate(nextDue(r))}
                          </span>
                        </span>
                        <span className="item-amount">{formatCents(r.amount)}</span>
                      </button>
                    </li>
                  )
                })}
            </ul>
          )}
          <button type="button" className="secondary" onClick={() => setEditing('new')}>
            Wiederkehrende Ausgabe hinzufügen
          </button>
        </>
      )}
    </section>
  )
}
