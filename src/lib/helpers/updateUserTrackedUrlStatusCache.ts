import cache from 'services/redis.service';
import { type CachedUserData } from 'types';

export async function updateUserTrackedUrlStatusCache(
  userId: number,
  url: string,
  status: boolean,
): Promise<boolean> {
  const key = `user:${userId}`;
  const currentTTL = await cache.getTTL(key);
  const cacheUser = await cache.getCache(key);

  if (!cacheUser || currentTTL === -2) {
    return false;
  }

  let userDataFromCache: CachedUserData;

  try {
    userDataFromCache = JSON.parse(cacheUser) as CachedUserData;
  } catch (error) {
    console.error(
      'Не удалось распарсить кеш пользователя для обновления статуса ссылки',
      error,
    );
    return false;
  }

  if (!Array.isArray(userDataFromCache.urls)) {
    return false;
  }

  const index = userDataFromCache.urls.findIndex((item) => item.url === url);

  if (index === -1) {
    return false;
  }

  userDataFromCache.urls[index] = {
    ...userDataFromCache.urls[index],
    isActive: status,
  };

  await cache.setCache(
    key,
    userDataFromCache,
    currentTTL > 0 ? currentTTL : undefined,
  );

  return true;
}
