import { Router } from 'express';
import { parseAdHandler } from 'controllers/ad.controller';
import { parseAdsHandler } from 'controllers/ads.controller';
import { getStatsHandler } from 'controllers/stats.controller';
import { bepaidHandler } from 'controllers/bepaid.controller';

const router = Router();

router.get('/ad', parseAdHandler);
router.get('/ads', parseAdsHandler);
router.get('/stats', getStatsHandler);
router.post('/bepaid', bepaidHandler);

export default router;
