import { Router } from 'express';
import healthRoutes from './health.js';
import apiV1Favorites from './api_v1/favorites.js';
import apiV1Quotes from './api_v1/quotes.js';

const router = Router();

router.use(healthRoutes);
router.use('/api/v1', apiV1Quotes);
router.use('/api/v1', apiV1Favorites);

export default router;

