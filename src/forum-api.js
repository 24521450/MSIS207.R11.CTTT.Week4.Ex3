import { INVALID_MESSAGE, MESSAGE_PATH, normalizeMessage } from '../shared/forum.js';

const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function requestMessages(forumId, options) {
  let response;
  try {
    response = await fetch(`${apiOrigin}${MESSAGE_PATH}/${encodeURIComponent(forumId)}`, options);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Could not reach the forum API.', { cause: error });
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Forum API returned HTTP ${response.status}.`);
  }
  if (body === null) throw new Error('Forum API returned an invalid response.');
  return body;
}

export function getMessages(forumId, signal) {
  return requestMessages(forumId, { signal });
}

export async function createMessage(forumId, payload) {
  const message = normalizeMessage(payload);
  if (!message) throw new Error(INVALID_MESSAGE);

  return requestMessages(forumId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}
