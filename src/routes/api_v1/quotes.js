import { Router } from 'express';
import { query as v } from 'express-validator';
import {
  getCategories,
  getDailyQuote,
  getMoods,
  getQuote,
  getQuotes,
  getRandomQuote,
  search,
} from '../../controllers/quoteController.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

router.get(
  '/quotes',
  [
    v('category').optional().isString().isLength({ min: 1, max: 50 }),
    v('mood').optional().isString().isLength({ min: 1, max: 50 }),
    v('section').optional().isString().isLength({ min: 1, max: 50 }),
    v('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    v('offset').optional().isInt({ min: 0, max: 10_000 }).toInt(),
  ],
  validate,
  getQuotes,
);

router.get('/quotes/random', getRandomQuote);
router.get('/quotes/daily', getDailyQuote);
router.get('/quotes/:id', getQuote);

router.get('/categories', getCategories);
router.get('/moods', getMoods);

router.get(
  '/search',
  [
    v('q').trim().isLength({ min: 2, max: 200 }),
    v('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    v('offset').optional().isInt({ min: 0, max: 10_000 }).toInt(),
  ],
  validate,
  search,
);

export default router;

