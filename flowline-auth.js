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
    if (!user || !client) return { status: 'none', trial_ends_at: null };
    const { data, error } = await client
      .from('subscriptions')
      .select('status, current_period_end, price_id, trial_ends_at')
      .eq('user_id', user.id)
      .single();
    if (error || !data) return { status: 'none', trial_ends_at: null };
    return data;
  }

  // "Paying" = a real Stripe subscription (active or Stripe-side trialing).
  // This is what gates SAVING — the free 10-day trial below does not count.
  function isPaying(sub){
    return !!(sub && (sub.status === 'active' || sub.status === 'trialing'));
  }

  // Our own free trial, started automatically at signup — no payment info,
  // no Stripe involvement. Grants tool USE, not saving.
  function isTrialActive(sub){
    return !!(sub && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() > Date.now());
  }

  function trialDaysLeft(sub){
    if (!isTrialActive(sub)) return 0;
    const ms = new Date(sub.trial_ends_at).getTime() - Date.now();
    return Math.max(1, Math.ceil(ms / 86400000));
  }

  // Can this person use the tools at all right now?
  function canUseTools(sub){
    return isPaying(sub) || isTrialActive(sub);
  }

  // Kept as an alias for isPaying — used by the account page to decide
  // whether to show "Manage billing" vs. "Upgrade to Pro".
  function isActive(sub){
    return isPaying(sub);
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

  // ---------------- Lead capture (consulting / training interest) ----------------
  // No login required — same pattern as feedback: public can insert, nobody
  // (including the submitter) can read back through the public API.

  async function submitLead({ name, email, company, interest, message }){
    if (!client) throw new Error('Flowline is not connected to Supabase yet — fill in flowline-config.js');
    if (!email || !email.trim()) throw new Error('Please enter an email address.');
    const { error } = await client.from('leads').insert({
      name: name || null,
      email: email.trim(),
      company: company || null,
      interest: interest || 'general',
      message: message || null,
      page_url: window.location.href
    });
    if (error) throw error;
  }

  // ---------------- Contact / feedback form ----------------
  // No login required — this works for anonymous visitors too, since the
  // feedback table's insert policy allows public submissions.

  async function submitFeedback({ name, email, category, message }){
    if (!client) throw new Error('Flowline is not connected to Supabase yet — fill in flowline-config.js');
    if (!message || !message.trim()) throw new Error('Please enter a message.');
    const { error } = await client.from('feedback').insert({
      name: name || null,
      email: email || null,
      category: category || 'general',
      message: message.trim(),
      page_url: window.location.href
    });
    if (error) throw error;
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
      el.innerHTML = '';
      return;
    }

    const user = await getUser();
    el.innerHTML = user
      ? `<span style="font-size:11.5px;color:var(--ink-faint);">Signed in</span>`
      : '';
  }

  // ---------------- Tool usage gate (currently disabled) ----------------
  // Flowline moved away from gating tool usage behind a trial/subscription —
  // every tool is free for everyone now, signed in or not. This function is
  // left in place (unused) in case a future version wants to reintroduce a
  // gate; it's simply never called automatically below anymore.
  //
  // Worth knowing if you ever do turn this back on: like any client-side
  // check, it's a product/UX gate, not a hard security boundary — someone
  // determined could bypass it with browser dev tools. The actual security
  // boundary is server-side: saving data requires a real signed-in session
  // and is enforced by Supabase's row-level security policies regardless of
  // what any overlay shows.

  function buildGateOverlay(kind){
    const overlay = document.createElement('div');
    overlay.id = 'flowline-gate-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(250,250,247,0.97);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;';
    const box = document.createElement('div');
    box.style.cssText = "max-width:420px;text-align:center;background:#fff;border:1px solid #DCDFCE;border-radius:8px;padding:32px 28px;box-shadow:0 4px 20px rgba(27,42,74,0.12);font-family:'Inter',sans-serif;";

    if (kind === 'signup'){
      box.innerHTML = `
        <h2 style="font-family:'IBM Plex Mono',monospace;font-size:18px;margin:0 0 10px;color:#1B2A4A;">Sign up to use this tool</h2>
        <p style="font-size:13.5px;color:#5A6B8C;line-height:1.6;margin:0 0 20px;">Flowline's tools are free to try for 10 days — no payment info needed. Create an account to get started.</p>
        <a href="flowline-account.html" style="display:inline-block;padding:10px 22px;background:#1B2A4A;color:#fff;border-radius:4px;font-size:13px;font-weight:600;text-decoration:none;">Sign up free</a>
      `;
    } else {
      box.innerHTML = `
        <h2 style="font-family:'IBM Plex Mono',monospace;font-size:18px;margin:0 0 10px;color:#1B2A4A;">Your free trial has ended</h2>
        <p style="font-size:13.5px;color:#5A6B8C;line-height:1.6;margin:0 0 20px;">Subscribe to keep using Flowline's tools.</p>
        <button id="flowline-gate-upgrade" style="padding:10px 22px;background:#1B2A4A;color:#fff;border-radius:4px;font-size:13px;font-weight:600;border:none;cursor:pointer;">Upgrade to Pro</button>
        <div style="margin-top:12px;"><a href="flowline-account.html" style="font-size:12px;color:#9AA6BE;">Go to my account</a></div>
      `;
    }
    overlay.appendChild(box);
    return overlay;
  }

  async function enforceToolGate(){
    if (!CONFIGURED) return; // don't block tool usage while the backend isn't set up yet
    if (document.getElementById('flowline-gate-overlay')) return;

    const user = await getUser();
    if (!user){
      document.body.appendChild(buildGateOverlay('signup'));
      return;
    }
    const sub = await getSubscription();
    if (canUseTools(sub)) return;

    const overlay = buildGateOverlay('expired');
    document.body.appendChild(overlay);
    const btn = overlay.querySelector('#flowline-gate-upgrade');
    if (btn) btn.onclick = () => startCheckout().catch(e => alert(e.message));
  }

  window.Flowline = {
    configured: CONFIGURED,
    client,
    getUser, getSession, signUp, signIn, signOut,
    getSubscription, isActive, isPaying, isTrialActive, trialDaysLeft, canUseTools,
    saveItem, listItems, loadItem, deleteItem,
    submitFeedback, submitLead,
    startCheckout, openBillingPortal,
    mountAccountWidget, enforceToolGate
  };

  // Note: enforceToolGate() is intentionally not called here anymore — see
  // the comment above. Every tool page is open to everyone by default now.
  document.addEventListener('DOMContentLoaded', () => {
    mountAccountWidget();
  });
})();
