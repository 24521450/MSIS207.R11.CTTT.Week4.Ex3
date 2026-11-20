# Week 4 Ex3 · Forum messages

Switch among `nasa`, `esports-tribunal` and `notNasa` to read or post messages. React 19 and Vite serve the UI. Express and Mongoose 8 store messages in MongoDB.

## Run locally

Install Node.js 24 and [MongoDB Community Server](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-windows-zip/). If MongoDB is already running locally on port 27017, use that instance. To start it manually, put `mongod` on your PATH and run these PowerShell commands in a separate terminal.

```powershell
$forumDb = Join-Path $env:LOCALAPPDATA 'week4-ex3-mongodb'
New-Item -ItemType Directory -Force -Path $forumDb | Out-Null
mongod --bind_ip 127.0.0.1 --port 27017 --dbpath $forumDb
```

From the project directory, copy the example configuration and start the API.

```powershell
Copy-Item .env.example .env
npm ci
npm run api
```

In another terminal, run `npm run dev` and open [http://localhost:5173](http://localhost:5173). The API listens on port 3001 by default. If you change ports or origins, update `PORT`, `FRONTEND_ORIGIN` and `VITE_API_URL` as applicable. Vite reads `VITE_API_URL` at startup or build time. The API reads `MONGODB_URI` from the environment or the local `.env` file.

## API

| Method | Path | Success |
| --- | --- | --- |
| GET | `/api/messages/:forum` | 200 with the forum's messages |
| POST | `/api/messages/:forum` | 201 with the saved record |

```powershell
Invoke-RestMethod http://localhost:3001/api/messages/nasa
Invoke-RestMethod http://localhost:3001/api/messages/nasa -Method Post -ContentType 'application/json' -Body '{"author":"Lan","text":"Launch update"}'
```

The API trims both fields and sets each record's UUID and timestamp. A bad payload returns 400. An unknown forum returns 404. See [project-rules.md](project-rules.md) for the full contract.

## Verification

| Command | Result on Node.js 24.15.0 |
| --- | --- |
| `npm ci` | Passed from the committed lockfile |
| `npm run lint` | Passed |
| `npm test` | 25 passed across two files |
| `npm run build` | Passed and produced `dist/` |

The HTTP tests use an isolated in-process store to exercise the routes. A separate run against MongoDB Community 8.0.19 posted one distinct message per channel, restarted the API with the same database and read back all three records with identical IDs, timestamps and content. [MongoDB restart evidence](evidence/mongodb-restart.json).

The Chrome CDP run used the production build through Vite preview. It applied the Slow 3G equivalent of 2,000 ms latency and 50,000 bytes/s in each direction, then rapidly selected `esports-tribunal`, `nasa` and `notNasa`. The first two GETs emitted `Network.loadingFailed` with `canceled: true` and `net::ERR_ABORTED`. The last GET returned 200 and the list showed only `notNasa` content. The form submitted a POST and displayed the saved message. After the disposable MongoDB process stopped, the running API returned HTTP 500 and the page displayed its error. [Chrome network events, UI state and API log](evidence/browser-cdp.json). [Chromium throttling presets](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/sdk/NetworkManager.ts).

To repeat the browser check, open DevTools Network, enable Disable cache and select the 3G preset or apply the settings above via CDP. Post a distinct message in each forum. Start on `nasa`, then switch through the three channels while each previous GET is pending. Check for two canceled requests and compare the final list with the last channel's GET. To reproduce the HTTP 500, stop a disposable local MongoDB instance while its API is still running, then switch channels.

All requested checks were completed. The browser run used CDP in headless Chrome.
