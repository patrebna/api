import { type Request, type Response } from 'express';
import cache from 'services/redis.service';

export async function bepaidHandler(req: Request, res: Response): Promise<void> {
  await cache.sendNotificationToBot('bot_queue_payments', JSON.stringify({ data: req.body }));
  res.status(200).json({ status: 'ok' });
}
