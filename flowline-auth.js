/* ============================================================================
   Flowline — shared auth + data layer
   Wraps the Supabase JS client so every page can call simple functions
   instead of repeating Supabase boilerplate. Requires flowline-config.js
   and the Supabase JS CDN script to be loaded first.
============================================================================ */
(function(){
  const cfg = window.FLOWLINE_CONFIG || {};
  const CONFIGURED = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT');

  let client = null;
  if (CONFIGURED && window.supabase){
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  async function getUser(){
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data ? data.user : null;
  }

  async function getSession(){
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data ? data.session : null;
  }

  async function signUp(email, password){
    if (!client) throw new Error('Flowline is not connected to Supabase yet — fill in flowline-config.js');
    return client.auth.signUp({ email, password });
  }

  async function signIn(email, password){
    if (!client) throw new Error('Flowline is not connected to Supabase yet — fill in flowline-config.js');
    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut(){
    if (!client) return;
    await client.auth.signOut();
    window.location.reload();
  }

  async function getSubscription(){
    const user = await getUser();
    if (!user || !client) return { status: 'none' };
    const { data, error } = await client
      .from('subscriptions')
      .select('status, current_period_end, price_id')
      .eq('user_id', user.id)
      .single();
    if (error || !data) return { status: 'none' };
    return data;
  }

  function isActive(sub){
    return sub && (sub.status === 'active' || sub.status === 'trialing');
  }

  // ---------------- Saved items (per-user tool data) ----------------

  async function saveItem(tool, title, data, existingId){
    const user = await getUser();
    if (!user) throw new Error('Sign in to save.');
    if (existingId){
      const { data: row, error } = await client
        .from('saved_items')
        .update({ title, data })
        .eq('id', existingId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return row;
    } else {
      const { data: row, error } = await client
        .from('saved_items')
        .insert({ user_id: user.id, tool, title, data })
        .select()
        .single();
      if (error) throw error;
      return row;
    }
  }

  async function listItems(tool){
    const user = await getUser();
    if (!user) return [];
    const { data, error } = await client
      .from('saved_items')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .eq('tool', tool)
      .order('updated_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  }

  async function loadItem(id){
    const { data, error } = await client
      .from('saved_items')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteItem(id){
    const user = await getUser();
    if (!user) return;
    await client.from('saved_items').delete().eq('id', id).eq('user_id', user.id);
  }

  // ---------------- Stripe checkout / billing portal ----------------

  async function startCheckout(){
    const user = await getUser();
    if (!user) throw new Error('Sign in first.');
    const res = await fetch(`${cfg.FUNCTIONS_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, email: user.email })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Could not start checkout.');
    window.location.href = body.url;
  }

  async function openBillingPortal(){
    const user = await getUser();
    if (!user) throw new Error('Sign in first.');
    const res = await fetch(`${cfg.FUNCTIONS_BASE_URL}/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Could not open billing portal.');
    window.location.href = body.url;
  }

  // ---------------- Nav account widget ----------------

  function esc(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function mountAccountWidget(){
    const el = document.getElementById('account-widget');
    if (!el) return;

    if (!CONFIGURED){
      el.innerHTML = `<a class="nav-link" href="flowline-account.html" style="color:var(--ink-faint);">Account (not configured)</a>`;
      return;
    }

    const user = await getUser();
    if (!user){
      el.innerHTML = `<a class="nav-link" href="flowline-account.html">Sign in</a>`;
      return;
    }
    const sub = await getSubscription();
    const label = isActive(sub) ? 'My account · Pro' : 'My account';
    el.innerHTML = `<a class="nav-link" href="flowline-account.html">${esc(label)}</a>`;
  }

  window.Flowline = {
    configured: CONFIGURED,
    client,
    getUser, getSession, signUp, signIn, signOut,
    getSubscription, isActive,
    saveItem, listItems, loadItem, deleteItem,
    startCheckout, openBillingPortal,
    mountAccountWidget
  };

  document.addEventListener('DOMContentLoaded', mountAccountWidget);
})();
