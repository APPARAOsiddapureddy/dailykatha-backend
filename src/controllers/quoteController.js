import { DEFAULT_LIMIT, MAX_LIMIT } from '../config/constants.js';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { HttpError } from '../utils/errorHandler.js';
import {
  getQuoteById,
  listCategories,
  listMoods,
  listQuotes,
  randomQuote,
  searchQuotes,
} from '../models/Quote.js';
import { mapQuoteRow } from './quoteControllerHelpers.js';

function normalizeLimit(raw) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function normalizeOffset(raw) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

export async function getQuotes(req, res, next) {
  try {
    const category = req.query.category ? String(req.query.category) : null;
    const mood = req.query.mood ? String(req.query.mood) : null;
    const section = req.query.section ? String(req.query.section) : null;
    const limit = normalizeLimit(req.query.limit);
    const offset = normalizeOffset(req.query.offset);

    const cacheKey = `quotes:v1:${category || ''}:${mood || ''}:${section || ''}:${limit}:${offset}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const { total, rows } = await listQuotes({ category, mood, section, limit, offset });
    const body = {
      total,
      quotes: rows.map(mapQuoteRow),
      hasMore: offset + rows.length < total,
    };
    await cacheSet(cacheKey, JSON.stringify(body), 3600);
    return res.json(body);
  } catch (e) {
    return next(e);
  }
}

export async function getQuote(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid quote id');
    const q = await getQuoteById(id);
    if (!q) throw new HttpError(404, 'NOT_FOUND', 'Quote not found');
    return res.json({ quote: mapQuoteRow(q) });
  } catch (e) {
    return next(e);
  }
}

export async function getRandomQuote(req, res, next) {
  try {
    const category = req.query.category ? String(req.query.category) : null;
    const mood = req.query.mood ? String(req.query.mood) : null;
    const section = req.query.section ? String(req.query.section) : null;
    const q = await randomQuote({ category, mood, section });
    if (!q) throw new HttpError(404, 'NOT_FOUND', 'No quotes found');
    return res.json({ quote: mapQuoteRow(q) });
  } catch (e) {
    return next(e);
  }
}

export async function getDailyQuote(_req, res, next) {
  try {
    const key = `quotes:daily:v1:${new Date().toISOString().slice(0, 10)}`;
    const cached = await cacheGet(key);
    if (cached) return res.json(JSON.parse(cached));
    const q = await randomQuote({ category: null, mood: null, section: null });
    if (!q) throw new HttpError(404, 'NOT_FOUND', 'No quotes found');
    const body = { quote: mapQuoteRow(q) };
    await cacheSet(key, JSON.stringify(body), 60 * 60 * 24);
    return res.json(body);
  } catch (e) {
    return next(e);
  }
}

export async function getCategories(_req, res, next) {
  try {
    const categories = await listCategories();
    return res.json({ categories });
  } catch (e) {
    return next(e);
  }
}

export async function getMoods(_req, res, next) {
  try {
    const moods = await listMoods();
    return res.json({ moods });
  } catch (e) {
    return next(e);
  }
}

export async function search(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) throw new HttpError(400, 'INVALID_QUERY', 'q must be at least 2 characters');
    const limit = normalizeLimit(req.query.limit);
    const offset = normalizeOffset(req.query.offset);
    const { total, rows } = await searchQuotes({ q, limit, offset });
    return res.json({
      results: rows.map(mapQuoteRow),
      total,
      hasMore: offset + rows.length < total,
    });
  } catch (e) {
    return next(e);
  }
}

