# Car Listings

A website for a used-car mediator: buyers browse cars and call or WhatsApp; the mediator lists cars from their phone, marks them booked or sold, and keeps the owner's details private.

- **Buyers** (no login): browse by brand, narrow by budget, open a car, then Call or WhatsApp with the car code already in the message.
- **Admin** (the mediator): add a car in a couple of minutes from a phone, upload photos (resized and stripped of location data in the browser), reorder them, and change status with one tap.
- **Recently sold** shows cars that went to new owners, without the final price.
- **Sell your car** (`/sell`): owners send details and up to 10 photos. Requests land in the admin's **Sell requests** tab; one click turns a request into a pre-filled listing.
- **Leads**: the admin logs buyers after a call or message, with status and a follow-up date. Taps on Call and WhatsApp are counted per car (no personal data), so the admin sees which cars get interest.

Built with Next.js 16 (App Router), Tailwind CSS 4 and Supabase (Postgres, auth, photo storage).

## How a car moves through the site

Saving a car never puts it on the website. A new car is saved as **Ready to publish** and waits on that dashboard tab until the admin taps **Publish** (on the dashboard, or in the note shown after saving). Editing a car keeps whatever status it already has. Status only changes through the dashboard buttons.

| Status (database) | Admin sees | Public sees | Meaning |
| --- | --- | --- | --- |
| `submitted` | Not checked | nothing | Details came in; car not inspected yet |
| `verified` | Ready to publish | nothing | Saved and checked, waiting for Publish |
| `listed` | On sale | the car | On sale |
| `reserved` | In deal | the car, tagged "In deal" | A buyer agreed and paid a token; others can queue in case it falls through |
| `sold` | Sold | Recently sold | The sold date is stamped automatically |
| `archived` | Archived | nothing | Taken down |

Buttons: Publish → On sale; On sale → Start deal / Sold / Unpublish; In deal → Open deal; Sold → Archive; Archived → Publish again.

**Deals and the waiting line.** Each car's admin page has a *Deal & buyers* panel. Everyone who asks about the car is added to its waiting line, in the order they called. *Start deal* records which buyer the car is in deal with and the token they paid (kept on `car_private`, so it's never public). When it ends: *Deal done* marks the car Sold and the buyer Bought; *Deal fell through* marks the buyer as dropped out and either hands the car to the next person in line or puts it back on sale. The dashboard shows each In-deal car's buyer, token and how many are waiting. Signed-in admins can open a hidden car's public page as a preview.

The public can only read what row level security allows. The owner's name, phone, full registration number, lowest acceptable price and commission live in a separate `car_private` table that only admins can read.

## Brands and models

`supabase/migrations/20261023000100_catalog.sql` seeds 34 brands and about 280 models sold in India, including discontinued ones that still come up second-hand. You don't need a complete list: in the admin form, pick **"+ Model not in the list"** (or brand) and type it; it is saved to the catalogue for next time.

**Type of car** (Hatchback, Sedan, SUV, MUV) is stored on the model, not on each car, so the mediator never has to pick it: every Swift is a hatchback. `20261023000400_model_categories.sql` sets it for the whole catalogue. Pickups, vans and coupés have no type and show under "All cars". When the admin adds a car whose model has no type yet (or types in a new model), the form asks once and saves it on the model. Buyers only see types that currently have cars.

Each car gets:
- a public code like `CAR-0012`, for buyers to quote on the phone
- a readable address like `/cars/2018-maruti-suzuki-swift-vxi-12`; the trailing number is the id, and old or mistyped slugs redirect to the right one.

## Running it locally

You need Node 20+, pnpm and Docker.

```bash
pnpm install
pnpm db:start          # local Supabase in Docker; the first run downloads the images
cp .env.example .env.local
pnpm exec supabase status   # copy the API URL, publishable key and secret key into .env.local
pnpm db:reset          # applies migrations and loads demo cars from supabase/seed.sql
pnpm admin:create you@example.com 'a-long-password'   # 12+ characters, letters and digits
pnpm dev
```

- Site: http://localhost:3060
- Admin: http://localhost:3060/admin. The first sign-in asks you to set up two-step login with an authenticator app.
- Supabase Studio (database browser): http://127.0.0.1:54323
- Mailpit (catches invite and password-reset emails locally): http://127.0.0.1:54324

## Going live

1. Create a project at supabase.com (Mumbai region). In **Authentication**:
   - **Sign In / Providers**: turn off "Allow new users to sign up". Leave the Email provider itself on, or the admin can't sign in either. Set the minimum password length to 12 and require letters and digits.
   - **Multi-Factor**: turn on TOTP (authenticator app).
   - **URL Configuration**: Site URL = the live address; add `https://<your-domain>/**` to the redirect URLs.
   - **Emails**: paste `supabase/templates/invite.html` and `recovery.html` into the "Invite user" and "Reset password" templates. Their links go to `/admin/auth/confirm`; the default templates won't work.
   - **SMTP**: set up your own sender (Resend, Brevo or similar). Supabase's built-in sender only mails team members and a few messages an hour, so invites and resets won't arrive without it.
2. Link and push the schema; this creates the tables, security policies, photo bucket and brand catalogue. The demo cars are not pushed.
   ```bash
   pnpm exec supabase link --project-ref <your-project-ref>
   pnpm exec supabase db push
   ```
3. Put the hosted URL and keys in `.env.local` and run `pnpm admin:create` once to make the first admin. Invite everyone else from **Admin → Settings → Admins**.
4. Deploy to Vercel. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` and `SUPABASE_SECRET_KEY`. The secret key is only used on the server, by the sell form; never prefix it with `NEXT_PUBLIC_`.
5. Sign in and open **Admin → Settings** to set the business name, phone, WhatsApp number, hours and (when there is one) the shop address. Every page uses these; `src/config/site.ts` only holds the fallback values.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run the site |
| `pnpm test` | Unit tests (formatting, URLs, WhatsApp links, phone numbers) |
| `pnpm typecheck` / `pnpm lint` | Checks |
| `pnpm db:start` / `db:stop` | Start or stop local Supabase |
| `pnpm db:reset` | Rebuild the local database from migrations and seed |
| `pnpm admin:create <email> <password>` | Create the first admin login (later admins are invited from Settings) |

## When a car comes off the website

- **Sold** — sold through you. It moves to Recently sold on the website.
- **Remove** — the owner sold it elsewhere, isn't selling any more, or another reason. Pick the reason (and an optional note); the car is kept under **Removed** with its photos, owner details and buyers, so it can be looked up or published again. A buyer mid-deal is marked lost in Leads with the reason.
- **Unpublish** — hide it for now; it goes back to Ready to publish.
- **Delete for good** — only for removed cars and ones never put on sale. Erases the car, its photos and private papers; leads stay, unlinked.

Private paper copies are cleared 30 days after a car is sold or removed.

## Papers (RC, insurance…)

Buyers never see documents. Each car's admin page has a **Papers** panel:

- **Checked by you** — ticks for RC original seen, insurance valid, PUC valid, service records, and the loan status. The public car page shows these as a "Papers checked" list.
- **Document copies — private** — photos or PDFs of the RC, insurance, PUC, bank NOC and so on, in the private `car-documents` bucket. Only signed-in admins can open them, through links that expire after 5 minutes. Uploading needs the "owner agreed" tick first. Copies get a delete date 30 days after the car is sold and are cleared automatically the next time an admin page loads.
- **Share copy** — makes a version stamped "for sale verification only" with the business name and date, to send to a buyer on WhatsApp.

## Admin accounts

- **Adding someone:** Settings → Admins → Invite. They get an email, set a password, then set up two-step login. Nobody can sign up on their own.
- **Two-step login is required.** The database only treats a session as admin after the authenticator code has been entered, so a stolen password alone can read nothing.
- **Forgot password:** the link on the sign-in page emails a reset link. It says the same thing whether or not the email is an admin, and the reset still asks for the authenticator code.
- **Lost phone / someone leaves:** another admin uses **Reset two-step** or **Remove** in Settings → Admins. Removing takes effect at once, even for a session that is still open. The last admin can't be removed.

## Security and caching

- Every page sends a Content-Security-Policy, blocks being shown in a frame, and (when live) HSTS. See `next.config.ts`.
- Public pages read the database without cookies, so they're cached and refreshed every 60 seconds; admin changes refresh them straight away. Admin pages are never cached.
- Each car's area is kept in `car_private` (admin-only) and only reaches the website when "Show each car's area" is on in Settings.

## How the sell form stays safe

- Requests are written by the server with the secret key, after validation. The public can't read or write `sell_requests`, `leads` or `car_private`.
- Limits: 3 requests per IP per hour, 3 per phone number per day, plus a hidden field that catches bots. The IP is stored only as a salted hash.
- Photos are resized in the browser (location data removed) and uploaded with one-time links into the private `request-photos` bucket. Admins see them through short-lived links; they're copied to the public `car-photos` bucket only when a listing is created from the request, and deleted with the request.
- The rate limit uses the visitor's real IP (Cloudflare's `cf-connecting-ip`, then `x-real-ip`, then the last `x-forwarded-for` entry), so a faked header can't dodge it.
- Typed-in brands and models stay on the request. They only join the catalogue when the admin saves a listing.

## Not built yet

- Cleaning up photos uploaded to a car form that was never saved
- Message or email alerts when a sell request arrives (today the seller is nudged to WhatsApp you after sending)
- Language toggle, EMI calculator
