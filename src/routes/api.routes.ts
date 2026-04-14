import { Router } from 'express';
import { getAdDescription } from 'controllers/ad.controller';
import { parseAdsHandler } from 'controllers/ads.controller';
import { getStatsHandler } from 'controllers/stats.controller';
import { bepaidHandler } from 'controllers/bepaid.controller';
import { getAdDetails } from 'controllers/ad.controller';

const router = Router();

router.get('/:adId/description', getAdDescription);
router.get('/:adId/details', getAdDetails);
router.get('/ads', parseAdsHandler);
router.get('/stats', getStatsHandler);
router.post('/bepaid', bepaidHandler);

export default router;
