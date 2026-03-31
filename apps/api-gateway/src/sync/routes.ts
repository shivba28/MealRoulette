import type { Express, Request, Response } from 'express';
import { getSession } from '../auth/sessionStore.js';
import { readBackupFromDrive, writeBackupToDrive } from './driveBackup.js';

function bearerToken(req: Request): string | null {
  const h = req.header('authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)\s*$/i.exec(h);
  return m?.[1] ?? null;
}

async function requireSession(req: Request, res: Response): Promise<string | null> {
  const sid = bearerToken(req);
  if (!sid || !(await getSession(sid))) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return sid;
}

export function applySyncRoutes(app: Express): void {
  app.get('/api/sync/backup', async (req: Request, res: Response) => {
    const sid = await requireSession(req, res);
    if (!sid) return;
    try {
      const raw = await readBackupFromDrive(sid);
      res.type('application/json').send(raw);
    } catch (e) {
      if (e instanceof Error && (e as any).code === 'BACKUP_NOT_FOUND') {
        res.status(404).json({ error: 'Backup not found' });
        return;
      }
      const msg = e instanceof Error ? e.message : 'Drive read failed';
      res.status(500).json({ error: msg });
    }
  });

  app.put(
    '/api/sync/backup',
    async (req: Request, res: Response) => {
      const sid = await requireSession(req, res);
      if (!sid) return;
      try {
        await writeBackupToDrive(sid, JSON.stringify(req.body));
        res.status(204).send();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Drive write failed';
        res.status(500).json({ error: msg });
      }
    }
  );
}
