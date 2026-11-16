import Dexie, { type EntityTable } from 'dexie'

export interface Expense {
  id: number
  /** Amount in cents, to avoid floating point errors. */
  amount: number
  subject: string
  categoryId: number
  accountId: number
  /** Local date as YYYY-MM-DD. */
  date: string
  recurringId?: number
  createdAt: number
}

export interface Category {
  id: number
  name: string
  color: string
  /** Monthly budget in cents. */
  budget?: number
}

export interface Account {
  id: number
  name: string
}

export interface Recurring {
  id: number
  amount: number
  subject: string
  categoryId: number
  accountId: number
  dayOfMonth: number
  /** Last month an expense was booked for, as YYYY-MM. */
  lastGenerated: string
}

export const db = new Dexie('finanzen') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
  categories: EntityTable<Category, 'id'>
  accounts: EntityTable<Account, 'id'>
  recurring: EntityTable<Recurring, 'id'>
}

db.version(1).stores({
  expenses: '++id, date, categoryId, accountId',
  categories: '++id',
  accounts: '++id',
  recurring: '++id',
})

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd([
    { name: 'Essen', color: '#eb6834' },
    { name: 'Wohnen', color: '#2a78d6' },
    { name: 'Mobilität', color: '#1baf7a' },
    { name: 'Freizeit', color: '#6250d6' },
    { name: 'Einkäufe', color: '#eda100' },
    { name: 'Gesundheit', color: '#e87ba4' },
    { name: 'Sonstiges', color: '#008300' },
  ])
  tx.table('accounts').bulkAdd([{ name: 'Karte' }, { name: 'Bar' }, { name: 'PayPal' }])
})

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.().catch(() => {})
