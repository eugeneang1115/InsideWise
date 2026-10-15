# KerjaInside

Anonymous workplace reviews for Malaysian companies. Readers find companies on a map, read and compare
reviews; current and former employees post reviews without their name. English, Bahasa Malaysia and
Simplified Chinese. Web and Android from one codebase.

No recruitment, job listings, employer tools, payments or paid rating changes, by design.

| Folder | What it is |
|---|---|
| `server/` | API: Node 22, Fastify, PostgreSQL. Serves the built web app in production. |
| `web/` | React + Vite app built from the design handoff. Leaflet map with clustering. |
| `web/android/` | Android app (Capacitor 8) wrapping the same web UI. |
| `docs/design/` | The original design handoff, with its single-file prototype fixed. |
| `docs/DECISIONS.md` | Choices made while building, and what is still open. |

## Run it locally

Needs Node 22+ and PostgreSQL 16 (`docker compose up -d db` starts one).

```sh
npm ci
cp .env.example .env            # then edit; set MODERATOR_EMAILS to your own email
export $(grep -v '^#' .env | xargs)
npm run migrate -w server
npm run seed:demo -w server     # optional: 9 fictional companies with sample reviews, marked DEMO
npm run dev:server              # API on :8787
npm run dev:web                 # web on :5173, proxies /api to :8787
```

Register in the app with an address listed in `MODERATOR_EMAILS` to see the Moderation screen.

Load a real company directory with `npm run import:companies -w server -- companies.json`, using the
format in `server/seed/demo-companies.json`. Imported companies are not marked as demo data.

## Tests

```sh
npm test                        # API tests; needs TEST_DATABASE_URL or the default local database
npm run build
WEB_DIST=$PWD/web/dist MODERATOR_EMAILS=mod@example.test node server/dist/index.js &
cd web && npx playwright test   # end-to-end, desktop and Pixel 7 sizes
```

CI (`.github/workflows/ci.yml`) runs both against a Postgres service and builds a debug APK.

## Deploy

`docker build -t kerjainside .` produces one image that runs migrations on start and serves the API
and web app on port 8787. Give it `DATABASE_URL`, `MODERATOR_EMAILS` and `NODE_ENV=production`
(secure cookies), and put it behind HTTPS.

## Android

```sh
cd web
VITE_API_URL=https://your-api.example npm run android:sync   # build web UI and copy it into android/
npm run android:open                                          # open in Android Studio, then Run
```

The app calls the API at `VITE_API_URL` with a bearer token kept on the device; the web app uses an
httpOnly session cookie with CSRF protection. Add the API's public origin to nothing: the Android
WebView origin `https://localhost` is already in the default `CORS_ORIGINS`.

CI builds `app-debug.apk` as a downloadable artifact when the `API_URL` repository variable is set.
A signed release build needs a keystore and a Play Console listing; see `docs/DECISIONS.md`.

Icons and splash screens are rendered from the provisional "ki" mark by `node scripts/android-assets.mjs`.
