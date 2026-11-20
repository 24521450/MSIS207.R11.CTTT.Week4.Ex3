import { Fragment, useState } from 'react';
import { FORUMS } from '../shared/forum.js';
import { useForumMessages } from './useForumMessages.js';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function MessageForm({ postMessage }) {
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPosting(true);
    setError(null);

    try {
      await postMessage({ author: fields.get('author'), text: fields.get('text') });
      form.reset();
    } catch (error) {
      setError(error);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-heading">
      <h2 id="composer-heading">Post a message</h2>
      <form onSubmit={submit}>
        <fieldset disabled={posting}>
          <label>
            Display name
            <input name="author" autoComplete="nickname" required />
          </label>
          <label>
            Message
            <textarea name="text" rows="3" required />
          </label>
          {error && <p className="error" role="alert">{error.message}</p>}
          <button type="submit" className="submit">{posting ? 'Posting…' : 'Post message'}</button>
        </fieldset>
      </form>
    </section>
  );
}

export default function App() {
  const [forumId, setForumId] = useState(FORUMS[0]);
  const { data, loading, error, postMessage } = useForumMessages(forumId);

  return (
    <>
      <header className="site-header"><h1>Forum messages</h1></header>
      <div className="layout">
        <nav aria-label="Forums">
          <h2>Channels</h2>
          {FORUMS.map((forum) => (
            <button
              type="button"
              key={forum}
              aria-pressed={forum === forumId}
              onClick={() => setForumId(forum)}
            >
              {forum}
            </button>
          ))}
        </nav>
        <main>
          <h2 className="channel-heading">{forumId}</h2>
          <section className="messages" aria-label="Messages" aria-busy={loading}>
            {loading && <p role="status">Loading messages…</p>}
            {error && <p className="error" role="alert">{error.message}</p>}
            {!loading && !error && data.length === 0 && <p>No messages yet.</p>}
            {data.length > 0 && (
              <dl>
                {data.map((message) => (
                  <Fragment key={message.id}>
                    <dt>
                      {message.author}
                      <time dateTime={message.timestamp}>{dateFormat.format(new Date(message.timestamp))}</time>
                    </dt>
                    <dd>{message.text}</dd>
                  </Fragment>
                ))}
              </dl>
            )}
          </section>
          <MessageForm key={forumId} postMessage={postMessage} />
        </main>
      </div>
    </>
  );
}
