# Build decisions

Defaults picked while building from the design handoff. Each can be changed; the reason is noted.

## Decided here

- **Android: Capacitor, not native.** One UI for web and Android keeps the design identical and halves
  the work. The handoff left this open. Native can come later if Play review or performance demands it.
- **Sign-in: email and password.** The handoff kept the provider open and ruled out the earlier ChatGPT
  sign-in. Email and password needs no third party and works in the Android app without an embedded
  web login. Passwords are hashed with scrypt. Email is never verified as proof of employment.
- **Database: PostgreSQL**, with plain SQL migrations in `server/migrations`.
- **Moderators: an explicit email allowlist** (`MODERATOR_EMAILS`), as the handoff asked.
- **One review per person per company.** Further changes are edits, which go back to moderation.
- **Reviews are company-wide.** Offices are map locations only; there are no branch scores.
- **Moderators never see who wrote a review.** The private account link is used only for ownership.
- **Appeals:** accepting one publishes the review; declining keeps the decision. Editing a review
  withdraws its open appeal, since the edit goes back to moderation anyway.
- **Reports** can be sent without an account (rate-limited). Hiding a review closes its reports.
- **Drafts** of unsent reviews stay on the device only (local storage), never on the server.
- **Personal-detail check** blocks obvious emails, MyKad numbers and Malaysian mobile numbers on both
  client and server. It is triage only; moderators still read everything.
- **Logs** record method, path and status. No IPs, headers, bodies or account ids.
- **Data rights:** signed-in users can download their data and delete their account and reviews.
- **Contrast and touch targets:** the muted text colour was darkened from `#75837d` to `#5b6a63`, and
  filters, map controls, review actions and icon buttons are at least 44×44 px.
- **Map:** Leaflet with marker clustering and native pinch zoom. Tiles default to OpenStreetMap,
  configurable through `VITE_TILE_URL`.
- **Prototype fix:** the handoff's single-file `KerjaInside.html` threw an error on load because
  bundling collapsed `$$` into `$`. `docs/design/KerjaInside.html` is rebuilt correctly.

## Still open (needs the owner)

- Final brand name, app id (`my.kerjainside.app`, fixed after first Play release) and trademark check.
- Hosting, domain, and a map tile provider that allows production traffic (OSM's public tiles do not).
- Real verified company directory and office locations.
- Privacy notice, community rules and operator contact, reviewed by a native speaker in Malay and Chinese.
  The Malay and Chinese strings added during the build need the same review.
- Malaysia PDPA assessment, data hosting location, retention periods, backups and breach process.
- Android signing keystore, Play Console account and store listing.
- Email delivery (password reset, notifications) needs a provider; not built yet.
- Accessibility audit with real assistive technology, and testing on physical Android devices.
