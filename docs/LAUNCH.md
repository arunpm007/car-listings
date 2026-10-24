# Going live

A checklist, in order. Steps marked **(you)** need your accounts; the rest is already in the code.

## 1. Pick the host

| | Netlify Free | Cloudflare Workers Paid | Vercel Pro |
| --- | --- | --- | --- |
| Cost | ₹0 | about $5 / month | $20 / month |
| Setup | Connect the repo, set env vars | Needs the OpenNext adapter, plus R2 and a Durable Object for page caching | Connect the repo |
| Limits that matter | 300 credits a month: each production deploy uses 15, each GB served 20. The site pauses if they run out. | Practically none at this size | None at this size |
| `CLIENT_IP_HEADER` | `x-nf-client-connection-ip` | `cf-connecting-ip` | `x-real-ip` |

Cloudflare's free plan allows only 10 ms of CPU per request, which a Next.js page render can go over, and Vercel's free plan doesn't allow business use. So: **start on Netlify Free**. Move to Cloudflare at $5 if deploys or traffic outgrow the credits. Confirm Netlify's terms allow a business site before launch.

## 2. Supabase project (you)

1. Create a project at supabase.com in **Mumbai (ap-south-1)**. Save the database password in a password manager.
2. **Authentication**
   - Sign In / Providers: turn **off** "Allow new users to sign up". Leave Email on. Minimum password length 12, require letters and digits.
   - Multi-Factor: TOTP (authenticator app) on.
   - URL Configuration: Site URL = `https://your-domain`; redirect URLs = `https://your-domain/**`.
   - Emails → Templates: paste `supabase/templates/invite.html` into "Invite user" and `recovery.html` into "Reset password". The subjects are in `supabase/config.toml`.
   - Emails → SMTP: your own sender (Resend's free plan is plenty: verify your domain there, then copy its SMTP details here). Without it, invites and resets only reach Supabase team members.
   - Rate limits: the defaults are fine.
3. **Schema**: `pnpm exec supabase link --project-ref <ref>` then `pnpm exec supabase db push`. After the first time, the Deploy workflow does this.
4. **First admin**: put the hosted URL and keys in `.env.production.local` (git-ignored), then run `ENV_FILE=.env.production.local pnpm admin:create you@example.com '<12+ chars>'`. Sign in on the live site and set up two-step login. Invite everyone else from Settings.

The demo cars in `supabase/seed.sql` only load locally; the hosted database starts empty.

## 3. Site (you)

1. Connect the GitHub repo on the host. Build command `pnpm build`; Node version comes from `.nvmrc`.
2. Environment variables:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key (server only; never `NEXT_PUBLIC_`) |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain` |
   | `CLIENT_IP_HEADER` | From the table in step 1 |

   The build stops if any of the first four are missing.
3. Domain: buy one (a `.in` is about ₹700 a year) and point it at the host. HTTPS is automatic.
4. On Netlify, **stop builds** (Project configuration → Build & deploy → Continuous deployment → Build settings → Stop builds), so only the Deploy workflow puts code live: after the database is updated, it builds with the variables saved on Netlify and publishes.
5. Open Admin → Settings: business name, phone, WhatsApp, hours.

## 4. CI/CD (you, once)

Already in `.github/workflows/`:

- **Checks** (`ci.yml`), on every branch push and pull request:
  - lint, types, unit tests, dependency audit;
  - a fresh Supabase built from the migrations;
  - a production build against it.
- **Deploy** (`deploy.yml`), on every push to `main`:
  - runs Checks;
  - pushes new migrations to the live database;
  - builds and publishes the site with the Netlify CLI.

  It waits for your approval if you set that up below.
- **Keep database awake** (`keep-alive.yml`): one tiny read a day, so the free project isn't paused after a week.

In GitHub → Settings:

- **Environments** → new environment `production`:
  - Required reviewers: yourself, so nothing goes live without a click.
  - Secrets: `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access tokens), `SUPABASE_DB_PASSWORD`, `NETLIFY_AUTH_TOKEN` (Netlify → User settings → Applications → Personal access tokens).
- **Secrets and variables → Actions → Variables** (repository level; none of these are secret):
  - `SUPABASE_PROJECT_REF` and `NETLIFY_SITE_ID` (Netlify → Project configuration → Project ID). Until `SUPABASE_PROJECT_REF` is set, Deploy only runs the checks.
  - `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, for the keep-alive.
- **Branches** → protect `main`: require the "Checks" job to pass and work through pull requests.

The day-to-day flow:

1. Make a branch, push it, and open a pull request. Checks run.
2. Merge the pull request.
3. Approve the release. The database updates, then the site.

## 5. Before announcing it

- [ ] The demo cars and their Wikimedia photos are not on the live site (they never are, unless added by hand).
- [ ] Admin → Settings shows the real phone and WhatsApp numbers; test both buttons on a phone.
- [ ] Send yourself an invite and a password reset from the live site; both emails arrive and the links work.
- [ ] Submit the sell form once from a phone with photos; it shows up under Sell requests.
- [ ] `https://securityheaders.com` on the domain shows an A.
- [ ] Supabase → Advisors (Security and Performance): no errors.

## Free-plan limits to watch

- **Supabase Free**:
  - 500 MB database (plenty).
  - 1 GB file storage: roughly 2,500 car photos with thumbnails.
  - 5 GB a month of downloads: photos are most of it. A month of about 1,000 visitors who each open a few cars fits.

  Supabase → Usage shows all three. The Pro plan is $25 a month if you outgrow them.
- **Netlify Free**: about 20 production deploys a month. Batch changes into fewer releases.

## Known trade-offs (accepted for now)

- The security policy allows inline scripts. A stricter, nonce-based one would turn off page caching. No page renders user-supplied HTML, so there is no way in today.
- Anyone can record fake Call/WhatsApp taps. They only skew the admin's interest counts.
- Someone who knows a seller's number can use up its 3 sell requests a day. The seller can still WhatsApp you.
