/* ============================================================================
   Flowline — public configuration
   Fill these in with values from your own Supabase and Stripe accounts.
   Everything in this file is safe to be public / visible in the browser —
   the Supabase anon key is designed for client-side use and is protected by
   the row-level security policies in schema.sql. Never put a secret key
   (service role key, Stripe secret key) in this file.
============================================================================ */

window.FLOWLINE_CONFIG = {
  // Supabase → Project Settings → API
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",

  // Stripe → Developers → API keys (the PUBLISHABLE key, not the secret one)
  STRIPE_PUBLISHABLE_KEY: "pk_live_or_pk_test_...",

  // The Stripe Price ID for your subscription (Product catalog → your product → pricing)
  STRIPE_PRICE_ID: "price_...",

  // Where your serverless functions live once deployed, e.g.
  // "https://your-site.netlify.app/.netlify/functions"
  FUNCTIONS_BASE_URL: "https://YOUR-SITE.netlify.app/.netlify/functions"
};
