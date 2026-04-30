import 'dotenv/config';
import mongoose from 'mongoose';
import { Db } from 'mongodb';

const MONGODB_HOST = process.env.MONGODB_HOST ?? 'mongodb';

class DatabaseService {
  private readonly url: string;
  constructor() {
    this.url = `mongodb://${MONGODB_HOST}:27017/`;
  }

  async openConnection() {
    const username = process.env.MONGO_INITDB_ROOT_USERNAME ?? '';
    const password = process.env.MONGO_INITDB_ROOT_PASSWORD ?? '';
    const connect = mongoose.connection;
    connect.on('error', console.error.bind(console, 'Ошибка подключения к базе данных:'));
    connect.once('open', () => {
      console.log('Успешное подключение к базе данных.');
    });

    await mongoose.connect(this.url, {
      auth: {
        username,
        password,
      },
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsCertificateKeyFile: './certs/client.pem',
      dbName: 'patrebna',
      authSource: 'admin',
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 120000,
    });
  }

  getDb(): Db {
    if (!mongoose.connection.db) {
      throw new Error('Database not initialized');
    }
    return mongoose.connection.db;
  }

  async getUserStats(userId: number) {
    const [stats] = await this.getDb()
      .collection('users')
      .aggregate([
        { $match: { id: userId } },
        {
          $lookup: {
            from: 'profiles',
            localField: 'profile',
            foreignField: '_id',
            as: 'profile',
          },
        },
        {
          $unwind: {
            path: '$profile',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'premium',
            localField: 'profile.premium',
            foreignField: '_id',
            as: 'premium',
          },
        },
        {
          $unwind: {
            path: '$premium',
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: 'parsers',
            localField: 'parser',
            foreignField: '_id',
            as: 'parser',
          },
        },
        {
          $unwind: {
            path: '$parser',
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: 'dataparsers',
            localField: 'parser.kufar.dataParser',
            foreignField: '_id',
            as: 'dataParser',
          },
        },
        {
          $unwind: {
            path: '$dataParser',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            referralsCount: {
              $size: {
                $ifNull: ['$profile.referrals', []],
              },
            },
            wallet: {
              $ifNull: ['$profile.wallet', 0],
            },
            registrationDate: {
              $ifNull: ['$premium.createdAt', null],
            },
            subscription: {
              $ifNull: ['$premium.status', 'NONE'],
            },
            subscriptionEnd: {
              $ifNull: ['$premium.end_date', null],
            },
            urls: {
              $map: {
                input: {
                  $ifNull: ['$dataParser.urls', []],
                },
                as: 'urlItem',
                in: {
                  url: '$$urlItem.url',
                  adsCount: {
                    $let: {
                      vars: {
                        matchedAdsGroup: {
                          $first: {
                            $filter: {
                              input: {
                                $ifNull: ['$parser.kufar.kufarAds', []],
                              },
                              as: 'adsGroup',
                              cond: {
                                $eq: ['$$adsGroup.urlId', '$$urlItem.urlId'],
                              },
                            },
                          },
                        },
                      },
                      in: {
                        $size: {
                          $ifNull: ['$$matchedAdsGroup.ads', []],
                        },
                      },
                    },
                  },
                  status: '$$urlItem.isActive',
                },
              },
            },
          },
        },
      ])
      .toArray();

    return stats ?? null;
  }

  async setTrackedUrlStatus(userId: number, url: string, status: boolean) {
    const [userData] = await this.getDb()
      .collection('users')
      .aggregate([
        { $match: { id: userId } },
        {
          $lookup: {
            from: 'parsers',
            localField: 'parser',
            foreignField: '_id',
            as: 'parser',
          },
        },
        {
          $unwind: {
            path: '$parser',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 0,
            dataParserId: '$parser.kufar.dataParser',
          },
        },
      ])
      .toArray();

    if (!userData?.dataParserId) {
      return null;
    }

    const updateResult = await this.getDb()
      .collection('dataparsers')
      .updateOne(
        {
          _id: userData.dataParserId,
          'urls.url': url,
        },
        {
          $set: {
            'urls.$.isActive': status,
          },
        },
      );

    if (updateResult.matchedCount === 0) {
      return null;
    }

    return this.getUserStats(userId);
  }
}

const db = new DatabaseService();
export default db;
