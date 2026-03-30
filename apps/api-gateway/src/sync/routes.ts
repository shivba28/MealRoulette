import type { Express, Request, Response } from 'express';
import { getSession } from '../auth/sessionStore.js';
import { readBackupFromDrive, writeBackupToDrive } from './driveBackup.js';

const SESSION_COOKIE = 'mr_session';

function requireSession(req: Request, res: Response): string | null {
  const sid = req.signedCookies?.[SESSION_COOKIE];
  if (!sid || !getSession(sid)) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return sid;
}

export function applySyncRoutes(app: Express): void {
  app.get('/api/sync/backup', async (req: Request, res: Response) => {
    const sid = requireSession(req, res);
    if (!sid) return;
    try {
      const raw = await readBackupFromDrive(sid);
      res.type('application/json').send(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Drive read failed';
      res.status(500).json({ error: msg });
    }
  });

  app.put(
    '/api/sync/backup',
    async (req: Request, res: Response) => {
      const sid = requireSession(req, res);
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
