import { HttpError } from '../utils/errorHandler.js';
import { mapQuoteRow } from './quoteControllerHelpers.js';
import * as Favorite from '../models/Favorite.js';

function userId(req) {
  const sub = req.user?.sub;
  if (sub == null || sub === '') throw new HttpError(401, 'UNAUTHORIZED', 'Invalid token payload');
  const id = typeof sub === 'number' ? sub : Number.parseInt(String(sub), 10);
  if (Number.isNaN(id)) throw new HttpError(401, 'UNAUTHORIZED', 'Invalid token payload');
  return id;
}

export async function postFavorite(req, res, next) {
  try {
    const uid = userId(req);
    const quoteId = req.body.quote_id;
    const created = await Favorite.addFavorite(uid, quoteId);
    return res.status(created ? 201 : 200).json({ ok: true, quote_id: quoteId, created });
  } catch (e) {
    return next(e);
  }
}

export async function getFavorites(req, res, next) {
  try {
    const uid = userId(req);
    const rows = await Favorite.listFavorites(uid);
    return res.json({ quotes: rows.map(mapQuoteRow) });
  } catch (e) {
    return next(e);
  }
}

export async function deleteFavorite(req, res, next) {
  try {
    const uid = userId(req);
    const quoteId = Number.parseInt(String(req.params.quote_id), 10);
    const removed = await Favorite.removeFavorite(uid, quoteId);
    if (!removed) throw new HttpError(404, 'NOT_FOUND', 'Favorite not found');
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
}
