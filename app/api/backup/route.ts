import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import db from "@/lib/database"

// Backup directory
const BACKUP_DIR = "C:\\droguerie-backups"

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR)
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
  }
}

// Get all backups
export async function GET() {
  try {
    await ensureBackupDir()
    
    const files = await fs.readdir(BACKUP_DIR)
    const backupFiles = files.filter(file => file.endsWith('.db'))
    
    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(BACKUP_DIR, file)
        const stats = await fs.stat(filePath)
        
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        }
      })
    )
    
    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return NextResponse.json(backups)
  } catch (error) {
    console.error("Error fetching backups:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des sauvegardes" }, { status: 500 })
  }
}

// Create new backup
export async function POST(request: NextRequest) {
  try {
    await ensureBackupDir()
    
    const body = await request.json()
    const { description = "Sauvegarde manuelle" } = body
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFilename = `droguerie-backup-${timestamp}.db`
    const backupPath = path.join(BACKUP_DIR, backupFilename)
    
    // Get database path
    const dbPath = path.join(process.cwd(), "droguerie.db")
    
    // Copy database file
    await fs.copyFile(dbPath, backupPath)
    
    // Create metadata file
    const metadata = {
      description,
      createdAt: new Date().toISOString(),
      originalSize: (await fs.stat(dbPath)).size,
      backupSize: (await fs.stat(backupPath)).size,
      version: "1.0"
    }
    
    const metadataPath = backupPath.replace('.db', '.json')
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
    
    return NextResponse.json({
      message: "Sauvegarde créée avec succès",
      backup: {
        filename: backupFilename,
        path: backupPath,
        metadata
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating backup:", error)
    return NextResponse.json({ error: "Erreur lors de la création de la sauvegarde" }, { status: 500 })
  }
}

// Restore backup
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body
    
    if (!filename) {
      return NextResponse.json({ error: "Nom de fichier de sauvegarde requis" }, { status: 400 })
    }
    
    const backupPath = path.join(BACKUP_DIR, filename)
    const dbPath = path.join(process.cwd(), "droguerie.db")
    
    // Check if backup file exists
    try {
      await fs.access(backupPath)
    } catch {
      return NextResponse.json({ error: "Fichier de sauvegarde non trouvé" }, { status: 404 })
    }
    
    // Create a backup of current database before restoration
    const currentTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const currentBackupFilename = `droguerie-pre-restore-${currentTimestamp}.db`
    const currentBackupPath = path.join(BACKUP_DIR, currentBackupFilename)
    
    await fs.copyFile(dbPath, currentBackupPath)
    
    // Close current database connection
    db.close()
    
    // Restore from backup
    await fs.copyFile(backupPath, dbPath)
    
    return NextResponse.json({
      message: "Sauvegarde restaurée avec succès",
      restoredFrom: filename,
      currentBackup: currentBackupFilename
    })
  } catch (error) {
    console.error("Error restoring backup:", error)
    return NextResponse.json({ error: "Erreur lors de la restauration de la sauvegarde" }, { status: 500 })
  }
}

// Delete backup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    if (!filename) {
      return NextResponse.json({ error: "Nom de fichier de sauvegarde requis" }, { status: 400 })
    }
    
    const backupPath = path.join(BACKUP_DIR, filename)
    const metadataPath = backupPath.replace('.db', '.json')
    
    // Check if backup file exists
    try {
      await fs.access(backupPath)
    } catch {
      return NextResponse.json({ error: "Fichier de sauvegarde non trouvé" }, { status: 404 })
    }
    
    // Delete backup file and metadata
    await fs.unlink(backupPath)
    
    try {
      await fs.unlink(metadataPath)
    } catch {
      // Metadata file might not exist, ignore error
    }
    
    return NextResponse.json({ message: "Sauvegarde supprimée avec succès" })
  } catch (error) {
    console.error("Error deleting backup:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression de la sauvegarde" }, { status: 500 })
  }
} 