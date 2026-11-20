import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../server/app.js';

const frontendOrigin = 'http://localhost:5173';
let server;
let baseUrl;
let store;

beforeEach(async () => {
  const rows = [];
  store = {
    list: vi.fn(async (forum) => rows.filter((row) => row.forum === forum).map((row) => row.message)),
    insert: vi.fn(async (forum, message) => {
      rows.push({ forum, message });
      return message;
    }),
  };
  server = createApp({ store, frontendOrigin }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api/messages`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => {
    if (error) reject(error);
    else resolve();
  }));
  vi.restoreAllMocks();
});

function post(forum, body) {
  return fetch(`${baseUrl}/${forum}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('forum REST API', () => {
  it('returns an empty array for a valid forum with no messages', async () => {
    const response = await fetch(`${baseUrl}/nasa`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it('persists normalized input with a server UUID and timestamp and reads it by forum', async () => {
    const response = await post('nasa', {
      author: '  Lan ', text: '\n Launch  ', id: 'client', timestamp: '1970-01-01', forum: 'notNasa',
    });
    expect(response.status).toBe(201);
    const saved = await response.json();
    expect(saved).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
      author: 'Lan',
      text: 'Launch',
      timestamp: expect.any(String),
    });
    expect(new Date(saved.timestamp).toISOString()).toBe(saved.timestamp);
    expect(Math.abs(Date.now() - Date.parse(saved.timestamp))).toBeLessThan(5000);
    expect(store.insert).toHaveBeenCalledExactlyOnceWith('nasa', expect.objectContaining({ id: saved.id }));
    expect(await (await fetch(`${baseUrl}/nasa`)).json()).toEqual([saved]);
  });

  it('keeps messages isolated across all three forums', async () => {
    const forums = ['nasa', 'esports-tribunal', 'notNasa'];
    for (const forum of forums) {
      expect((await post(forum, { author: 'Lan', text: forum })).status).toBe(201);
    }
    for (const forum of forums) {
      const messages = await (await fetch(`${baseUrl}/${forum}`)).json();
      expect(messages.map(({ text }) => text)).toEqual([forum]);
    }
  });

  it.each([
    null,
    [],
    {},
    { author: 'Lan' },
    { author: 42, text: 'Launch' },
    { author: 'Lan', text: { words: 'Launch' } },
    { author: '\t ', text: 'Launch' },
    { author: 'Lan', text: '\n ' },
  ].map((payload) => [payload]))('rejects invalid payload %j', async (payload) => {
    const response = await post('nasa', payload);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(store.insert).not.toHaveBeenCalled();
  });

  it('responds with a JSON error for malformed JSON', async () => {
    const response = await fetch(`${baseUrl}/nasa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"author":',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(store.insert).not.toHaveBeenCalled();
  });

  it('returns 404 on both methods for an unknown forum, even with an invalid POST body', async () => {
    const get = await fetch(`${baseUrl}/NotNasa`);
    const create = await post('NotNasa', null);
    for (const response of [get, create]) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Unknown forum.' });
    }
    expect(store.list).not.toHaveBeenCalled();
    expect(store.insert).not.toHaveBeenCalled();
  });

  it('allows only the configured browser origin', async () => {
    for (const origin of [frontendOrigin, 'http://other.example']) {
      const response = await fetch(`${baseUrl}/nasa`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin, 'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      if (origin === frontendOrigin) {
        expect(response.status).toBe(204);
        expect(response.headers.get('access-control-allow-origin')).toBe(frontendOrigin);
      } else {
        expect(response.headers.get('access-control-allow-origin')).toBeNull();
      }
    }
  });

  it('returns a JSON 500 for storage errors', async () => {
    store.list.mockRejectedValueOnce(new Error('database unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await fetch(`${baseUrl}/nasa`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Unable to process the request.' });
    expect(console.error).toHaveBeenCalled();
  });
});
