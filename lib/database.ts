import Database from "better-sqlite3"
import path from "path"

const dbPath = path.join(process.cwd(), "droguerie.db")
const db = new Database(dbPath)

// Enable foreign keys; WAL improves read concurrency and typical write latency
db.pragma("foreign_keys = ON")
try {
  db.pragma("journal_mode = WAL")
} catch {
  // ignore if unsupported
}

// Function to check if columns exist and add them if they don't
function ensureMixedPaymentColumns() {
  try {
    // Check if cash_amount column exists
    const tableInfo = db.prepare("PRAGMA table_info(sales)").all()
    const hasCashAmount = tableInfo.some((col: any) => col.name === 'cash_amount')
    const hasCreditAmount = tableInfo.some((col: any) => col.name === 'credit_amount')
    
    if (!hasCashAmount) {
      db.exec("ALTER TABLE sales ADD COLUMN cash_amount DECIMAL(10,2) DEFAULT 0")
      console.log("Added cash_amount column to sales table")
    }
    
    if (!hasCreditAmount) {
      db.exec("ALTER TABLE sales ADD COLUMN credit_amount DECIMAL(10,2) DEFAULT 0")
      console.log("Added credit_amount column to sales table")
    }
    
    // Update existing records if needed
    if (!hasCashAmount || !hasCreditAmount) {
      db.exec(`
        UPDATE sales 
        SET cash_amount = total_amount, credit_amount = 0 
        WHERE payment_method = 'cash' AND (cash_amount = 0 OR cash_amount IS NULL)
      `)
      
      db.exec(`
        UPDATE sales 
        SET cash_amount = 0, credit_amount = total_amount 
        WHERE payment_method = 'credit' AND (cash_amount = 0 OR cash_amount IS NULL)
      `)
      
      console.log("Updated existing sales records with cash/credit amounts")
    }
  } catch (error) {
    console.error("Error ensuring mixed payment columns:", error)
  }
}

// Function to ensure purchases table has required columns
function ensurePurchasesColumns() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(purchases)").all()
    const hasInvoiceNumber = tableInfo.some((col: any) => col.name === 'invoice_number')
    const hasStatus = tableInfo.some((col: any) => col.name === 'status')
    
    if (!hasInvoiceNumber) {
      db.exec("ALTER TABLE purchases ADD COLUMN invoice_number TEXT")
      console.log("Added invoice_number column to purchases table")
    }
    
    if (!hasStatus) {
      db.exec("ALTER TABLE purchases ADD COLUMN status TEXT DEFAULT 'pending'")
      console.log("Added status column to purchases table")
    }
    
    // Update existing records to have default status
    if (!hasStatus) {
      db.exec("UPDATE purchases SET status = 'pending' WHERE status IS NULL")
      console.log("Updated existing purchases with default status")
    }
  } catch (error) {
    console.error("Error ensuring purchases columns:", error)
  }
}

// Initialize mixed payment support
ensureMixedPaymentColumns()

// Initialize purchases table columns
ensurePurchasesColumns()

// Initialize sale_items additional_price column
ensureSaleItemsAdditionalPrice()

// Initialize purchase_items additional_price column
ensurePurchaseItemsAdditionalPrice()

// Function to fix payment method values for consistency
function fixPaymentMethodValues() {
  try {
    // Update bank_transfer to transfer for consistency with frontend (only valid after CHECK allows 'transfer')
    db.exec("UPDATE purchases SET payment_method = 'transfer' WHERE payment_method = 'bank_transfer'")
    console.log("Updated payment method values for consistency")
  } catch (error) {
    console.error("Error fixing payment method values:", error)
  }
}

/** Rebuild purchases if DB still has legacy CHECK (cash, credit, bank_transfer only). SQLite cannot ALTER CHECK. */
function migratePurchasesPaymentMethodConstraint() {
  try {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchases'").get() as
      | { sql: string }
      | undefined
    if (!row?.sql) return

    const createSql = row.sql
    const needsMigration =
      createSql.includes("'bank_transfer'") && !createSql.includes("'card'")
    if (!needsMigration) return

    console.log("Migrating purchases table: expanding payment_method CHECK constraint...")
    db.exec("PRAGMA foreign_keys = OFF")
    db.exec(`
BEGIN TRANSACTION;
CREATE TABLE purchases_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'credit', 'card', 'transfer', 'check')),
  notes TEXT,
  invoice_number TEXT,
  purchase_date DATE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
INSERT INTO purchases_new (
  id, supplier_id, total_amount, payment_method, notes, invoice_number, purchase_date, status, created_at, updated_at
)
SELECT
  id,
  supplier_id,
  total_amount,
  CASE payment_method WHEN 'bank_transfer' THEN 'transfer' ELSE payment_method END,
  notes,
  invoice_number,
  purchase_date,
  status,
  created_at,
  updated_at
FROM purchases;
DROP TABLE purchases;
ALTER TABLE purchases_new RENAME TO purchases;
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
COMMIT;
`)
    db.exec("PRAGMA foreign_keys = ON")
    console.log("Purchases payment_method constraint migration complete.")
  } catch (error) {
    console.error("migratePurchasesPaymentMethodConstraint:", error)
    try {
      db.exec("PRAGMA foreign_keys = ON")
    } catch {
      // ignore
    }
  }
}

// Function to ensure purchases table has all required columns and constraints
function ensurePurchasesTableComplete() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(purchases)").all()
    const hasCreatedAt = tableInfo.some((col: any) => col.name === 'created_at')
    const hasUpdatedAt = tableInfo.some((col: any) => col.name === 'updated_at')
    
    if (!hasCreatedAt) {
      db.exec("ALTER TABLE purchases ADD COLUMN created_at DATETIME")
      console.log("Added created_at column to purchases table")
    }
    
    if (!hasUpdatedAt) {
      db.exec("ALTER TABLE purchases ADD COLUMN updated_at DATETIME")
      console.log("Added updated_at column to purchases table")
    }
    
    // Update existing records to have timestamps
    if (!hasCreatedAt || !hasUpdatedAt) {
      db.exec("UPDATE purchases SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at IS NULL OR updated_at IS NULL")
      console.log("Updated existing purchases with timestamps")
    }
    
    // Normalize unknown payment_method values (keep bank_transfer until table migration maps it to transfer)
    try {
      db.exec(
        "UPDATE purchases SET payment_method = 'cash' WHERE payment_method NOT IN ('cash', 'credit', 'transfer', 'check', 'card', 'bank_transfer')"
      )
      console.log("Updated invalid payment method values")
    } catch (error) {
      console.log("Payment method constraint update completed")
    }
  } catch (error) {
    console.error("Error ensuring purchases table is complete:", error)
  }
}

// Ensure purchases table is complete (columns) before CHECK migration
ensurePurchasesTableComplete()

// Legacy DBs: expand payment_method CHECK to match app (card, transfer, check, …)
migratePurchasesPaymentMethodConstraint()

// bank_transfer → transfer after constraint allows it
fixPaymentMethodValues()

// Function to ensure purchase_items table has all required columns
function ensurePurchaseItemsColumns() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(purchase_items)").all()
    
    // Check for designation column
    const hasDesignation = tableInfo.some((col: any) => col.name === 'designation')
    if (!hasDesignation) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN designation TEXT")
      console.log("Added designation column to purchase_items table")
    }
    
    // Check for avance column
    const hasAvance = tableInfo.some((col: any) => col.name === 'avance')
    if (!hasAvance) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN avance DECIMAL(10,2) DEFAULT 0.00")
      console.log("Added avance column to purchase_items table")
    }
    
    // Check for reste column
    const hasReste = tableInfo.some((col: any) => col.name === 'reste')
    if (!hasReste) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN reste DECIMAL(10,2) DEFAULT 0.00")
      console.log("Added reste column to purchase_items table")
    }
  } catch (error) {
    console.error("Error ensuring purchase_items columns:", error)
  }
}

// Ensure purchase_items table has all required columns
ensurePurchaseItemsColumns()

// Function to ensure sale_items table exists and has correct structure
function ensureSaleItemsTable() {
  try {
    // Check if sale_items table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sale_items'").get()
    
    if (!tableExists) {
      console.log("Creating sale_items table...")
      db.exec(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER,
          product_id INTEGER,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `)
      console.log("sale_items table created successfully")
    } else {
      console.log("sale_items table already exists")
    }
  } catch (error) {
    console.error("Error ensuring sale_items table:", error)
  }
}

// Function to ensure private_credits table has status column
function ensurePrivateCreditsStatus() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(private_credits)").all()
    const hasStatus = tableInfo.some((col: any) => col.name === 'status')
    
    if (!hasStatus) {
      db.exec("ALTER TABLE private_credits ADD COLUMN status TEXT DEFAULT 'active'")
      console.log("Added status column to private_credits table")
      
      // Update existing records to have 'active' status
      db.exec("UPDATE private_credits SET status = 'active' WHERE status IS NULL")
      console.log("Updated existing private credits with default status")
    }
  } catch (error) {
    console.error("Error ensuring private_credits status column:", error)
  }
}

// Function to ensure private_credits table has due_date column
function ensurePrivateCreditsDueDate() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(private_credits)").all()
    const hasDueDate = tableInfo.some((col: any) => col.name === 'due_date')
    
    if (!hasDueDate) {
      db.exec("ALTER TABLE private_credits ADD COLUMN due_date DATE")
      console.log("Added due_date column to private_credits table")
    }
  } catch (error) {
    console.error("Error ensuring private_credits due_date column:", error)
  }
}

// Function to ensure sale_items table has additional_price column
function ensureSaleItemsAdditionalPrice() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all()
    const hasAdditionalPrice = tableInfo.some((col: any) => col.name === 'additional_price')
    
    if (!hasAdditionalPrice) {
      db.exec("ALTER TABLE sale_items ADD COLUMN additional_price DECIMAL(10,2) DEFAULT 0")
      console.log("Added additional_price column to sale_items table")
    }
  } catch (error) {
    console.error("Error ensuring sale_items additional_price column:", error)
  }
}

// Function to ensure purchase_items table has additional_price column
function ensurePurchaseItemsAdditionalPrice() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(purchase_items)").all()
    const hasAdditionalPrice = tableInfo.some((col: any) => col.name === 'additional_price')
    
    if (!hasAdditionalPrice) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN additional_price DECIMAL(10,2) DEFAULT 0")
      console.log("Added additional_price column to purchase_items table")
    }
  } catch (error) {
    console.error("Error ensuring purchase_items additional_price column:", error)
  }
}



// Function to check and create missing tables
function ensureAllTablesExist() {
  try {
    const requiredTables = [
      'sales',
      'sale_items', 
      'client_credits',
      'cash_register'
    ]
    
    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    const existingTableNames = existingTables.map((t: any) => t.name)
    
    console.log("Existing tables:", existingTableNames)
    
    // Create missing tables
    if (!existingTableNames.includes('client_credits')) {
      console.log("Creating client_credits table...")
      db.exec(`
        CREATE TABLE IF NOT EXISTS client_credits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER,
          amount DECIMAL(10,2) NOT NULL,
          credit_type TEXT CHECK(credit_type IN ('sale', 'payment')),
          reference_id INTEGER,
          description TEXT,
          credit_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `)
      console.log("client_credits table created successfully")
    }
    
    if (!existingTableNames.includes('cash_register')) {
      console.log("Creating cash_register table...")
      db.exec(`
        CREATE TABLE IF NOT EXISTS cash_register (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          payment_method TEXT,
          description TEXT,
          client_id INTEGER,
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `)
      console.log("cash_register table created successfully")
    }
  } catch (error) {
    console.error("Error checking tables:", error)
  }
}

// Ensure sale_items table exists
ensureSaleItemsTable()

// Ensure private_credits has status column
ensurePrivateCreditsStatus()

// Ensure private_credits has due_date column
ensurePrivateCreditsDueDate()



// Check all required tables exist
ensureAllTablesExist()

// Function to check if database needs to be recreated
function checkDatabaseIntegrity() {
  try {
    // Check if essential tables exist
    const tables = ['suppliers', 'products', 'clients', 'purchases', 'sales']
    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    const existingTableNames = existingTables.map((t: any) => t.name)
    
    const missingTables = tables.filter(table => !existingTableNames.includes(table))
    
    if (missingTables.length > 0) {
      console.log("Missing tables detected:", missingTables)
      return false
    }
    
    // Check if clients table has the required columns
    try {
      const clientColumns = db.prepare("PRAGMA table_info(clients)").all()
      const hasRequiredColumns = clientColumns.some((col: any) => col.name === 'id')
      
      if (!hasRequiredColumns) {
        console.log("Clients table structure is invalid")
        return false
      }
    } catch (error) {
      console.log("Error checking clients table structure:", error)
      return false
    }
    
    return true
  } catch (error) {
    console.error("Error checking database integrity:", error)
    return false
  }
}

// Initialize database with schema
export function initializeDatabase() {
  const fs = require("fs")
  const schemaPath = path.join(process.cwd(), "scripts", "database-schema.sql")

  // Check if database needs to be recreated
  if (!checkDatabaseIntegrity()) {
    console.log("Database integrity check failed, recreating database...")
    
    // Drop and recreate the database file
    try {
      db.close()
      const fs = require("fs")
      const dbPath = path.join(process.cwd(), "droguerie.db")
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath)
      }
      
      // Recreate database connection
      const newDb = new Database(dbPath)
      newDb.pragma("foreign_keys = ON")
      
      // Re-execute the schema
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, "utf8")
        newDb.exec(schema)
        console.log("Database recreated successfully")
      }
    } catch (error) {
      console.error("Error recreating database:", error)
    }
  }

  if (fs.existsSync(schemaPath)) {
    try {
      const schema = fs.readFileSync(schemaPath, "utf8")
      // Split schema into individual statements and execute them one by one
      const statements = schema
        .split(';')
        .map((stmt: string) => stmt.trim())
        .filter((stmt: string) => stmt.length > 0 && !stmt.startsWith('--'))
      
      for (const statement of statements) {
        try {
          db.exec(statement + ';')
        } catch (error) {
          // Only log errors that are not related to missing columns or existing indexes
          if (!error.message.includes('no such column') && 
              !error.message.includes('index already exists') &&
              !error.message.includes('duplicate column name')) {
            console.error(`Error executing statement: ${statement}`, error)
          }
          // Continue with other statements even if one fails
        }
      }
    } catch (error) {
      console.error("Error reading or executing database schema:", error)
    }
  } else {
    console.warn("Database schema file not found at:", schemaPath)
  }

  // Check and fix private_credits table structure if needed
  try {
    const tableInfo = db.prepare("PRAGMA table_info(private_credits)").all()
    const hasClientId = tableInfo.some((column: any) => column.name === 'client_id')
    
    if (!hasClientId) {
      console.log("Fixing private_credits table structure...")
      // Add the missing client_id column
      db.exec("ALTER TABLE private_credits ADD COLUMN client_id INTEGER")
      // Add foreign key constraint if possible
      try {
        db.exec("PRAGMA foreign_keys=ON")
        db.exec("CREATE TABLE private_credits_new AS SELECT * FROM private_credits")
        db.exec("DROP TABLE private_credits")
        db.exec(`CREATE TABLE private_credits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT,
          credit_date DATE NOT NULL,
          due_date DATE,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paid', 'cancelled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )`)
        db.exec("INSERT INTO private_credits SELECT * FROM private_credits_new")
        db.exec("DROP TABLE private_credits_new")
        console.log("private_credits table structure fixed")
      } catch (alterError) {
        console.log("Could not fully restructure private_credits table, but column added")
      }
    }
  } catch (error) {
    console.log("private_credits table may not exist yet, skipping structure check")
  }

  migratePurchasesPaymentMethodConstraint()
  fixPurchasesWithoutItemsOnce()
}

/** One-time data repair: avoid running on every purchases API import */
let purchasesWithoutItemsFixDone = false
function fixPurchasesWithoutItemsOnce() {
  if (purchasesWithoutItemsFixDone) return
  purchasesWithoutItemsFixDone = true
  try {
    const purchasesWithoutItems = db.prepare(`
      SELECT p.id, p.total_amount, p.notes
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE pi.id IS NULL AND p.total_amount > 0
    `).all() as { id: number; total_amount: number; notes: string }[]

    if (purchasesWithoutItems.length === 0) return

    console.log(`Found ${purchasesWithoutItems.length} purchases without items, fixing...`)
    const insertItemStmt = db.prepare(`
      INSERT INTO purchase_items (
        purchase_id, product_id, quantity, unit_price, total_price
      ) VALUES (?, ?, ?, ?, ?)
    `)

    for (const purchase of purchasesWithoutItems) {
      insertItemStmt.run(purchase.id, 1, 1, purchase.total_amount, purchase.total_amount)
    }
    console.log("Fixed purchases without items")
  } catch (error) {
    console.error("Error fixing purchases without items:", error)
  }
}

export default db
