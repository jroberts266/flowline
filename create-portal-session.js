// netlify/functions/create-portal-session.js
//
// Called when a subscribed user clicks "Manage billing". Sends them to
// Stripe's hosted customer portal so they can update payment method,
// change plan, or cancel — no custom billing UI needed on our side.

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST'){
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { user_id } = JSON.parse(event.body || '{}');
    if (!user_id){
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing user_id' }) };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    if (error || !data || !data.stripe_customer_id){
      return { statusCode: 400, body: JSON.stringify({ error: 'No billing account found for this user yet.' }) };
    }

    const siteUrl = process.env.SITE_URL || 'https://YOUR-SITE.netlify.app';

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${siteUrl}/flowline-account.html`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
