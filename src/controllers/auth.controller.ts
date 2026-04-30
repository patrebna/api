import { type Request, type Response } from 'express';
import { updateUserTrackedUrlStatusCache } from 'lib/helpers/updateUserTrackedUrlStatusCache';
import { type TelegramAuthPayload } from 'types';
import db from 'services/mongodb.service';
import {
  clearSessionCookie,
  createSession,
  createSessionCookie,
  ensureTelegramAuthConfig,
  removeSession,
  readSession,
  verifyTelegramAuth,
} from 'services/auth.service';

function isSecureRequest(req: Request) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function getHostname(req: Request) {
  return req.hostname || 'localhost';
}

export async function verifyTelegramAuthHandler(req: Request, res: Response) {
  try {
    ensureTelegramAuthConfig();
    const session = await verifyTelegramAuth(req.body as TelegramAuthPayload);
    const sessionId = await createSession(session);
    const isSecure = isSecureRequest(req);
    const hostname = getHostname(req);

    res.setHeader('Set-Cookie', createSessionCookie(sessionId, hostname, isSecure));
    res.json({ session });
  } catch (error) {
    console.error('Не удалось проверить Telegram авторизацию', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Не удалось проверить Telegram авторизацию',
    });
  }
}

export async function getCurrentSession(req: Request, res: Response) {
  res.json({
    session: (await readSession(req.headers.cookie)) ?? null,
  });
}

export async function getProfileDetails(req: Request, res: Response) {
  const session = await readSession(req.headers.cookie);

  if (!session) {
    res.status(401).json({ error: 'Пользователь не авторизован' });
    return;
  }

  const stats = await db.getUserStats(session.telegramUser.id);
  res.json({ stats });
}

export async function updateTrackedUrlStatus(req: Request, res: Response) {
  const session = await readSession(req.headers.cookie);

  if (!session) {
    res.status(401).json({ error: 'Пользователь не авторизован' });
    return;
  }

  const { url, status } = req.body as { url?: string; status?: boolean };

  if (!url || typeof status !== 'boolean') {
    res.status(400).json({ error: 'Некорректные параметры url/status' });
    return;
  }

  const stats = await db.setTrackedUrlStatus(session.telegramUser.id, url, status);

  if (!stats) {
    res.status(404).json({ error: 'Ссылка для обновления не найдена' });
    return;
  }

  try {
    await updateUserTrackedUrlStatusCache(session.telegramUser.id, url, status);
  } catch (error) {
    console.error('Не удалось обновить кеш пользователя после смены статуса ссылки', error);
  }

  res.json({ stats });
}

export async function logout(req: Request, res: Response) {
  const isSecure = isSecureRequest(req);
  const hostname = getHostname(req);
  await removeSession(req.headers.cookie);

  res.setHeader('Set-Cookie', clearSessionCookie(hostname, isSecure));
  res.status(204).send();
}
