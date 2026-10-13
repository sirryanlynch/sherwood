# Sherwood Firebase backend

Reminders and saved-result emails. The static site keeps working when `js/config.js` has an empty `FUNCTIONS_BASE_URL`. Nothing in this folder contains a secret.

The Cloud Functions runtime is Node 20. Scheduled functions need the **Blaze** plan.

## What you create

1. A Firebase project (console.firebase.google.com). Copy the project id.
2. Upgrade that project to the **Blaze** plan. The daily job will not deploy on the free Spark plan.
3. Firestore, in Native mode. The first deploy can create the database if you enable it in the console first (Build → Firestore → Create database). Pick a region and start in production mode. `firestore.rules` replaces the default rules on deploy.
4. A service account key for GitHub Actions.
   - Project settings → Service accounts → Firebase Admin SDK → Generate new private key.
   - Or: Google Cloud → IAM → create a key for a service account that has Firebase Admin, Cloud Functions Admin, Service Account User, and Cloud Scheduler Admin.
5. GitHub repo secrets (Settings → Secrets and variables → Actions):
   - `FIREBASE_SERVICE_ACCOUNT` — the entire JSON key, one secret.
   - `FIREBASE_PROJECT_ID` — the project id.
   If either secret is missing, `.github/workflows/firebase-deploy.yml` skips the deploy and exits 0.
6. Secret Manager values, created before the first functions deploy. From `backend/` after `npm install -g firebase-tools` and `firebase login`:

   ```bash
   firebase functions:secrets:set MAIL_POSTAL_ADDRESS --project YOUR_PROJECT_ID
   firebase functions:secrets:set MAIL_FROM --project YOUR_PROJECT_ID
   firebase functions:secrets:set RESEND_API_KEY --project YOUR_PROJECT_ID
   firebase functions:secrets:set SENDGRID_API_KEY --project YOUR_PROJECT_ID
   firebase functions:secrets:set PUBLIC_FUNCTIONS_BASE_URL --project YOUR_PROJECT_ID
   ```

   - `MAIL_POSTAL_ADDRESS` — a real postal address. Every email includes it. If it is missing, the function stores the reminder and does not send.
   - `MAIL_FROM` — a verified sender, for example `Sherwood <reminders@yourdomain.com>`.
   - `RESEND_API_KEY` — the Resend key, or the literal `unused` if you use SendGrid instead.
   - `SENDGRID_API_KEY` — the SendGrid key, or the literal `unused` if you use Resend instead.
   - `PUBLIC_FUNCTIONS_BASE_URL` — the functions origin with no trailing slash, `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net`. Confirm and unsubscribe links are built from it.
7. A verified sending domain at Resend or SendGrid. The `MAIL_FROM` address has to be on that domain. Without that, the provider will reject the send.
8. After the first successful deploy, set `js/config.js`:
   - `FUNCTIONS_BASE_URL` to the same origin as `PUBLIC_FUNCTIONS_BASE_URL`.
   - `FIREBASE.projectId` (and the other web-app fields if you later add App Check). The Pages site does not read Firestore directly.

Optional App Check: create a reCAPTCHA provider for the Hosting/Pages app, then set the function environment variable `APP_CHECK_ENFORCED` to `true`. Until then the check is off. The handler still looks for `X-Firebase-AppCheck` when enforcement is on.

## Deploy

Push to `main` with a change under `backend/`. The workflow syncs `data/counties/*.json` into `functions/counties/`, then deploys Firestore rules, indexes, and functions.

Manual deploy from this directory:

```bash
node scripts/sync-counties.mjs
cd functions && npm ci && cd ..
firebase deploy --only firestore:rules,firestore:indexes,functions --project YOUR_PROJECT_ID
```

## Seed county adapters

The scheduled job reads the `counties` collection when it has documents, and otherwise uses the JSON bundled in `functions/counties/`. Seeding lets you change a deadline without shipping new code. Run sync first, install function dependencies, and point `GOOGLE_APPLICATION_CREDENTIALS` at the service account JSON:

```bash
node scripts/sync-counties.mjs
cd functions && npm ci && cd ..
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
node scripts/seed-counties.mjs
```

## What the functions do

- `createReminder` — POST JSON `{ email, county_slug, address, marketing_consent: true, consent_source }`. Validates the body, rate-limits by hashed IP (8 requests an hour), stores marketing consent with `consent_source`, `consent_requested_at`, and `confirmed_at: null`, and sends a double opt-in email. `window_opens_at` is taken from the county adapter, not from the browser. `confirmed_at` is set only when the person opens the confirm link.
- `confirmReminder` — GET `?token=`. Sets `confirmed_at`.
- `unsubscribe` — GET `?token=`. Sets `status` to `unsubscribed`.
- `createLead` — POST from “Email me this result”. Stores the lead and, when mail is configured, sends one plain result email.
- `markConverted` — POST `{ email, county_slug }` after checkout. Sets `converted_at` so the deadline nudge is skipped.
- `sendDueReminders` — every day at 08:00 America/Los_Angeles. For confirmed reminders still `pending`, it sends at most one of each: 14 days before the adapter open date, once while the window is open, and 14 days before the adapter deadline if `converted_at` is empty. A missing open date is not invented. After the deadline date, `status` becomes `sent`.

Every outgoing email includes the unsubscribe link, `MAIL_POSTAL_ADDRESS`, and the line that Sherwood is not a law firm and the email is not legal advice. Copy uses the county name and the adapter window only.

## Rules

Clients cannot read `reminders` or `leads`. A direct client create is limited to validated fields and cannot set `unsubscribe_token`, `confirm_token`, or `confirmed_at`. The site talks to the HTTPS functions, which use the Admin SDK.

## Tests

```bash
cd backend/functions
npm test
```

Window dates, reminder validation, rate limiting, and the required email footer are unit-tested. The Firestore emulator is not required for those tests.
