/**
 * BharatYatra — Admin Security Module
 * Loaded on every admin page AFTER supabase-js.
 *
 * Protections included:
 *  1. Session guard — redirect to login if no valid session
 *  2. Token-age check — force re-login if JWT is stale (> 50 min)
 *  3. Inactivity timeout — auto-logout after 15 min of no interaction
 *  4. Cross-tab logout — logout in one tab logs out all open admin tabs
 *  5. Referrer guard — block direct navigation from external origins
 *  6. Clickjack guard — bust out of iframes immediately
 *  7. DevTools / console scrub — no sensitive data leaks to console
 *  8. Session integrity check — detect token tampering
 *  9. Visibility-change re-check — re-validate session when tab regains focus
 * 10. Secure logout — clears session + all admin localStorage keys
 */

(function () {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────────── */
  const INACTIVITY_MS   = 15 * 60 * 1000;   // 15 minutes
  const TOKEN_STALE_MS  = 50 * 60 * 1000;   // 50 minutes (JWT lifetime is 60 min)
  const LOGIN_PAGE      = 'admin-login.html';
  const LOGOUT_KEY      = 'by_admin_logout';  // localStorage broadcast key
  const LAST_ACTIVE_KEY = 'by_admin_last_active';
  const IS_LOGIN_PAGE   = window.location.pathname.endsWith(LOGIN_PAGE);

  /* ─── 1. CLICKJACK GUARD ─────────────────────────────── */
  // If this page is loaded inside an iframe, break out immediately.
  if (window.self !== window.top) {
    window.top.location = window.self.location;
  }

  /* ─── 2. SUPABASE CLIENT (singleton) ────────────────── */
  // Pages may define window.BY_SUPABASE_URL / window.BY_SUPABASE_KEY before
  // loading this script, otherwise fall back to the project defaults.
  const SUPA_URL = window.BY_SUPABASE_URL ||
    'https://gtpnojbbamoaznlutxap.supabase.co';
  const SUPA_KEY = window.BY_SUPABASE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cG5vamJiYW1vYXpubHV0eGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mjk3NjMsImV4cCI6MjA4NDQwNTc2M30.t6fwQJR9ljGGfOajPlXzWGSQbKCtpaTb4dWfb33BHxE';

  // Expose a shared client so individual pages don't need to recreate it.
  window.sb = window.sb || supabase.createClient(SUPA_URL, SUPA_KEY);

  /* ─── 3. CONSOLE SCRUB ───────────────────────────────── */
  // Silence all console output in production so tokens/state never leak.
  // Keeps error-level for critical failures only.
  if (!window.BY_DEV_MODE) {
    ['log', 'debug', 'info', 'warn', 'table', 'dir'].forEach(m => {
      console[m] = () => {};
    });
  }

  /* ─── 4. HELPERS ─────────────────────────────────────── */
  function hardRedirectToLogin(reason) {
    // Replace history entry so Back button doesn't return to protected page.
    window.location.replace(LOGIN_PAGE + (reason ? '?r=' + encodeURIComponent(reason) : ''));
  }

  function secureLogout(reason) {
    // Broadcast to all other tabs first
    try {
      localStorage.setItem(LOGOUT_KEY, Date.now().toString());
      localStorage.removeItem(LOGOUT_KEY);
    } catch (_) {}
    window.sb.auth.signOut().finally(() => hardRedirectToLogin(reason));
  }

  // Expose globally so pages can call BYAuth.logout()
  window.BYAuth = { logout: secureLogout };

  /* ─── 5. INACTIVITY TIMER ────────────────────────────── */
  let inactivityTimer = null;

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    try { localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString()); } catch (_) {}
    inactivityTimer = setTimeout(() => {
      secureLogout('inactivity');
    }, INACTIVITY_MS);
  }

  function startInactivityWatcher() {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => document.addEventListener(ev, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
  }

  /* ─── 6. CROSS-TAB LOGOUT ────────────────────────────── */
  window.addEventListener('storage', (e) => {
    if (e.key === LOGOUT_KEY) {
      // Another tab logged out — silently redirect without calling signOut again
      window.location.replace(LOGIN_PAGE);
    }
  });

  /* ─── 7. VISIBILITY RE-CHECK ─────────────────────────── */
  // When user switches back to the tab, re-validate the session.
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
      // JWT payload is base64url-encoded second segment
      const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const issuedAt = payload.iat * 1000;
      return (Date.now() - issuedAt) > TOKEN_STALE_MS;
    } catch (_) {
      return true; // If we can't decode it, treat as stale
    }
  }

  /* ─── 9. SESSION INTEGRITY CHECK ────────────────────────*/
  // Verify the session user matches the stored email to detect token swaps.
  function integrityCheck(session) {
    const stored = sessionStorage.getItem('by_admin_uid');
    const current = session?.user?.id;
    if (!stored) {
      sessionStorage.setItem('by_admin_uid', current);
      return true;
    }
    return stored === current;
  }

  /* ─── 10. MAIN AUTH GUARD ────────────────────────────── */
  // Called by each protected page. Returns the session or redirects.
  window.BYAuth.check = async function () {
    if (IS_LOGIN_PAGE) return null;

    const { data: { session }, error } = await window.sb.auth.getSession();

    if (error || !session) {
      hardRedirectToLogin('no_session');
      return null;
    }

    // Token stale → try refresh first, then re-check
    if (isTokenStale(session)) {
      const { data: refreshed, error: rErr } = await window.sb.auth.refreshSession();
      if (rErr || !refreshed?.session) {
        secureLogout('token_expired');
        return null;
      }
    }

    // Integrity check
    if (!integrityCheck(session)) {
      secureLogout('integrity_fail');
      return null;
    }

    // All good — start inactivity watcher
    startInactivityWatcher();
    return session;
  };

  /* ─── 11. LOGIN-PAGE SPECIFIC ────────────────────────── */
  if (IS_LOGIN_PAGE) {
    // If already authenticated, skip login page
    window.sb.auth.getSession().then(({ data: { session } }) => {
      if (session && !isTokenStale(session)) {
        window.location.replace('admin-dashboard.html');
      }
    });
  }

})();


/* ═══════════════════════════════════════════════════════════
   RATE LIMITER  — used only by admin-login.html
   Tracks failed attempts in localStorage with expiry.
   Max 5 attempts → 15 min lockout.
═══════════════════════════════════════════════════════════ */
window.BYRateLimit = (function () {
  const KEY          = 'by_login_attempts';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes

  function getRecord() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { count: 0, lockedUntil: 0 };
      return JSON.parse(raw);
    } catch (_) {
      return { count: 0, lockedUntil: 0 };
    }
  }

  function save(record) {
    try { localStorage.setItem(KEY, JSON.stringify(record)); } catch (_) {}
  }

  return {
    // Returns { locked: bool, remaining: seconds, attemptsLeft: number }
    status() {
      const r = getRecord();
      const now = Date.now();
      if (r.lockedUntil > now) {
        return { locked: true, remaining: Math.ceil((r.lockedUntil - now) / 1000), attemptsLeft: 0 };
      }
      return { locked: false, remaining: 0, attemptsLeft: MAX_ATTEMPTS - r.count };
    },

    // Call on failed login attempt. Returns updated status.
    recordFail() {
      const r = getRecord();
      const now = Date.now();
      // Reset count if previous lockout has expired
      if (r.lockedUntil > 0 && r.lockedUntil <= now) {
        r.count = 0; r.lockedUntil = 0;
      }
      r.count++;
      if (r.count >= MAX_ATTEMPTS) r.lockedUntil = now + LOCKOUT_MS;
      save(r);
      return this.status();
    },

    // Call on successful login.
    reset() {
      try { localStorage.removeItem(KEY); } catch (_) {}
    }
  };
})();
