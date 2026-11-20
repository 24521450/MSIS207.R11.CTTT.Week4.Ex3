# Failure audit

| Observed failure | Correction | Verification |
| --- | --- | --- |
| The interrupted checkout had the expected GitHub origin and zero refs. `git symbolic-ref HEAD` reported `fatal: No such ref: HEAD`. | Ran `git symbolic-ref HEAD refs/heads/main` inside the checkout. | `git status --short --branch` reported `No commits yet on main` before implementation. |
| Before implementation, the API scaffold returned 404 for valid GET and POST routes. The hook scaffold never called fetch. The red run had 15 failing API tests and 10 failing hook tests. | Added the Express routes, shared validation, MongoDB store and cancellable React hook. | The same two test files passed with 25 tests. |
| A dependency install reported `ETARGET` for `proxy-addr@^2.0.8` with cached registry metadata. | Refreshed the package metadata from the registry and reran the install. | The lockfile resolved the dependency. A subsequent `npm ci` succeeded. |
| The dependency audit flagged installed `body-parser` and `qs` versions. | Ran `npm audit fix` to update the affected lockfile entries. | The following clean install reported zero vulnerabilities. Lint, tests and build passed. |
| ESLint stopped with a missing `react-hooks` plugin error when loading its recommended rules. | Registered the plugin in the flat config object that applies those rules. | `npm run lint` exited successfully. |
| The installed Docker CLI could not connect to a running Docker daemon. | Ran MongoDB Community 8.0.19 directly from the Windows distribution using a disposable data directory. | A second API process returned the same persisted records. [MongoDB restart evidence](evidence/mongodb-restart.json) |
| With a real MongoDB instance deliberately stopped, the next GET raised `MongoServerSelectionError` in the API. | The API handler logged the failure and returned a JSON 500. The hook ended loading and reported the error in the active channel. | Chrome captured HTTP 500, the API error log and the visible alert. [CDP evidence](evidence/browser-cdp.json) |

The out-of-order regression test resolves the final GET first, then delivers a late response and a late network rejection from the canceled GETs. It checks that neither changes the selected forum's data, error or loading state. Chrome independently recorded both superseded requests as canceled under simulated Slow 3G.
