/**
 * SQLite backup service — creates periodic .sqlite backups using VACUUM INTO.
 * Keeps the last N backups and deletes older ones.
 * 
 * Backup files are stored in /data/backups/ (inside the Docker volume).
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/data/backups';
const MAX_BACKUPS = Number(process.env.MAX_BACKUPS || '30'); // keep last 30 backups

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function cleanOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('planning-') && f.endsWith('.sqlite'))
    .sort()
    .reverse(); // newest first

  if (files.length > MAX_BACKUPS) {
    for (const old of files.slice(MAX_BACKUPS)) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, old));
        console.log(`[backup] Deleted old backup: ${old}`);
      } catch (err: any) {
        console.error(`[backup] Failed to delete ${old}: ${err.message}`);
      }
    }
  }
}

export async function runBackup(prisma: PrismaClient): Promise<{ file: string; sizeBytes: number } | null> {
  try {
    ensureBackupDir();

    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `planning-${ts}.sqlite`;
    const filepath = path.join(BACKUP_DIR, filename);

    // VACUUM INTO creates a consistent copy without locking the main DB
    await prisma.$queryRawUnsafe(`VACUUM INTO '${filepath}'`);

    const stats = fs.statSync(filepath);
    console.log(`[backup] Created: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

    cleanOldBackups();

    return { file: filename, sizeBytes: stats.size };
  } catch (err: any) {
    console.error(`[backup] Failed:`, err.message);
    return null;
  }
}
