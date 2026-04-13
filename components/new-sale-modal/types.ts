export type PaymentMethod = "cash" | "credit" | "mixed"

export interface ProductOption {
  id: number
  name: string
  current_stock: number
  selling_price: number
  unit: string
}

export interface ClientOption {
  id: number
  name: string
  phone?: string
}

/** One editable line: strings avoid losing decimals while typing (e.g. "12.") */
export interface SaleLineDraft {
  rowId: string
  productId: number
  productName: string
  qtyStr: string
  unitPriceStr: string
  laborStr: string
}

export interface NewSaleSaveItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  additional_price: number
  total_price: number
}

export interface NewSaleSavePayload {
  client_id: string
  payment_method: PaymentMethod
  cash_amount: number
  credit_amount: number
  notes: string
  items: NewSaleSaveItem[]
  total_amount: number
}
