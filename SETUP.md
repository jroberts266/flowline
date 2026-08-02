# Flowline — Path B setup guide (Supabase + Stripe)

> **Update: Flowline moved away from subscription as its monetization
> model.** Every tool is now free for everyone, with no trial, no paywall,
> and no gate on saving — accounts are just a free convenience. The
> Stripe-related steps below (sections 2, 5, and the Stripe environment
> variables) are **optional now** — only relevant if you want to reintroduce
> a paid tier later. If you're setting this up fresh today, you can skip
> straight to the Supabase steps (1, 3, 4, 6) and the new **Contact form,
> lead capture, and Terms & Conditions** section near the bottom, and ignore
> Stripe entirely unless you want it.

This connects accounts, saved data, and (optionally) paid subscriptions to
the site. All the code is already written; this guide is the part that
needs *your* accounts and can't be done for you — creating the Supabase
project and, if you want it, the Stripe product and serverless functions.

Budget about 30–45 minutes for the Supabase-only path now that Stripe is
optional. None of these steps require writing code — just filling in forms
and pasting keys.

---

## 0. What you're connecting

- **Supabase** — handles user accounts (sign up/in) and stores each user's
  saved maps/reports, contact form submissions, and leads in a real
  database.
- **Stripe** *(optional — only if you want a paid tier)* — handles
  subscription billing.
- **Netlify** — hosts the site *and* runs the serverless functions that
  talk to Stripe on the site's behalf, if you're using Stripe at all.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. Once the project is ready, go to **Project Settings → API**. You'll need
   two values from this page in a minute: the **Project URL** and the
   **anon public key**.
3. Go to **SQL Editor → New query**, paste in the entire contents of
   `schema.sql` (included in this project), and click **Run**. This creates
   the `subscriptions`, `saved_items`, `feedback`, and `leads` tables with
   the correct security rules already applied — everything you need, Stripe
   or not.
4. Go to **Authentication → Providers** and confirm **Email** is enabled
   (it is by default). For a quick test you can also turn off "Confirm
   email" under **Authentication → Settings** so you don't need a working
   email inbox to test sign-up — turn it back on before real users sign up.

---

## 2. Create the Stripe product *(optional — skip if you don't want a paid tier)*

1. Go to [stripe.com](https://stripe.com) and create an account (test mode
   is on by default — perfect for now, you'll flip to live mode later).
2. Go to **Product catalog → Add product**. Give it a name (e.g. "Flowline
   Pro"), set it as **Recurring**, pick your price and billing interval.
3. Save it, then open the price you just created and copy its **Price ID**
   (starts with `price_...`).
4. Go to **Developers → API keys**. Copy the **Publishable key**
   (`pk_test_...` or `pk_live_...`) and the **Secret key** (`sk_test_...` or
   `sk_live_...`) — keep the secret key private, it never goes in a file
   that gets uploaded to GitHub.
5. Go to **Developers → Webhooks → Add endpoint**. You won't have the URL
   until after deploying (step 4 below), so come back to this step once
   your site is live — the endpoint URL will be:
   `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
   Subscribe it to these three events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   After creating it, copy the **Signing secret** (`whsec_...`).

---

## 3. Fill in the public config file

Open `flowline-config.js` and replace the placeholder values:

```js
window.FLOWLINE_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",       // from step 1.2
  SUPABASE_ANON_KEY: "eyJhbGciOi...",                  // from step 1.2
  STRIPE_PUBLISHABLE_KEY: "pk_test_...",               // from step 2.4
  STRIPE_PRICE_ID: "price_...",                        // from step 2.3
  FUNCTIONS_BASE_URL: "https://YOUR-SITE.netlify.app/.netlify/functions"
};
```

This file is safe to commit and deploy — none of these values are secret.

---

## 4. Deploy to Netlify (not GitHub Pages, for this part)

GitHub Pages can't run the serverless functions Stripe needs, so for Path B
you'll deploy through **Netlify** instead — same idea as before, still free
to start.

1. Push the whole project folder to a GitHub repo (same as the earlier
   GitHub Pages instructions).
2. Go to [netlify.com](https://netlify.com), **Add new site → Import an
   existing project**, and connect that repo. Netlify will detect
   `netlify.toml` automatically.
3. Before the first deploy, go to **Site settings → Environment variables**
   and add these — this is where your *secret* keys go, never into a file
   in the repo:

   | Key | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | from step 2.4 |
   | `STRIPE_WEBHOOK_SECRET` | from step 2.5 (add this after step 5 below, or set a placeholder for now) |
   | `STRIPE_PRICE_ID` | from step 2.3 |
   | `SUPABASE_URL` | from step 1.2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key (different from the anon key — keep this one very private, it bypasses all security rules) |
   | `SITE_URL` | your Netlify URL, e.g. `https://your-site.netlify.app` |

4. Deploy. Netlify will install `stripe` and `@supabase/supabase-js` for the
   functions automatically from `package.json`.

---

## 5. Finish the Stripe webhook *(optional — only if you set up Stripe in step 2)*

Now that you have a real Netlify URL, go back to **Stripe → Developers →
Webhooks**, finish creating the endpoint from step 2.5 with the real URL,
and copy the signing secret into Netlify's `STRIPE_WEBHOOK_SECRET`
environment variable (redeploy after updating it).

---

## 6. Test it end to end

1. Open any tool (e.g. `flowline-vsm.html`) without signing in at all — it
   should just work, no gate, no prompt.
2. Visit `flowline-account.html` and sign up with a real-looking email.
3. Open `flowline-vsm.html`, build a small map, click **Save to my
   account**, then go back to `flowline-account.html` — it should appear
   in your saved items list. No payment step should appear anywhere in
   this flow.
4. Try the contact form (`flowline-contact.html`) and the services lead
   form (`flowline-services.html`) — both should confirm success, and the
   submissions should show up in Supabase's Table Editor under `feedback`
   and `leads` respectively.

*(Only if you set up Stripe in step 2):* click **Upgrade to Pro** from
wherever you've wired it back in, use a
[Stripe test card](https://docs.stripe.com/testing) like
`4242 4242 4242 4242`, and confirm the webhook fires — check
**Netlify → Functions → stripe-webhook** logs if it doesn't reflect in
Supabase's `subscriptions` table.

---

## What's wired up right now

**Every tool is free, for everyone, no account required** — Value Stream
Mapper, Future-State VSM, A3, DMAIC Charter, Kaizen Event Charter, Fishbone,
5 Whys, Pareto, Process Capability, OEE, Takt Time, Yamazumi, 5S Audit,
Kanban, KPI Dashboard, and Hour-by-Hour Board. No trial clock, no lockout,
no upgrade prompt anywhere in the tools themselves.

**Accounts are a free convenience, not a gate.** Signing up (on
`flowline-account.html`) just lets someone save their work and come back to
it later — every tool's "Save to my account" button only checks that
you're signed in, nothing more.

**Monetization now happens through three other channels instead:**

1. **Lead generation** (`flowline-services.html`) — a "Work With Us" page
   pitching consulting, training, or custom tool work, with a short
   interest form. Submissions land in Supabase's `leads` table.
2. **Affiliate links** (`flowline-resources.html`) — a curated list of
   books, courses, and tools with a proper FTC-style disclosure at the top.
   Every link is currently a placeholder (`href="#"`) — replace them with
   real affiliate links once you've joined the relevant programs.
3. **Freemium as goodwill, not a funnel** — the tools stay free indefinitely
   to build trust and traffic; #1 and #2 are where revenue comes from, not
   from restricting the tools.

**If you already have a live Supabase project from earlier testing**, run
these two migrations once in the SQL Editor (a brand-new project just
needs the current `schema.sql`, which already includes everything):
- **`migration-leads.sql`** — adds the `leads` table for the Services page
- **`migration-feedback.sql`** — adds the `feedback` table for the contact
  form, if you hadn't already run this from an earlier round

You do **not** need `migration-trial.sql` anymore — the trial/paywall system
it supported has been removed. It's harmless to leave that file alone if
you already ran it; nothing currently reads `trial_ends_at`.

**Stripe is now fully optional.** The checkout, billing portal, and webhook
functions are all still in the codebase and still work if you want a paid
tier again later — they're just not connected to anything by default
anymore. If you never set up Stripe, you can ignore it entirely; if you
already did during earlier testing, there's no harm in leaving those
Netlify environment variables in place unused.

**Also worth remembering before a real launch:** turn Supabase's "Confirm
email" setting back on (we turned it off earlier purely to make testing
easier).

## Contact form, Services (lead gen), and Terms & Conditions

**`flowline-contact.html`** — a public feedback/bug-report form, no account
needed. Submissions are stored in the `feedback` table in Supabase. Fill in
`SUPPORT_EMAIL` in `flowline-config.js` too — it's shown as an alternate
contact method, and it's what the form falls back to (via a pre-filled
`mailto:` link) if Supabase isn't configured.

**`flowline-services.html`** — the lead-generation page described above.
**Every offer description, and the three service cards, are placeholder
copy** — replace them with your actual services and pricing before this
goes live. Submissions land in the `leads` table and are visible in
Supabase's Table Editor; there's no admin dashboard for this yet.

**`flowline-resources.html`** — the affiliate resources page. Read the
disclosure banner at the top of the page itself — it's written to be
genuinely FTC-compliant boilerplate, but the affiliate links themselves are
all placeholders you need to fill in with real program links.

**`flowline-terms.html`** — a standard SaaS terms template with every
placeholder clearly marked (company name, jurisdiction, refund policy,
etc.). It is **not legal advice** and hasn't been reviewed by a lawyer —
read the banner at the top of the page itself before publishing this
anywhere real. Now that Stripe isn't required, this page matters less
urgently than it did under the subscription model, but it's still worth
having (and worth updating) before real users show up, particularly if
you're collecting emails through the contact and services forms.

