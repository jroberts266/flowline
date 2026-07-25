// netlify/functions/create-checkout-session.js
//
// Called by the browser (via Flowline.startCheckout()) once a signed-in user
// clicks "Upgrade to Pro". Creates a Stripe Checkout session for the
// subscription price and returns the URL to redirect the user to.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST'){
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { user_id, email } = JSON.parse(event.body || '{}');
    if (!user_id || !email){
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing user_id or email' }) };
    }

    // Reuse an existing Stripe customer if this user already has one.
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    const siteUrl = process.env.SITE_URL || 'https://vocal-sherbet-5889b4.netlify.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer: existing && existing.stripe_customer_id ? existing.stripe_customer_id : undefined,
      customer_email: existing && existing.stripe_customer_id ? undefined : email,
      client_reference_id: user_id,
      subscription_data: { metadata: { supabase_user_id: user_id } },
      success_url: `${siteUrl}/flowline-account.html?checkout=success`,
      cancel_url: `${siteUrl}/flowline-account.html?checkout=canceled`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
