export interface Product {
  id: number
  name: string
  description?: string
  purchase_price: number
  selling_price: number
  current_stock: number
  minimum_stock: number
  unit: string
  category?: string
  barcode?: string
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: number
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  credit_balance: number
  created_at: string
}

export interface Client {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  credit_balance: number
  created_at: string
}

export interface Employee {
  id: number
  name: string
  role: string
  salary: number
  hire_date: string
  phone?: string
  address?: string
  is_active: boolean
  created_at: string
}

export interface PurchaseItem {
  id?: number
  designation?: string
  product_id?: number
  quantity?: number
  unit_price?: number
}

export interface Purchase {
  id: number
  supplier_id?: number
  supplier_name?: string
  total_amount: number
  payment_method: "cash" | "credit" | "bank_transfer" | "card" | "transfer" | "check"
  notes?: string
  purchase_date: string
  status: "pending" | "completed"
  items_count: number
  invoice_number?: string
  supplier?: Supplier
  /** Line items (from API); used for search by product name / id */
  items?: PurchaseItem[]
}

export interface Sale {
  id: number
  client_id?: number
  total_amount: number
  payment_method: "cash" | "credit" | "mixed"
  cash_amount?: number
  credit_amount?: number
  notes?: string
  sale_date: string
  client?: Client
}

export interface StockMovement {
  id: number
  product_id: number
  movement_type: "purchase" | "sale" | "broken" | "adjustment"
  quantity: number
  reference_id?: number
  reference_type?: string
  notes?: string
  movement_date: string
  product?: Product
}

export interface ManualPayment {
  id: number
  amount: number
  payment_method: string
  reference?: string
  client_supplier_name?: string
  notes?: string
  payment_date: string
  created_at: string
}

export interface BusinessExpense {
  id: number
  description: string
  amount: number
  category?: string
  expense_date: string
  notes?: string
  status?: "paid" | "pending" | "overdue"
  created_at: string
}

export interface BrokenProduct {
  id: number
  product_id: number
  product_name?: string
  quantity: number
  reason?: string
  loss_amount?: number
  break_date: string
  status?: "pending" | "approved" | "rejected"
  created_at: string
  product?: Product
  // Additional fields for display
  original_price?: number
  total_loss?: number
  date_reported?: string
  notes?: string
  selling_price?: number
}

export interface PrivateCredit {
  id: number
  person_name: string
  amount: number
  credit_type?: "loan_given" | "loan_received" | "payment"
  description?: string
  credit_date: string
  created_at: string
  // Additional fields for display compatibility
  purpose?: string
  date_given?: string
  due_date?: string
  status?: "active" | "paid" | "overdue"
  notes?: string
}

export interface Transaction {
  id: number
  type: "deposit" | "withdrawal"
  category: string
  amount: number
  description: string
  bank_account: string
  reference: string
  date: string
  created_at: string
}
