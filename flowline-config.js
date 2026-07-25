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
  SUPABASE_URL: "https://atbyszhbjahuutokdcgv.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0YnlzemhiamFodXV0b2tkY2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5Njg4NDYsImV4cCI6MjEwMDU0NDg0Nn0.M19LsxTUC2PTRv3S7WZPxiBTM7tSWaU-4bNgHyiV-iA",

  // Stripe → Developers → API keys (the PUBLISHABLE key, not the secret one)
  STRIPE_PUBLISHABLE_KEY: "ppk_test_51Tx7LYBUHLeN9mfLBBl2v7A3xqCT4AWlm9gWpaOwKjS0PKgY9TDsxqDTHKFS4HMUabNR28uaRpE6PUW3IhcGqmIS00leHNHRtF",

  // The Stripe Price ID for your subscription (Product catalog → your product → pricing)
  STRIPE_PRICE_ID: "prod_Ux1RzWNqhDnBKk",

  // Where your serverless functions live once deployed, e.g.
  // "https://your-site.netlify.app/.netlify/functions"
  FUNCTIONS_BASE_URL: "https://vocal-sherbet-5889b4.netlify.app/.netlify/functions"
};
