export const FORUMS = Object.freeze(['nasa', 'esports-tribunal', 'notNasa']);
export const MESSAGE_PATH = '/api/messages';
export const INVALID_MESSAGE = 'Author and text must be non-empty strings.';

export function normalizeMessage(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const { author, text } = payload;
  if (typeof author !== 'string' || typeof text !== 'string') return null;

  const message = { author: author.trim(), text: text.trim() };
  return message.author && message.text ? message : null;
}
