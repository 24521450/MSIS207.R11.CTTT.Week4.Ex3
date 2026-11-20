// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useForumMessages } from '../src/useForumMessages.js';

const nasa = { id: 'nasa-1', author: 'Lan', text: 'Orbit', timestamp: '2026-11-20T08:00:00.000Z' };
const esports = { ...nasa, id: 'esports-1', text: 'Final round' };
const notNasa = { ...nasa, id: 'other-1', text: 'Community news' };
const fetchMock = vi.fn();

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

function renderForum(forum = 'nasa') {
  return renderHook(({ forumId }) => useForumMessages(forumId), {
    initialProps: { forumId: forum },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useForumMessages', () => {
  it('starts loading, fetches the selected forum and exposes the messages', async () => {
    const pending = Promise.withResolvers();
    fetchMock.mockReturnValueOnce(pending.promise);
    const { result } = renderForum();
    expect(result.current).toMatchObject({ data: [], loading: true, error: null });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/messages\/nasa$/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await act(async () => pending.resolve(response([nasa])));
    expect(result.current).toMatchObject({ data: [nasa], loading: false, error: null });
  });

  it('aborts superseded requests and ignores late success and failure after the final forum loads', async () => {
    const first = Promise.withResolvers();
    const second = Promise.withResolvers();
    const last = Promise.withResolvers();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(last.promise);
    const { result, rerender } = renderForum();

    rerender({ forumId: 'esports-tribunal' });
    rerender({ forumId: 'notNasa' });
    const signals = fetchMock.mock.calls.map(([, options]) => options.signal);
    expect(new Set(signals).size).toBe(3);
    expect(signals.map(({ aborted }) => aborted)).toEqual([true, true, false]);

    await act(async () => last.resolve(response([notNasa])));
    await act(async () => {
      second.reject(new TypeError('Late network error'));
      first.resolve(response([nasa]));
    });
    expect(result.current).toMatchObject({ data: [notNasa], loading: false, error: null });
  });

  it('clears earlier data on switch and aborts the current GET on unmount', async () => {
    fetchMock.mockResolvedValueOnce(response([nasa])).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender, unmount } = renderForum();
    await waitFor(() => expect(result.current.data).toEqual([nasa]));
    rerender({ forumId: 'esports-tribunal' });
    expect(result.current).toMatchObject({ data: [], loading: true, error: null });
    const signal = fetchMock.mock.calls[1][1].signal;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('reports a network failure and clears it when a different forum loads', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(response([notNasa]));
    const { result, rerender } = renderForum();
    await waitFor(() => expect(result.current.error?.message).toBe('Could not reach the forum API.'));
    expect(result.current.loading).toBe(false);
    rerender({ forumId: 'notNasa' });
    await waitFor(() => expect(result.current).toMatchObject({ data: [notNasa], loading: false, error: null }));
  });

  it('reports the JSON error from a failed API response', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'Unable to process the request.' }, 500));
    const { result } = renderForum();
    await waitFor(() => expect(result.current.error?.message).toBe('Unable to process the request.'));
    expect(result.current).toMatchObject({ data: [], loading: false });
  });

  it('rejects invalid POST input without making a request', async () => {
    fetchMock.mockResolvedValueOnce(response([]));
    const { result } = renderForum();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.postMessage({ author: 'Lan', text: ' ' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POSTs trimmed fields to the active forum and merges an overlapping GET by ID', async () => {
    const pendingGet = Promise.withResolvers();
    fetchMock.mockReturnValueOnce(pendingGet.promise).mockResolvedValueOnce(response(nasa, 201));
    const { result } = renderForum();
    await act(async () => {
      await expect(result.current.postMessage({ author: ' Lan ', text: ' Orbit ' })).resolves.toEqual(nasa);
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/messages\/nasa$/),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'Lan', text: 'Orbit' }),
      },
    );
    expect(result.current.data).toEqual([nasa]);

    await act(async () => pendingGet.resolve(response([nasa])));
    expect(result.current).toMatchObject({ data: [nasa], loading: false, error: null });
  });

  it('preserves a newly posted message when a pending GET returns an older snapshot', async () => {
    const pendingGet = Promise.withResolvers();
    fetchMock.mockReturnValueOnce(pendingGet.promise).mockResolvedValueOnce(response(nasa, 201));
    const { result } = renderForum();
    await act(async () => { await result.current.postMessage({ author: 'Lan', text: 'Orbit' }); });
    await act(async () => pendingGet.resolve(response([])));
    expect(result.current).toMatchObject({ data: [nasa], loading: false, error: null });
  });

  it('does not append a late POST result after switching forums', async () => {
    const pendingPost = Promise.withResolvers();
    fetchMock
      .mockResolvedValueOnce(response([]))
      .mockReturnValueOnce(pendingPost.promise)
      .mockResolvedValueOnce(response([esports]));
    const { result, rerender } = renderForum();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const posting = result.current.postMessage({ author: 'Lan', text: 'Orbit' });
    rerender({ forumId: 'esports-tribunal' });
    await waitFor(() => expect(result.current.data).toEqual([esports]));
    await act(async () => {
      pendingPost.resolve(response(nasa, 201));
      await expect(posting).resolves.toEqual(nasa);
    });
    expect(result.current).toMatchObject({ data: [esports], loading: false, error: null });
  });

  it('rejects a failed POST without changing the message list', async () => {
    fetchMock.mockResolvedValueOnce(response([nasa])).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderForum();
    await waitFor(() => expect(result.current.data).toEqual([nasa]));
    await expect(result.current.postMessage({ author: 'Lan', text: 'Another message' }))
      .rejects.toThrow('Could not reach the forum API.');
    expect(result.current.data).toEqual([nasa]);
  });
});
