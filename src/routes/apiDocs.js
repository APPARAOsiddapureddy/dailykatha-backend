import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manualPaths = {
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Liveness probe',
      responses: { 200: { description: 'OK' } },
    },
  },
  '/status': {
    get: {
      tags: ['System'],
      summary: 'Process status',
      responses: { 200: { description: 'OK' } },
    },
  },
  '/api/v1/quotes': {
    get: {
      tags: ['Quotes'],
      summary: 'List quotes',
      parameters: [
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'mood', in: 'query', schema: { type: 'string' } },
        { name: 'section', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
      ],
      responses: { 200: { description: 'Paginated quotes' } },
    },
  },
  '/api/v1/quotes/random': {
    get: {
      tags: ['Quotes'],
      summary: 'Random quote',
      responses: { 200: { description: 'Random quote' }, 404: { description: 'No quotes' } },
    },
  },
  '/api/v1/quotes/daily': {
    get: {
      tags: ['Quotes'],
      summary: 'Quote of the day',
      responses: { 200: { description: 'Daily quote' }, 404: { description: 'No quotes' } },
    },
  },
  '/api/v1/quotes/{id}': {
    get: {
      tags: ['Quotes'],
      summary: 'Quote by id',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'Quote' },
        404: { description: 'Not found' },
      },
    },
  },
  '/api/v1/categories': {
    get: {
      tags: ['Quotes'],
      summary: 'Distinct categories',
      responses: { 200: { description: 'Category list' } },
    },
  },
  '/api/v1/moods': {
    get: {
      tags: ['Quotes'],
      summary: 'Distinct moods',
      responses: { 200: { description: 'Mood list' } },
    },
  },
  '/api/v1/search': {
    get: {
      tags: ['Quotes'],
      summary: 'Search quotes (multilingual text fields)',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'offset', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { 200: { description: 'Search results' }, 400: { description: 'Invalid query' } },
    },
  },
  '/api/v1/favorites': {
    get: {
      tags: ['Favorites'],
      summary: 'List favorites for authenticated user',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Quotes' }, 401: { description: 'Unauthorized' } },
    },
    post: {
      tags: ['Favorites'],
      summary: 'Add favorite',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['quote_id'], properties: { quote_id: { type: 'integer' } } },
          },
        },
      },
      responses: {
        200: { description: 'Already favorited' },
        201: { description: 'Created' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/favorites/{quote_id}': {
    delete: {
      tags: ['Favorites'],
      summary: 'Remove favorite',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'quote_id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        204: { description: 'Removed' },
        401: { description: 'Unauthorized' },
        404: { description: 'Not found' },
      },
    },
  },
};

export function mountApiDocs(app) {
  const definition = {
    openapi: '3.0.0',
    info: { title: 'Daily Katha API', version: env.version },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  };

  const spec = swaggerJSDoc({
    definition,
    apis: [path.join(__dirname, '**', '*.js'), path.join(__dirname, '..', 'controllers', '**', '*.js')],
  });

  spec.paths = { ...manualPaths, ...(spec.paths || {}) };

  app.get('/daily-katha-api.swagger.json', (_req, res) => res.json(spec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}
