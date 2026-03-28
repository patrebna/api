import { Router } from 'express';
import { parseAdHandler } from 'controllers/ad.controller';
import { parseAdsHandler } from 'controllers/ads.controller';

const router = Router();

router.get('/ad', parseAdHandler);
router.get('/ads', parseAdsHandler);

export default router;
