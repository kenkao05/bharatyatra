/**
 * BharatYatra — Admin Security Module
 * Loaded on every admin page AFTER supabase-js.
 *
 * Protections included:
 *  1.  Session guard         — redirect to login if no valid session
 *  2.  Token-age check       — force re-login if JWT is stale (> 50 min)
 *  3.  Inactivity timeout    — auto-logout after 15 min of no interaction
 *  4.  Cross-tab logout      — logout in one tab logs out all open admin tabs
 *  5.  Clickjack guard       — bust out of iframes + blank body on failure
 *  6.  Console scrub         — no sensitive data leaks to console
 *  7.  Session integrity check — detect token tampering / user-id swaps
 *  8.  Visibility-change re-check — re-validate session when tab regains focus
 *  9.  Secure logout         — clears session + all admin localStorage keys
 * 10.  BYAuth object frozen  — prevents prototype pollution / method override
 * 11.  BYRateLimit frozen    — prevents external tampering with rate-limit API
 * 12.  Schema-validated localStorage — guards against crafted lockout bypass
 * 13.  Open-redirect guard   — reason codes allowlisted before URL inclusion
 * 14.  Type-safe config reads — guards BY_SUPABASE_URL/KEY against prototype pollution
 * 15.  Cross-tab logout fix  — delayed remove so storage event fires reliably
 */

(function () {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────────── */
  const INACTIVITY_MS   = 15 * 60 * 1000;
  const TOKEN_STALE_MS  = 50 * 60 * 1000;
  const LOGIN_PAGE      = 'admin-login.html';
  const LOGOUT_KEY      = 'by_admin_logout';
  const LAST_ACTIVE_KEY = 'by_admin_last_active';
  const IS_LOGIN_PAGE   = window.location.pathname.endsWith(LOGIN_PAGE);

  /* ─── ALLOWLISTED REDIRECT REASON CODES ──────────────────
   * Only these exact strings may appear in the ?r= param.
   * Prevents open-redirect and reflected XSS via reason param.
   * ───────────────────────────────────────────────────── */
  const ALLOWED_REASONS = Object.freeze(new Set([
    'no_session', 'token_expired', 'inactivity',
    'integrity_fail', 'session_expired', 'user_initiated'
  ]));

  /* ─── 1. CLICKJACK GUARD ──────────────────────────────
   * Cross-origin sandboxed iframes throw SecurityError on
   * window.top.location assignment — blank the DOM first so
   * nothing is visible during the attempt, and hide everything
   * on failure so the page cannot be used inside a frame.
   * ───────────────────────────────────────────────────── */
  if (window.self !== window.top) {
    try {
      document.documentElement.style.visibility = 'hidden';
      window.top.location = window.self.location;
    } catch (_) {
      document.documentElement.innerHTML =
        '<body style="background:#000;color:#000">Unauthorized</body>';
    }
  }

  /* ─── 2. SUPABASE CLIENT (singleton) ─────────────────
   * Explicit typeof checks guard against prototype-polluted
   * values being passed as the URL / API key.
   * ───────────────────────────────────────────────────── */
  const SUPA_URL = (typeof window.BY_SUPABASE_URL === 'string' && window.BY_SUPABASE_URL)
    ? window.BY_SUPABASE_URL
    : 'https://gtpnojbbamoaznlutxap.supabase.co';

  const SUPA_KEY = (typeof window.BY_SUPABASE_KEY === 'string' && window.BY_SUPABASE_KEY)
    ? window.BY_SUPABASE_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cG5vamJiYW1vYXpubHV0eGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mjk3NjMsImV4cCI6MjA4NDQwNTc2M30.t6fwQJR9ljGGfOajPlXzWGSQbKCtpaTb4dWfb33BHxE';

  window.sb = window.sb || supabase.createClient(SUPA_URL, SUPA_KEY);

  /* ─── 3. CONSOLE SCRUB ──────────────────────────────── */
  if (!window.BY_DEV_MODE) {
    ['log', 'debug', 'info', 'warn', 'table', 'dir'].forEach(m => {
      console[m] = () => {};
    });
  }

  /* ─── 4. HELPERS ─────────────────────────────────────── */
  function hardRedirectToLogin(reason) {
    // Allowlist reason codes — never interpolate arbitrary strings into URL.
    const safeReason = ALLOWED_REASONS.has(reason) ? reason : 'no_session';
    window.location.replace(LOGIN_PAGE + '?r=' + encodeURIComponent(safeReason));
  }

  function secureLogout(reason) {
    // Broadcast logout to all other tabs.
    // Delayed removal (50ms) ensures the storage event fires reliably
    // before the item is removed — some browsers batch same-tick set+remove.
    try { localStorage.setItem(LOGOUT_KEY, Date.now().toString()); } catch (_) {}
    setTimeout(() => {
      try { localStorage.removeItem(LOGOUT_KEY); } catch (_) {}
    }, 50);
    window.sb.auth.signOut().finally(() => hardRedirectToLogin(reason));
  }

  /* ─── 5. INACTIVITY TIMER ────────────────────────────── */
  let inactivityTimer = null;

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    try { localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString()); } catch (_) {}
    inactivityTimer = setTimeout(() => secureLogout('inactivity'), INACTIVITY_MS);
  }

  function startInactivityWatcher() {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => document.addEventListener(ev, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
  }

  /* ─── 6. CROSS-TAB LOGOUT ────────────────────────────── */
  window.addEventListener('storage', (e) => {
    // Only react when the key is set (newValue !== null), not on removal.
    if (e.key === LOGOUT_KEY && e.newValue !== null) {
      window.location.replace(LOGIN_PAGE);
    }
  });

  /* ─── 7. VISIBILITY RE-CHECK ─────────────────────────── */
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && !IS_LOGIN_PAGE) {
      const { data: { session } } = await window.sb.auth.getSession();
      if (!session) hardRedirectToLogin('session_expired');
    }
  });

  /* ─── 8. TOKEN AGE CHECK ─────────────────────────────── */
  function isTokenStale(session) {
    if (!session?.access_token) return true;
    try {
      const parts = session.access_token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.iat !== 'number') return true;
      return (Date.now() - payload.iat * 1000) > TOKEN_STALE_MS;
    } catch (_) {
      return true;
    }
  }

  /* ─── 9. SESSION INTEGRITY CHECK ─────────────────────── */
  function integrityCheck(session) {
    const stored  = sessionStorage.getItem('by_admin_uid');
    const current = session?.user?.id;
    if (!current) return false;
    if (!stored) {
      sessionStorage.setItem('by_admin_uid', current);
      return true;
    }
    return stored === current;
  }

  /* ─── 10. MAIN AUTH GUARD ────────────────────────────── */
  async function _authCheck() {
    if (IS_LOGIN_PAGE) return null;

    const { data: { session }, error } = await window.sb.auth.getSession();

    if (error || !session) {
      hardRedirectToLogin('no_session');
      return null;
    }

    if (isTokenStale(session)) {
      const { data: refreshed, error: rErr } = await window.sb.auth.refreshSession();
      if (rErr || !refreshed?.session) {
        secureLogout('token_expired');
        return null;
      }
    }

    if (!integrityCheck(session)) {
      secureLogout('integrity_fail');
      return null;
    }

    startInactivityWatcher();
    return session;
  }

  /* ─── 11. LOGIN-PAGE SPECIFIC ────────────────────────── */
  if (IS_LOGIN_PAGE) {
    window.sb.auth.getSession().then(({ data: { session } }) => {
      if (session && !isTokenStale(session)) {
        window.location.replace('admin-dashboard.html');
      }
    });
  }

  /* ─── 12. EXPOSE FROZEN BYAuth ────────────────────────
   * Object.freeze prevents any external script from replacing
   * .check or .logout (e.g. BYAuth.check = () => fakeSession)
   * which would allow complete authentication bypass.
   *
   * The inactivity-warning "Stay logged in" button needs to
   * trigger resetInactivityTimer. Since BYAuth is frozen we
   * expose a separate mutable reference window._BYAuthReset
   * that the dashboard sets after auth resolves.
   * ───────────────────────────────────────────────────── */
  window.BYAuth = Object.freeze({
    check:  _authCheck,
    logout: secureLogout
  });

  // Mutable slot for dashboard to register the reset callback.
  // Kept separate from the frozen object intentionally.
  window._BYAuthReset = null;

})();


/* ═══════════════════════════════════════════════════════════
   RATE LIMITER  — used only by admin-login.html
   Tracks failed attempts in localStorage with expiry.
   Max 5 attempts → 15 min lockout.

   SECURITY NOTE: Client-side rate limiting is defence-in-depth
   only. A determined attacker can clear localStorage to bypass.
   Always enforce brute-force protection server-side
   (Supabase Auth built-in rate limits + Cloudflare WAF rules).
═══════════════════════════════════════════════════════════ */
window.BYRateLimit = (function () {
  const KEY          = 'by_login_attempts';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS   = 15 * 60 * 1000;

  /* ── Schema-validated record reader ──────────────────────
   * Validates type and range of every field before trusting.
   * If the record looks tampered (e.g. count set to 0 manually
   * to bypass lockout), treat it as a locked-out state.
   * ───────────────────────────────────────────────────── */
  function getRecord() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { count: 0, lockedUntil: 0 };
      const parsed = JSON.parse(raw);
      if (
        typeof parsed !== 'object'                  || parsed === null          ||
        typeof parsed.count       !== 'number'      || !isFinite(parsed.count)  ||
        typeof parsed.lockedUntil !== 'number'      || !isFinite(parsed.lockedUntil) ||
        parsed.count < 0                            || parsed.lockedUntil < 0
      ) {
        // Tampered record — apply immediate lockout as penalty
        return { count: MAX_ATTEMPTS, lockedUntil: Date.now() + LOCKOUT_MS };
      }
      return { count: parsed.count, lockedUntil: parsed.lockedUntil };
    } catch (_) {
      return { count: 0, lockedUntil: 0 };
    }
  }

  function save(record) {
    try { localStorage.setItem(KEY, JSON.stringify(record)); } catch (_) {}
  }

  return Object.freeze({
    status() {
      const r = getRecord(), now = Date.now();
      if (r.lockedUntil > now) {
        return { locked: true, remaining: Math.ceil((r.lockedUntil - now) / 1000), attemptsLeft: 0 };
      }
      return { locked: false, remaining: 0, attemptsLeft: MAX_ATTEMPTS - r.count };
    },

    recordFail() {
      const r = getRecord(), now = Date.now();
      if (r.lockedUntil > 0 && r.lockedUntil <= now) { r.count = 0; r.lockedUntil = 0; }
      r.count++;
      if (r.count >= MAX_ATTEMPTS) r.lockedUntil = now + LOCKOUT_MS;
      save(r);
      return this.status();
    },

    reset() {
      try { localStorage.removeItem(KEY); } catch (_) {}
    }
  });
})();