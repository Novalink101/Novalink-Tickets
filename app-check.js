// Novalink — App Check initialization
// Loads after Firebase core but before any Firestore/Auth usage
(function(){
  'use strict';

  function initAppCheck() {
    if (typeof firebase === 'undefined' || !firebase.appCheck) {
      setTimeout(initAppCheck, 50);
      return;
    }

    try {
      firebase.appCheck().activate(
        '6LcyA8ktAAAAALSj6lCqtB9z9QfQhGf4jdnC9MKu',
        true
      );
      console.log('[App Check] Activated');
    } catch (e) {
      console.log('[App Check] Already active or error:', e.message);
    }
  }

  initAppCheck();
})();
