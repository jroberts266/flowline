// netlify/functions/stripe-webhook.js
//
// Stripe calls this URL whenever something changes on a subscription
// (created, renewed, canceled, payment failed, etc). This is the ONLY place
// that writes to the `subscriptions` table — never trust the browser to
// report its own subscription status.
//
// Set this function's URL as a webhook endpoint in the Stripe Dashboard:
//   https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
// Subscribe it to at least: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body;
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {

      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const userId = session.client_reference_id;
        if (userId && session.subscription){
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await upsertSubscription({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: sub.id,
            status: sub.status,
            price_id: sub.items.data[0]?.price?.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object;
        const userId = sub.metadata && sub.metadata.supabase_user_id;
        const patch = {
          stripe_subscription_id: sub.id,
          status: sub.status === 'active' || sub.status === 'trialing' ? sub.status : (stripeEvent.type === 'customer.subscription.deleted' ? 'canceled' : sub.status),
          price_id: sub.items.data[0]?.price?.id,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        };
        if (userId){
          await upsertSubscription({ user_id: userId, stripe_customer_id: sub.customer, ...patch });
        } else {
          // fall back to matching by stripe_customer_id if metadata wasn't set
          await supabase.from('subscriptions').update(patch).eq('stripe_customer_id', sub.customer);
        }
        break;
      }

      default:
        // ignore other event types
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

async function upsertSubscription(row){
  const { error } = await supabase
    .from('subscriptions')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) console.error('Supabase upsert error:', error);
}
