// ══════════════════════════════════════════════════════════════
// Novalink — App Check initialization (SAFE MODE)
// ══════════════════════════════════════════════════════════════
//
// IMPORTANT:
// App Check is DISABLED by default in this file.
// Sign-in and Firestore work WITHOUT App Check.
// Only enable App Check if you have fully configured reCAPTCHA v3
// in Firebase Console AND added the reCAPTCHA script to every page.
//
// If you turn this on without proper setup, sign-in will fail with:
//   "auth/network-request-failed"
//
// To enable: change APP_CHECK_ENABLED to true below.
// ══════════════════════════════════════════════════════════════

(function(){
  'use strict';

  // ─── MASTER SWITCH ─────────────────────────────────────────
  // Keep this FALSE until App Check is fully configured.
  // Setting it to true with incomplete setup WILL break sign-in.
  var APP_CHECK_ENABLED = false;
  // ───────────────────────────────────────────────────────────

  // Your reCAPTCHA v3 site key (only used when APP_CHECK_ENABLED is true)
  var RECAPTCHA_SITE_KEY = '6LcyA8ktAAAAALSj6lCqtB9z9QfQhGf4jdnC9MKu';

  // If App Check is disabled, do nothing and exit immediately.
  if (!APP_CHECK_ENABLED) {
    console.log('[App Check] Disabled (safe mode) — Firebase works without it');
    return;
  }

  function initAppCheck() {
    // Wait for Firebase core to load
    if (typeof firebase === 'undefined' || !firebase.appCheck) {
      setTimeout(initAppCheck, 100);
      return;
    }

    // Wait for reCAPTCHA to load
    if (typeof grecaptcha === 'undefined') {
      console.warn('[App Check] reCAPTCHA not loaded — App Check skipped');
      return;
    }

    try {
      firebase.appCheck().activate(RECAPTCHA_SITE_KEY, true);
      console.log('[App Check] Activated');
    } catch (e) {
      console.warn('[App Check] Error (non-fatal):', e.message);
      // DO NOT throw — let Firebase work without App Check
    }
  }

  // Small delay to ensure reCAPTCHA script has loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(initAppCheck, 200); });
  } else {
    setTimeout(initAppCheck, 200);
  }
})();
