import { formatCents, monthLabel, shiftMonth, today } from './format'

interface Props {
  month: string
  onChange: (month: string) => void
  total: number
}

export function MonthNav({ month, onChange, total }: Props) {
  const currentMonth = today().slice(0, 7)
  return (
    <header className="month">
      <button type="button" aria-label="Vorheriger Monat" onClick={() => onChange(shiftMonth(month, -1))}>
        ‹
      </button>
      <div>
        <h2>{monthLabel(month)}</h2>
        <p className="total">{formatCents(total)}</p>
      </div>
      <button
        type="button"
        aria-label="Nächster Monat"
        disabled={month >= currentMonth}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        ›
      </button>
    </header>
  )
}
