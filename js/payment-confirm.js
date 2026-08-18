/* ============================================
   MagicArt Fest - confirmarea platii
   (doar paginile de multumire: /inscriere/succes si versiunile /en/ si /es/)

   Stripe ne trimite inapoi cu ?sid=<id sesiune>. Trimitem id-ul o singura data
   catre /api/payment-confirm, care il verifica la Stripe si marcheaza plata in
   Brevo si in baza de date. Serverul nu crede nimic altceva din pagina asta.

   Nimic din ce se intampla aici nu se vede si nu blocheaza pagina: daca apelul
   pica, plata exista oricum la Stripe si organizatorul o prinde cu
   sincronizarea in masa. Vizitatorul nu are ce face cu o eroare tehnica.
   ============================================ */

(function () {
    'use strict';

    var params;
    try {
        params = new URLSearchParams(window.location.search);
    } catch (e) {
        return;
    }

    var sid = params.get('sid');
    if (!sid || sid.indexOf('cs_') !== 0) return;

    // O singura chemare per sesiune, chiar daca omul reincarca pagina.
    var flag = 'maf_pay_' + sid;
    try {
        if (window.sessionStorage && window.sessionStorage.getItem(flag)) return;
        if (window.sessionStorage) window.sessionStorage.setItem(flag, '1');
    } catch (e) {
        // Stocarea blocata (mod privat) - continuam oricum; confirmarea e
        // idempotenta pe server.
    }

    try {
        fetch('/api/payment-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid: sid })
        }).catch(function () {});
    } catch (e) {
        return;
    }

    // Scoatem id-ul din bara de adresa: nu are ce cauta intr-un link trimis
    // mai departe sau intr-un istoric de browser.
    try {
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    } catch (e) {
        // fara importanta
    }
})();
