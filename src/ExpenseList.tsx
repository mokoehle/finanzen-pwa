import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Expense } from './db'
import { dayLabel, formatCents } from './format'
import { MonthNav } from './MonthNav'

interface Props {
  month: string
  onMonthChange: (month: string) => void
  onEdit: (expense: Expense) => void
}

export function ExpenseList({ month, onMonthChange, onEdit }: Props) {
  const expenses = useLiveQuery(
    () => db.expenses.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray(),
    [month],
  )
  const categories = useLiveQuery(() => db.categories.toArray())
  const accounts = useLiveQuery(() => db.accounts.toArray())

  const categoryById = new Map(categories?.map((c) => [c.id, c]))
  const accountById = new Map(accounts?.map((a) => [a.id, a]))

  const sorted = [...(expenses ?? [])].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  )
  const total = sorted.reduce((sum, e) => sum + e.amount, 0)

  const days: { date: string; items: Expense[] }[] = []
  for (const e of sorted) {
    const last = days[days.length - 1]
    if (last?.date === e.date) last.items.push(e)
    else days.push({ date: e.date, items: [e] })
  }

  return (
    <div className="list">
      <MonthNav month={month} onChange={onMonthChange} total={total} />

      {expenses && sorted.length === 0 && <p className="empty">Keine Ausgaben in diesem Monat.</p>}

      {days.map((day) => (
        <section key={day.date}>
          <h3>
            <span>{dayLabel(day.date)}</span>
            <span>{formatCents(day.items.reduce((s, e) => s + e.amount, 0))}</span>
          </h3>
          <ul>
            {day.items.map((e) => {
              const category = categoryById.get(e.categoryId)
              return (
                <li key={e.id}>
                  <button type="button" className="item" onClick={() => onEdit(e)}>
                    <span className="dot" style={{ background: category?.color ?? '#999' }} />
                    <span className="item-text">
                      <span className="item-subject">{e.subject}</span>
                      <span className="item-meta">
                        {category?.name ?? 'Ohne Kategorie'} · {accountById.get(e.accountId)?.name ?? '–'}
                        {e.recurringId !== undefined && ' · ↻ wiederkehrend'}
                      </span>
                    </span>
                    <span className="item-amount">{formatCents(e.amount)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
