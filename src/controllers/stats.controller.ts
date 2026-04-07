import db from 'services/mongodb.service';
import { type Response } from 'express';

export async function getStatsHandler(res: Response): Promise<void> {
  try {
    const database = db.getDb();

    const [usersCount, adsCount] = await Promise.all([
      database.collection('users').countDocuments(),
      database.collection('kufarads').countDocuments(),
    ]);

    res.status(200).json({
      usersCount,
      adsCount,
    });
  } catch (error) {
    console.error('Ошибкa при получении статистики:', error);
    res.status(500).json({
      message: 'Внутренняя ошибка сервера',
    });
  }
}
