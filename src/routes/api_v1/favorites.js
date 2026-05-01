import { Router } from 'express';
import { body, param } from 'express-validator';
import { deleteFavorite, getFavorites, postFavorite } from '../../controllers/favoritesController.js';
import { jwtV1Auth } from '../../middleware/jwtV1Auth.js';
import { validate } from '../../middleware/validation.js';

const router = Router();

router.use(jwtV1Auth);

router.post(
  '/favorites',
  [body('quote_id').isInt({ min: 1 }).toInt()],
  validate,
  postFavorite,
);
router.get('/favorites', getFavorites);
router.delete(
  '/favorites/:quote_id',
  [param('quote_id').isInt({ min: 1 }).toInt()],
  validate,
  deleteFavorite,
);

export default router;
