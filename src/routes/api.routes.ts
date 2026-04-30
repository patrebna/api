import { Router } from 'express';
import { getAdDescription } from 'controllers/ad.controller';
import { parseAdsHandler } from 'controllers/ads.controller';
import { getStatsHandler } from 'controllers/stats.controller';
import { bepaidHandler } from 'controllers/bepaid.controller';
import { getAdDetails } from 'controllers/ad.controller';
import {
  getProfileDetails,
  getCurrentSession,
  logout,
  updateTrackedUrlStatus,
  verifyTelegramAuthHandler,
} from 'controllers/auth.controller';

const router = Router();

router.get('/ad/:adId/description', getAdDescription);
router.get('/ad/:adId/details', getAdDetails);
router.get('/ads', parseAdsHandler);
router.get('/stats', getStatsHandler);
router.post('/auth/telegram/verify', verifyTelegramAuthHandler);
router.get('/auth/me', getCurrentSession);
router.get('/auth/profile', getProfileDetails);
router.patch('/auth/profile/url-status', updateTrackedUrlStatus);
router.post('/auth/logout', logout);
router.post('/bepaid', bepaidHandler);

export default router;
