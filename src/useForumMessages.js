import { useEffect, useState } from 'react';
import { createMessage, getMessages } from './forum-api.js';

function startLoading(forumId) {
  return { forumId, data: [], loading: true, error: null };
}

function mergeMessages(first, second) {
  const messages = new Map(first.map((message) => [message.id, message]));
  for (const message of second) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function useForumMessages(forumId) {
  const [state, setState] = useState(() => startLoading(forumId));

  // Reset before this render commits, so a channel change never paints the old list.
  const visible = state.forumId === forumId ? state : startLoading(forumId);
  if (visible !== state) setState(visible);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      let outcome;
      try {
        outcome = { data: await getMessages(forumId, controller.signal) };
      } catch (error) {
        outcome = { error };
      }

      if (controller.signal.aborted) return;
      setState((current) => {
        if (current.forumId !== forumId || controller.signal.aborted) return current;
        return {
          ...current,
          data: outcome.data ? mergeMessages(outcome.data, current.data) : current.data,
          loading: false,
          error: outcome.error ?? null,
        };
      });
    }

    void load();
    return () => controller.abort();
  }, [forumId]);

  async function postMessage(payload) {
    const saved = await createMessage(forumId, payload);
    setState((current) => (
      current.forumId === forumId
        ? { ...current, data: mergeMessages(current.data, [saved]) }
        : current
    ));
    return saved;
  }

  return { data: visible.data, loading: visible.loading, error: visible.error, postMessage };
}
