// Tipos a mano de la API (pocos endpoints; openapi-typescript choca con TS 7)
export type MedioPago = 'debit' | 'credit' | 'cash'

export interface CategoryApi {
  id: string
  name: string
  emoji: string
  color: number
  is_fallback: boolean
}

export interface CategoryIn {
  name: string
  emoji: string
  color: number
}

export interface ExpenseCreate {
  id: string
  amount_cents: number
  category_id: string
  description: string | null
  payment_method: 'debit' | 'cash'
  date: string
}

export interface ExpenseApi {
  id: string
  category_id: string
  amount_cents: number
  description: string | null
  payment_method: MedioPago
  date: string
}

export interface LastPaymentMethod {
  payment_method: MedioPago
}
