# Week 4 Ex3 contract

- Use Node.js 24, Express and Mongoose 8 for the API. Use React 19, JavaScript/JSX and Vite for the frontend.
- Both methods use `/api/messages/:forum`. The case-sensitive forum IDs are `nasa`, `esports-tribunal` and `notNasa`.
- GET returns HTTP 200 and an array of `{ id, author, text, timestamp }` records for the selected forum in ascending timestamp order. An empty forum returns `[]`.
- POST takes a JSON object with `author` and `text`. Each field must be a string with content after trimming. The client and API use the same normalizer. The API stores the trimmed fields and generates a UUID via `crypto.randomUUID()` and a timestamp serialized in ISO 8601. It returns HTTP 201 with the stored record. Only these two input fields can affect the stored content.
- Errors use `{ error: string }`. Invalid payloads return HTTP 400 and unknown forum IDs return HTTP 404. Storage failures return HTTP 500. CORS allows the configured frontend origin.
- The API connects to MongoDB using `MONGODB_URI` before listening. Keep real environment files out of Git.
- `useForumMessages(forumId)` exposes `{ data, loading, error, postMessage }`. Each GET gets its own abort signal. Switching forums or unmounting aborts the GET. Late responses and errors cannot change the active forum's state.
- `postMessage({ author, text })` resolves to the saved record or rejects on validation or request failure. The form reports the error for the current forum. Append a successful POST only if the target forum is currently displayed. Merge by ID if a GET overlaps the POST.
- Render the message list with `dl` and one keyed Fragment per record.
