import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { db, type Expense } from './db'
import { centsToInput, parseCents, today } from './format'

const LAST_ACCOUNT_KEY = 'lastAccountId'

interface Props {
  /** When set, the form edits this expense instead of creating a new one. */
  expense?: Expense
  onDone?: () => void
}

export function ExpenseForm({ expense, onDone }: Props) {
  const categories = useLiveQuery(() => db.categories.toArray())
  const accounts = useLiveQuery(() => db.accounts.toArray())

  const [amount, setAmount] = useState(expense ? centsToInput(expense.amount) : '')
  const [subject, setSubject] = useState(expense?.subject ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(expense?.categoryId ?? null)
  const [chosenAccountId, setAccountId] = useState<number | null>(
    expense?.accountId ?? (Number(localStorage.getItem(LAST_ACCOUNT_KEY)) || null),
  )
  // Fall back to the first account if none is remembered or it was deleted.
  const accountId = accounts?.some((a) => a.id === chosenAccountId)
    ? chosenAccountId
    : (accounts?.[0]?.id ?? null)
  const [date, setDate] = useState(expense?.date ?? today())
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [saved])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseCents(amount)
    if (cents === null) return setError('Bitte einen gültigen Betrag eingeben.')
    if (!subject.trim()) return setError('Bitte einen Betreff eingeben.')
    if (categoryId === null) return setError('Bitte eine Kategorie wählen.')
    if (accountId === null) return setError('Bitte eine Zahlungsart wählen.')
    if (!date) return setError('Bitte ein Datum wählen.')
    setError('')

    const data = { amount: cents, subject: subject.trim(), categoryId, accountId, date }
    localStorage.setItem(LAST_ACCOUNT_KEY, String(accountId))

    if (expense) {
      await db.expenses.update(expense.id, data)
      onDone?.()
      return
    }
    await db.expenses.add({ ...data, createdAt: Date.now() })
    setAmount('')
    setSubject('')
    setCategoryId(null)
    setDate(today())
    setSaved(true)
    amountRef.current?.focus()
  }

  async function remove() {
    if (!expense || !confirm(`„${expense.subject}“ wirklich löschen?`)) return
    await db.expenses.delete(expense.id)
    onDone?.()
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="amount">
        <span className="sr-only">Betrag</span>
        <input
          ref={amountRef}
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span aria-hidden="true">€</span>
      </label>

      <label className="field">
        <span>Betreff</span>
        <input
          type="text"
          placeholder="z. B. Mittagessen"
          autoComplete="off"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>

      <fieldset className="field">
        <legend>Kategorie</legend>
        <div className="chips">
          {categories?.map((c) => (
            <button
              type="button"
              key={c.id}
              className="chip"
              aria-pressed={c.id === categoryId}
              style={{ '--chip': c.color } as React.CSSProperties}
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="row">
        <label className="field">
          <span>Zahlungsart</span>
          <select value={accountId ?? ''} onChange={(e) => setAccountId(Number(e.target.value))}>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Datum</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="primary">
        {expense ? 'Änderungen speichern' : 'Ausgabe speichern'}
      </button>
      {expense && (
        <div className="row">
          <button type="button" className="secondary" onClick={onDone}>
            Abbrechen
          </button>
          <button type="button" className="danger" onClick={remove}>
            Löschen
          </button>
        </div>
      )}
      <p className="toast" role="status">
        {saved ? 'Gespeichert ✓' : ''}
      </p>
    </form>
  )
}
