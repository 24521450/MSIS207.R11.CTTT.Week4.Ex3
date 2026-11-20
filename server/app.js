import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { FORUMS, INVALID_MESSAGE, MESSAGE_PATH, normalizeMessage } from '../shared/forum.js';

export function createApp({ store, frontendOrigin }) {
  const app = express();
  app.use(cors({ origin: [frontendOrigin] }));

  const messages = app.route(`${MESSAGE_PATH}/:forum`);

  app.param('forum', (_request, response, next, forum) => {
    if (!FORUMS.includes(forum)) return response.status(404).json({ error: 'Unknown forum.' });
    next();
  });

  messages.get(async (request, response) => {
    response.json(await store.list(request.params.forum));
  });

  messages.post(express.json(), async (request, response) => {
    const payload = normalizeMessage(request.body);
    if (!payload) return response.status(400).json({ error: INVALID_MESSAGE });

    const saved = await store.insert(request.params.forum, {
      ...payload,
      id: randomUUID(),
      timestamp: new Date(),
    });
    response.status(201).json(saved);
  });

  app.use((_request, response) => response.status(404).json({ error: 'Route not found.' }));

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error.status >= 400 && error.status < 500) {
      return response.status(400).json({ error: 'Invalid request.' });
    }
    console.error(`Forum API ${request.method} ${request.path} failed (${error.name}).`);
    response.status(500).json({ error: 'Unable to process the request.' });
  });

  return app;
}
