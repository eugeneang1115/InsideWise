# KerjaInside — design handoff

## Product decisions confirmed by the owner
- Malaysia-focused company review platform.
- Web and Android first. iOS later.
- Readers search for companies on a map, read reviews and compare workplace experiences.
- Current and former employees submit reviews anonymously to the public.
- English, Bahasa Malaysia and Simplified Chinese.
- No recruitment, job vacancies, hiring leads, employer recruitment tools or paid rating manipulation.
- The latest request is design work. This deliverable is an interactive design prototype, not a deployed application or Android APK.

## Open the design
Open KerjaInside.html in a browser. It is self-contained apart from online OpenStreetMap tiles.
Open Android-preview.html for a phone-sized presentation.
The kerjainside-design folder contains the editable HTML, CSS, JavaScript and language data.
No installation is needed. JavaScript must be enabled.
All companies, office positions, ratings and reviews are illustrative and labelled.
Only language preference persists on this device. Review form submissions remain in memory, never leave the browser, and disappear on reload.
If map tiles fail, company search and pins still work. The background grid is a fallback, not a geographical map.

## Visual direction
Working brand: KerjaInside. Name and monogram are provisional and have not been checked for trademark availability.
Warm, quiet and editorial, with a muted green accent. The product should feel trustworthy without promising the truth of every claim.

| Token | Value | Use |
|---|---|---|
| Primary | #245c4b | Primary buttons, selected company, navigation |
| Ink | #203a34 | Headings and main text |
| Muted | #75837d | Secondary text; recheck contrast for production |
| Surface | #ffffff | Cards, panels, dialogs |
| Page | #f7f8f3 | Main background |
| Border | #e4e9e3 | Dividers and quiet outlines |
| Rating | #a98530 | Rating stars |
| Radius | 8 / 12 / 16 / 22 px | Inputs / cards / dialogs / mobile panels |
| Type | Segoe UI, Microsoft YaHei, Arial | System fonts; no remote font dependency |

Web: horizontal header; introduction and search; left results list; interactive map; company detail panel.
Android: compact header; search and filters; map; expandable results panel; bottom navigation; company details as a sheet.
Main controls must be at least 44×44 logical pixels in production. Some compact prototype filters and map controls need enlargement before release.
Use the CSS and responsive behavior as the design reference, not fixed screenshots.

## Screens and interactions included
1. Explore: company/city/industry search, industry and rating filters, sorting, pan/zoom, search current map area, reset to Malaysia.
2. Company profile: overview, aggregate rating, rating breakdown, illustrative reviews, report action and write-review entry point.
3. Review form: company, employment status, review language, six ratings, headline, positives, improvements and privacy acknowledgement.
4. My reviews: local preview submissions, pending state, editing and deletion.
5. Report dialog: reason field and simulated confirmation.
6. Privacy/community explanation: explicitly distinguishes public anonymity from the service's private account link.
7. Empty results, map loading failure, validation, modal dialogs and feedback messages.
8. Language switching for the interface. User-written review content remains in its original language.

The mobile results panel expands by tapping its heading. It is not a native draggable sheet yet.
The prototype uses raster maps and simple pointer panning. Native pinch zoom, clustered pins and polished sheet gestures are implementation work.

## Production implementation brief
Use the prototype as a design reference. Do not carry its simulated ratings or memory-only review storage into production.

Architecture:
- Shared product data and moderation backend for web and Android.
- Anonymous-compatible public company and published-review endpoints.
- Authenticated reviewer endpoints with server-side ownership checks.
- Moderator-only endpoints protected by an explicit allowlist or role service.
- Separate private account identifiers from public review response fields.
- Persist companies, office locations, reviews, reports, moderation events and appeals.
- Separate company-wide reviews from branch metadata; don't invent branch scores from company-level data.
- Paginate reviews; calculate rating aggregates over all published reviews on the server.
- Native Android sign-in must use a supported secure browser flow. Do not assume embedded-webview authentication will work.
- Decide between a shared web UI packaged with Capacitor or a native Android implementation after confirming release requirements. No Android project or APK is included here.
- Keep sign-in provider choice open: the previous local scaffold was written for Sites' ChatGPT sign-in, but that is not a consumer-account decision approved by the owner.

Review lifecycle:
Draft → Pending → Published / Changes requested / Rejected.
Edits to published reviews return to Pending.
Rejected or changes-requested reviews can be appealed.
Deletion removes public content and dependent reports according to the published retention policy.
Moderation must not remove honest criticism merely because it is negative.

Security and privacy:
- Server-side session and authorization checks on every private action.
- CSRF protection for browser writes, rate limiting and abuse controls.
- No identity or contact details in public APIs, analytics or routine logs.
- Redact likely identifying details before publication; automated checks are only triage.
- Reviewer employment is self-declared unless independently verified. Do not equate email verification with employment verification.
- Warn about small-team and unique-event re-identification.
- No exact employment dates, mandatory job titles, ICs, payslips or work email for MVP.
- Clear English, Malay and Chinese privacy text, with native-language review before launch.
- Define retention, backups, deletion/export requests, moderator access and breach handling.
- Assess Malaysia PDPA applicability and data hosting/transfers before collecting real submissions.

Still needed before release:
- Real verified company directory and office locations.
- Production auth, database, migrations, moderation tooling and reporting/appeal processing.
- Real API connection for every prototype action.
- Live map-provider setup appropriate to expected traffic.
- Accessibility and contrast audit; touch-target and Android gesture refinements.
- Browser/device, privacy and security testing.
- Android build, app identity, signing and Play Console release process.
- Final brand, operator contact details, privacy notice and content rules.
- No payment or recruitment features are in scope.

## Suggested build sequence
1. Reproduce the responsive interface and translations.
2. Implement company/profile read APIs and map filtering.
3. Add accounts and review submission with private ownership.
4. Add moderator queue, decisions, reports and appeals.
5. Test public anonymity, authorization and rating calculations.
6. Package Android and test authentication and navigation on a physical device.
7. Run a private pilot with explicit sample data before accepting real reviews.

## Verification
JavaScript syntax and data/logic checks are run separately in the delivery notes.
A headless browser check was attempted but the Windows sandbox closed the browser.
Do not claim visual, touchscreen or device testing has passed.
Map tiles require internet access and are subject to OpenStreetMap's policy:
https://operations.osmfoundation.org/policies/tiles/

