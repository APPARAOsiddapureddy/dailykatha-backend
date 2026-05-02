import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import healthRoutes from './health.js';
import authPublic from './auth.js';
import usersRoutes from './users.js';
import { jwtAuth } from '../middleware/auth.js';
import apiV1Favorites from './api_v1/favorites.js';
import apiV1Quotes from './api_v1/quotes.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(healthRoutes);
router.use('/v1/auth', authLimiter, authPublic);

const v1Authed = Router();
v1Authed.use(jwtAuth);
v1Authed.use('/users', usersRoutes);
router.use('/v1', v1Authed);

router.use('/api/v1', apiV1Quotes);
router.use('/api/v1', apiV1Favorites);

export default router;

