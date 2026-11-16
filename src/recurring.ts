import { db, type Recurring } from './db'
import { shiftMonth, today } from './format'

/** Due date in the given YYYY-MM month; days past the end of the month fall on its last day. */
export function dueDate(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

/**
 * A new template starts with its next due date: this month if the day is today
 * or still ahead, otherwise next month. Nothing is booked retroactively.
 */
export function initialLastGenerated(day: number): string {
  const month = today().slice(0, 7)
  return dueDate(month, day) >= today() ? shiftMonth(month, -1) : month
}

export function nextDue(r: Recurring): string {
  return dueDate(shiftMonth(r.lastGenerated, 1), r.dayOfMonth)
}

/**
 * Books every expense that has become due since the app was last open.
 * Runs in one transaction, so concurrent calls cannot book the same month twice.
 */
export function generateDue(): Promise<number> {
  const now = today()
  return db.transaction('rw', db.recurring, db.expenses, async () => {
    let created = 0
    for (const r of await db.recurring.toArray()) {
      let last = r.lastGenerated
      for (let month = shiftMonth(last, 1); dueDate(month, r.dayOfMonth) <= now; month = shiftMonth(month, 1)) {
        await db.expenses.add({
          amount: r.amount,
          subject: r.subject,
          categoryId: r.categoryId,
          accountId: r.accountId,
          date: dueDate(month, r.dayOfMonth),
          recurringId: r.id,
          createdAt: Date.now(),
        })
        last = month
        created++
      }
      if (last !== r.lastGenerated) await db.recurring.update(r.id, { lastGenerated: last })
    }
    return created
  })
}
