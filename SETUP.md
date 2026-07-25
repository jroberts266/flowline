# Flowline — Path B setup guide (Supabase + Stripe)

This connects accounts, saved data, and paid subscriptions to the site. All
the code is already written; this guide is the part that needs *your*
accounts and can't be done for you — creating the Supabase project, the
Stripe product, and deploying with the right secret keys.

Budget about 45–60 minutes the first time through. None of these steps
require writing code — just filling in forms and pasting keys.

---

## 0. What you're connecting

- **Supabase** — handles user accounts (sign up/in) and stores each user's
  saved maps/reports in a real database.
- **Stripe** — handles the actual subscription billing.
- **Netlify** — hosts the site *and* runs three small serverless functions
  that talk to Stripe on the site's behalf (the browser never touches your
  Stripe secret key directly).

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. Once the project is ready, go to **Project Settings → API**. You'll need
   two values from this page in a minute: the **Project URL** and the
   **anon public key**.
3. Go to **SQL Editor → New query**, paste in the entire contents of
   `schema.sql` (included in this project), and click **Run**. This creates
   the `subscriptions` and `saved_items` tables with the correct security
   rules already applied.
4. Go to **Authentication → Providers** and confirm **Email** is enabled
   (it is by default). For a quick test you can also turn off "Confirm
   email" under **Authentication → Settings** so you don't need a working
   email inbox to test sign-up — turn it back on before real customers use it.

---

## 2. Create the Stripe product

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

## 5. Finish the Stripe webhook

Now that you have a real Netlify URL, go back to **Stripe → Developers →
Webhooks**, finish creating the endpoint from step 2.5 with the real URL,
and copy the signing secret into Netlify's `STRIPE_WEBHOOK_SECRET`
environment variable (redeploy after updating it).

---

## 6. Test it end to end

1. Visit `flowline-account.html` on your deployed site and sign up with a
   real-looking email.
2. Click **Upgrade to Pro**. Stripe Checkout opens — use a
   [Stripe test card](https://docs.stripe.com/testing) like
   `4242 4242 4242 4242`, any future expiry, any CVC.
3. After checkout, you should land back on the account page showing
   **Pro — active**. If it still shows "Free plan," check the Netlify
   function logs (**Netlify → Functions → stripe-webhook**) for errors —
   this is almost always a mismatched webhook secret or price ID.
4. Open `flowline-vsm.html`, build a small map, click **Save to my
   account**, then go back to `flowline-account.html` — it should appear
   in your saved items list.

---

## What's wired up right now

**Fully wired:** sign up/in, subscription status, Stripe checkout and
billing portal, and save/load on **every tool** — Value Stream Mapper,
Future-State VSM, A3, DMAIC Charter, Kaizen Event Charter, Fishbone, 5 Whys,
Pareto, Process Capability, OEE, Takt Time, Yamazumi, 5S Audit, Kanban, KPI
Dashboard, and Hour-by-Hour Board. Each has a "Save to my account" button, a
"My saved items" panel, and reopens correctly from the account page's list.

## The paywall: free trial + Pro-only saving

Here's exactly how access works now:

| Status | Can use the tools? | Can save to account? |
|---|---|---|
| Not signed in | No — blocked with a "sign up free" screen | No |
| Signed in, trial active (first 10 days) | **Yes, full access** | **No** — shown an upgrade prompt |
| Signed in, trial ended, not subscribed | No — blocked with an "upgrade" screen | No |
| Paying subscriber (any time) | Yes | Yes |

The 10-day trial starts automatically the moment someone signs up — no
payment info collected, no Stripe involvement at all for the trial itself.
That's handled entirely by a Supabase database trigger that stamps
`trial_ends_at` on the new account.

**If you already ran the original `schema.sql` on a live Supabase project**,
that trigger doesn't know about trials yet. Run **`migration-trial.sql`** in
the Supabase SQL Editor once to add it — this also gives any existing test
accounts (like the ones you've been using to debug Stripe) a fresh 10-day
trial starting from when you run it. If you're setting up a brand new
Supabase project instead, you don't need this — the updated `schema.sql`
already includes everything.

**One limitation worth understanding clearly:** the tool-usage gate is
enforced client-side (in the browser), not server-side. It's a real product
gate — casual visitors can't get past it — but it's not a hard security
boundary, since someone with enough technical knowledge could disable it via
browser dev tools. The part that *is* genuinely enforced server-side is
saving: Supabase's row-level security policies check the real subscription
status in the database no matter what the browser claims, so that part can't
be bypassed the same way. This split (soft gate on usage, hard gate on data)
is a normal and common pattern — it's the same tradeoff most free-trial
products make, since a fully server-enforced view gate would require
server-rendering every page instead of serving static HTML.

**Also worth remembering before a real launch:** turn Supabase's "Confirm
email" setting back on (we turned it off earlier purely to make testing
easier) — as configured for testing, someone can sign up with a fake email
and still get the full 10-day trial.

