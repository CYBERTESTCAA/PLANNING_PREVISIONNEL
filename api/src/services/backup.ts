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

const RESTORE_PASSWORD = process.env.RESTORE_PASSWORD || 'adminpasswordcaa';
const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || '/data/planning.sqlite';

export interface BackupInfo {
  file: string;
  sizeBytes: number;
  date: string;
}

export function listBackups(): BackupInfo[] {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('planning-') && f.endsWith('.sqlite'))
    .sort()
    .reverse()
    .map(file => {
      const filepath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filepath);
      // Extract date from filename: planning-2026-03-03T02-00-00.sqlite
      const dateStr = file.replace('planning-', '').replace('.sqlite', '').replace(/T/, ' ').replace(/-/g, (m, offset) => offset > 9 ? ':' : '-');
      return { file, sizeBytes: stats.size, date: dateStr };
    });
}

export function verifyRestorePassword(password: string): boolean {
  return password === RESTORE_PASSWORD;
}

export async function restoreBackup(prisma: PrismaClient, filename: string): Promise<{ ok: boolean; message: string }> {
  try {
    ensureBackupDir();
    const filepath = path.join(BACKUP_DIR, filename);

    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return { ok: false, message: 'Invalid filename' };
    }

    if (!fs.existsSync(filepath)) {
      return { ok: false, message: `Backup not found: ${filename}` };
    }

    // First, create a safety backup of current DB before restoring
    const safetyResult = await runBackup(prisma);
    if (safetyResult) {
      console.log(`[restore] Safety backup created: ${safetyResult.file}`);
    }

    // Disconnect Prisma so the DB file is not locked
    await prisma.$disconnect();

    // Copy backup file over the current DB
    fs.copyFileSync(filepath, DB_PATH);
    // Remove WAL/SHM files if they exist (they're stale after a restore)
    const walPath = DB_PATH + '-wal';
    const shmPath = DB_PATH + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // Reconnect Prisma
    await prisma.$connect();
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000');

    console.log(`[restore] Successfully restored from: ${filename}`);
    return { ok: true, message: `Restored from ${filename}` };
  } catch (err: any) {
    console.error(`[restore] Failed:`, err.message);
    // Try to reconnect Prisma even on failure
    try { await prisma.$connect(); } catch {}
    return { ok: false, message: err.message };
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
