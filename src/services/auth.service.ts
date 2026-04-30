import crypto from 'crypto';
import cache from 'services/redis.service';

const {
  AUTH_COOKIE_DOMAIN = '',
  TELEGRAM_BOT_TOKEN = '',
} = process.env;

const TELEGRAM_AUTH_MAX_AGE_SECONDS = 15 * 60;
const SESSION_COOKIE_NAME = 'patrebna_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type TelegramUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  authDate: string;
};

export type AuthSession = {
  telegramUser: TelegramUser;
  profile: null;
};

export type TelegramAuthPayload = {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rest] = part.trim().split('=');

    if (!rawName) {
      return acc;
    }

    acc[rawName] = rest.join('=');
    return acc;
  }, {});
}

function resolveCookieDomain(hostname: string) {
  if (AUTH_COOKIE_DOMAIN) {
    return AUTH_COOKIE_DOMAIN;
  }

  if (hostname.endsWith('.patrebna.by') || hostname === 'patrebna.by') {
    return '.patrebna.by';
  }

  return undefined;
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    path?: string;
    httpOnly?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
    secure?: boolean;
    maxAge?: number;
    domain?: string;
  },
) {
  const parts = [`${name}=${value}`];

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    parts.push('Secure');
  }
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  return parts.join('; ');
}

function normalizePayload(payload: TelegramAuthPayload) {
  return {
    id: String(payload.id),
    first_name: payload.first_name,
    last_name: payload.last_name,
    username: payload.username,
    photo_url: payload.photo_url,
    auth_date: String(payload.auth_date),
    hash: payload.hash,
  };
}

function buildDataCheckString(payload: ReturnType<typeof normalizePayload>) {
  return Object.entries(payload)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

function verifyTelegramHash(payload: ReturnType<typeof normalizePayload>) {
  const dataCheckString = buildDataCheckString(payload);
  const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
  const signature = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(payload.hash));
}

export function ensureTelegramAuthConfig() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN обязателен для Telegram авторизации');
  }
}

export async function verifyTelegramAuth(payload: TelegramAuthPayload) {
  ensureTelegramAuthConfig();
  const normalizedPayload = normalizePayload(payload);

  if (!verifyTelegramHash(normalizedPayload)) {
    throw new Error('Hash Telegram авторизации не прошел проверку');
  }

  const authDateTimestamp = Number(normalizedPayload.auth_date);

  if (!Number.isFinite(authDateTimestamp)) {
    throw new Error('Некорректный auth_date от Telegram');
  }

  const authAgeSeconds = Math.floor(Date.now() / 1000) - authDateTimestamp;

  if (authAgeSeconds < 0 || authAgeSeconds > TELEGRAM_AUTH_MAX_AGE_SECONDS) {
    throw new Error('Telegram авторизация устарела, попробуйте войти заново');
  }

  const telegramUser: TelegramUser = {
    id: Number(normalizedPayload.id),
    firstName: normalizedPayload.first_name,
    lastName: normalizedPayload.last_name,
    username: normalizedPayload.username,
    photoUrl: normalizedPayload.photo_url,
    authDate: new Date(authDateTimestamp * 1000).toISOString(),
  };

  return {
    telegramUser,
    profile: null,
  } satisfies AuthSession;
}

function getSessionKey(sessionId: string) {
  return `session:${sessionId}`;
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(session: AuthSession) {
  const sessionId = generateSessionId();
  await cache.setCache(getSessionKey(sessionId), session, SESSION_MAX_AGE_SECONDS);
  return sessionId;
}

export function createSessionCookie(sessionId: string, hostname: string, isSecure: boolean) {
  return serializeCookie(SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecure,
    maxAge: SESSION_MAX_AGE_SECONDS,
    domain: resolveCookieDomain(hostname),
  });
}

export function clearSessionCookie(hostname: string, isSecure: boolean) {
  return serializeCookie(SESSION_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecure,
    maxAge: 0,
    domain: resolveCookieDomain(hostname),
  });
}

function getSessionIdFromCookies(cookieHeader?: string) {
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export async function readSession(cookieHeader?: string) {
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) {
    return null;
  }

  const rawSession = await cache.getCache(getSessionKey(sessionId));

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch (error) {
    console.error('Не удалось распарсить сессию пользователя из Redis', error);
    return null;
  }
}

export async function removeSession(cookieHeader?: string) {
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) {
    return;
  }

  await cache.removeCache(getSessionKey(sessionId));
}
