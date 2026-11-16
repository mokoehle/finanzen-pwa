import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { formatCents } from './format'
import { MonthNav } from './MonthNav'

interface Props {
  month: string
  onMonthChange: (month: string) => void
}

const UNKNOWN = { name: 'Ohne Kategorie', color: '#999999' }

function Meter({ spent, budget, color }: { spent: number; budget: number; color: string }) {
  const over = spent > budget
  const rest = Math.abs(budget - spent)
  return (
    <>
      <div
        className="track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={Math.min(spent, budget)}
        aria-valuetext={`${formatCents(spent)} von ${formatCents(budget)}`}
      >
        <div
          className="fill"
          style={{ width: `${Math.min(spent / budget, 1) * 100}%`, background: over ? 'var(--danger)' : color }}
        />
      </div>
      <p className={over ? 'rest over' : 'rest'}>
        {over ? `⚠ ${formatCents(rest)} über Budget` : `Noch ${formatCents(rest)} übrig`}
      </p>
    </>
  )
}

export function Stats({ month, onMonthChange }: Props) {
  const expenses = useLiveQuery(
    () => db.expenses.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray(),
    [month],
  )
  const categories = useLiveQuery(() => db.categories.toArray())

  const spentBy = new Map<number, number>()
  for (const e of expenses ?? []) spentBy.set(e.categoryId, (spentBy.get(e.categoryId) ?? 0) + e.amount)
  const total = [...spentBy.values()].reduce((s, v) => s + v, 0)

  const categoryById = new Map(categories?.map((c) => [c.id, c]))
  const byCategory = [...spentBy.entries()]
    .map(([id, spent]) => ({ id, spent, ...(categoryById.get(id) ?? UNKNOWN) }))
    .sort((a, b) => b.spent - a.spent)
  const max = byCategory[0]?.spent ?? 0

  const budgets = (categories ?? [])
    .filter((c) => c.budget)
    .map((c) => ({ ...c, budget: c.budget!, spent: spentBy.get(c.id) ?? 0 }))
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget)
  const budgetTotal = budgets.reduce((s, b) => s + b.budget, 0)
  const budgetSpent = budgets.reduce((s, b) => s + b.spent, 0)

  return (
    <div className="stats">
      <MonthNav month={month} onChange={onMonthChange} total={total} />

      <section>
        <h3>Budgets</h3>
        {categories && budgets.length === 0 && (
          <p className="hint">Noch keine Budgets. Lege sie in den Einstellungen pro Kategorie fest.</p>
        )}
        {budgets.length > 1 && (
          <div className="card">
            <div className="stat-head">
              <span className="stat-name">Alle Budgets</span>
              <span className="stat-value">
                {formatCents(budgetSpent)} <span className="of">von {formatCents(budgetTotal)}</span>
              </span>
            </div>
            <Meter spent={budgetSpent} budget={budgetTotal} color="var(--accent)" />
          </div>
        )}
        {budgets.map((b) => (
          <div className="card" key={b.id}>
            <div className="stat-head">
              <span className="dot" style={{ background: b.color }} />
              <span className="stat-name">{b.name}</span>
              <span className="stat-value">
                {formatCents(b.spent)} <span className="of">von {formatCents(b.budget)}</span>
              </span>
            </div>
            <Meter spent={b.spent} budget={b.budget} color={b.color} />
          </div>
        ))}
      </section>

      <section>
        <h3>Nach Kategorie</h3>
        {expenses && byCategory.length === 0 && <p className="hint">Keine Ausgaben in diesem Monat.</p>}
        {byCategory.length > 0 && (
          <div className="card bars">
            {byCategory.map((c) => (
              <div key={c.id}>
                <div className="stat-head">
                  <span className="stat-name">{c.name}</span>
                  <span className="stat-value">
                    {formatCents(c.spent)} <span className="of">{Math.round((c.spent / total) * 100)} %</span>
                  </span>
                </div>
                <div className="bar" style={{ width: `${(c.spent / max) * 100}%`, background: c.color }} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
