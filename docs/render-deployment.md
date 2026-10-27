# Deployment gate: configure Render before merging

This branch has not been deployed or validated against the live Render service.
Do not merge or deploy it until the following checks are complete. A push to this
feature branch must not deploy production.

1. In the actual Render service, verify the linked repository, production branch,
   root directory, start command (`node server.js`), and automatic deployment
   setting. The service name in `render.yaml` differs from the known live hostname;
   do not assume the Blueprint identifies the running service.
2. Record **names and presence only** of current environment settings. Preserve
   `SHEET_ID`, `SHEET_NAME`, `SHEET_GID`, `SHEET_CSV_URL`, `SHEET_REFRESH_MS`,
   `OPENING_DATE`, and `LOCAL_CSV` where configured. Do not overwrite the existing
   Sheets source with a guessed value. No Sheets source defaults were changed here.
3. Set new, distinct, strong `ADMIN_PASSWORD` and `VIEWER_PASSWORD` values through
   Render's secure Environment settings. Retain current `ADMIN_USERNAME` and
   `VIEWER_USERNAME`, or set them explicitly. Keep `REQUIRE_LOGIN=true`. Never put
   password values in Git, issues, chat, logs, or deployment instructions.
   The previously committed passwords must be treated as compromised, including
   copies in Git history. Removing literals does not rotate credentials.
4. Save these settings **on the currently deployed version first** and wait for
   its restart. The old server already supports these environment overrides.
   Verify administrator and viewer login with the new credentials and confirm
   the old credentials fail. Check authenticated `/api/config` reports
   `sync.ok=true` for the intended Google Sheet, not just `/api/health` returning
   200. Do not remove old bindings or change the source until these checks pass.
5. Only then merge/deploy this branch. Both password environment variables are
   mandatory: startup deliberately fails if either is absent. `sync: false` in
   `render.yaml` declares manual values; it does not create or migrate secrets in
   an existing Render service. PM2 inherits the same variables from its process
   environment; `ecosystem.config.js` no longer contains a password.
6. Verify health, both login roles, live Sheets sync, held counts and details,
   percentages, HTML and PPTX report downloads. Add a star to a test task title
   or status and remove it again; confirm metrics recalculate after refresh.
   Do not alter production rows without coordinating with their owner.

## Development

Use Node.js 24 and run `npm ci`, then `npm test`. Set both password variables
securely in your local process before `npm start`. For an explicitly offline
session, `LOCAL_CSV` can point at `public/KAG_GoogleSheet_Template.csv`.
Do not mistake bundled fallback data for successful live sync.

Held tasks are identified from an ASCII `*` anywhere in the original task title
or status. Raw sheet values remain intact; the displayed status is `معلقة`.
They remain in task lists and total-task counts, but are excluded from completed,
active and overdue counts, and from both sides of progress calculations.
The November 1, 2026 cutoff remains inclusive; later due dates are excluded from
progress calculations. Risk records are independent of this task-only rule.
