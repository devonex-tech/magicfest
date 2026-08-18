/* ============================================
   MagicArt Fest - Site-wide JavaScript
   (newsletter: popup + formular în footer - pe toate paginile)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const i18nEl = document.getElementById('mafNlI18n');
    if (!i18nEl) return;

    let i18n;
    try {
        i18n = JSON.parse(i18nEl.textContent);
    } catch (e) {
        return;
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 zile

    // localStorage poate arunca (private mode) - acces protejat
    function lsGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function lsSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignorat */ }
    }

    // Leagă un formular de newsletter (popup sau footer) de API
    function wireNewsletterForm(form, emailInput, consentInput, statusEl, onSuccess) {
        if (!form || !emailInput || !consentInput || !statusEl) return;

        function setStatus(message, type) {
            statusEl.textContent = message;
            statusEl.classList.remove('success', 'error');
            if (type) statusEl.classList.add(type);
        }

        let sending = false;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (sending) return;

            const email = emailInput.value.trim();
            if (!EMAIL_RE.test(email)) {
                setStatus(i18n.err_email, 'error');
                return;
            }
            if (!consentInput.checked) {
                setStatus(i18n.err_consent, 'error');
                return;
            }

            setStatus('', null);
            sending = true;

            fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, consent: true, lang: i18n.lang })
            }).then((res) => {
                sending = false;
                if (res.ok) {
                    setStatus(i18n.success, 'success');
                    lsSet('maf_newsletter', 'subscribed');
                    form.reset();
                    if (onSuccess) onSuccess();
                } else {
                    setStatus(i18n.error, 'error');
                }
            }).catch(() => {
                sending = false;
                setStatus(i18n.error, 'error');
            });
        });
    }

    // ---- Formular newsletter în footer (mereu vizibil) ----
    wireNewsletterForm(
        document.getElementById('nlFooterForm'),
        document.getElementById('nlFooterEmail'),
        document.getElementById('nlFooterConsent'),
        document.getElementById('nlFooterStatus'),
        null
    );

    // ---- Newsletter Popup ----
    const popup = document.getElementById('newsletterPopup');
    const closeBtn = document.getElementById('newsletterClose');
    const nlForm = document.getElementById('newsletterForm');
    const nlEmail = document.getElementById('newsletterEmail');
    const nlConsent = document.getElementById('newsletterConsent');
    const nlStatus = document.getElementById('newsletterStatus');

    if (!popup || !closeBtn || !nlForm || !nlEmail || !nlConsent || !nlStatus) {
        return;
    }

    function hidePopup() {
        popup.classList.remove('visible');
    }

    function dismiss() {
        hidePopup();
        lsSet('maf_newsletter_dismissed', String(Date.now()));
    }

    wireNewsletterForm(nlForm, nlEmail, nlConsent, nlStatus, () => {
        setTimeout(hidePopup, 2500);
    });

    closeBtn.addEventListener('click', dismiss);

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            dismiss();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup.classList.contains('visible')) {
            dismiss();
        }
    });

    // ---- Afișare automată popup ----
    function shouldShow() {
        if (lsGet('maf_newsletter') === 'subscribed') return false;
        const dismissed = parseInt(lsGet('maf_newsletter_dismissed'), 10);
        if (!isNaN(dismissed) && (Date.now() - dismissed) < DISMISS_TTL) return false;
        return true;
    }

    if (!shouldShow()) return;

    // Nu întrerupem conversia principală: fără popup pe pagina de înscriere
    if (document.getElementById('mafRegisterForm')) return;

    let shown = false;
    let timerId = null;

    function showPopup() {
        if (shown || !shouldShow()) return;
        shown = true;
        cleanupTriggers();
        popup.classList.add('visible');
    }

    function onScrollTrigger() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max <= 0) return;
        if (window.scrollY / max >= 0.4) {
            showPopup();
        }
    }

    function cleanupTriggers() {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
        window.removeEventListener('scroll', onScrollTrigger);
    }

    // Afișare: la 12s sau la 40% scroll - primul care se întâmplă
    timerId = setTimeout(showPopup, 12000);
    window.addEventListener('scroll', onScrollTrigger, { passive: true });

});


/* ============================================
   MagicArt Fest - Măsurare (GA4 + Microsoft Clarity)
   Google Consent Mode v2 este declarat PRIMUL, cu totul refuzat.
   GA4 și Clarity se încarcă DOAR după acceptarea categoriei "analytics".
   Evenimentele comerciale sunt prinse cu ascultători pe document, în faza
   de captură, ca să funcționeze pe toate paginile fără modificări în HTML.
   ============================================ */

(function (window, document) {
    'use strict';

    var GA4_ID = 'G-EG8K6X87E1';
    var CLARITY_ID = 'y4io09dl91';

    /* ---- 1. Consent Mode v2: implicit totul refuzat ---- */

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        functionality_storage: 'granted',
        security_storage: 'granted',
        wait_for_update: 500
    });

    /* ---- 2. Coadă de evenimente până la acordul vizitatorului ---- */

    var analyticsOn = false;
    var loaded = false;
    var queue = [];
    var MAX_QUEUE = 40;

    function pageLang() {
        var l = (document.documentElement.getAttribute('lang') || '').toLowerCase().slice(0, 2);
        return (l === 'en' || l === 'es' || l === 'ro') ? l : 'ro';
    }

    function track(name, params) {
        var payload = params || {};
        payload.page_lang = pageLang();
        payload.page_path = window.location.pathname;
        if (loaded) {
            try { window.gtag('event', name, payload); } catch (e) { /* nu rupem niciodată pagina */ }
        } else if (queue.length < MAX_QUEUE) {
            queue.push([name, payload]);
        }
    }

    function flushQueue() {
        var pending = queue;
        queue = [];
        for (var i = 0; i < pending.length; i++) {
            try { window.gtag('event', pending[i][0], pending[i][1]); } catch (e) { /* ignorat */ }
        }
    }

    /* ---- 3. Incarcarea scripturilor ----
       GA4 se incarca la TOATA lumea, in modul avansat de Consent Mode v2:
       pana la acceptare nu scrie niciun cookie si trimite doar semnale
       anonime, din care Google modeleaza traficul. Asa nu mai pierdem
       vizitatorii care nu apasa nimic in banner - problema din care alt
       site al aceluiasi proprietar raporta 4 sesiuni pe luna in loc de 1300.
       Clarity ramane strict dupa acord: inregistreaza sesiuni, deci fara
       acord ar fi supraveghere. */

    function loadGA4() {
        if (document.getElementById('maf-ga4')) return;
        var s = document.createElement('script');
        s.id = 'maf-ga4';
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
        s.onerror = function () { /* blocat de un ad-blocker: fără erori zgomotoase */ };
        document.head.appendChild(s);

        window.gtag('js', new Date());
        window.gtag('config', GA4_ID, {
            anonymize_ip: true,
            send_page_view: true
        });
    }

    function loadClarity() {
        if (document.getElementById('maf-clarity')) return;
        window.clarity = window.clarity || function () {
            (window.clarity.q = window.clarity.q || []).push(arguments);
        };
        var s = document.createElement('script');
        s.id = 'maf-clarity';
        s.async = true;
        s.src = 'https://www.clarity.ms/tag/' + CLARITY_ID;
        s.onerror = function () { /* blocat: ignorăm în tăcere */ };
        document.head.appendChild(s);
    }

    function grant() {
        if (analyticsOn) return;
        analyticsOn = true;
        window.gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
        loadGA4();
        loadClarity();
        loaded = true;
        flushQueue();
        // GA4 ruleaza deja; aici doar trece pe cookie-uri si porneste Clarity
    }

    function revoke() {
        analyticsOn = false;
        // GA4 ramane incarcat, dar fara cookie-uri (modul avansat);
        // Clarity nu se mai incarca la urmatoarea pagina
        queue = [];
        try {
            window.gtag('consent', 'update', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
            });
        } catch (e) { /* ignorat */ }
    }

    /* GA4 pleaca imediat, cu stocarea refuzata pana la acord */
    loadGA4();
    loaded = true;
    flushQueue();

    document.addEventListener('maf:consent', function (e) {
        var d = e.detail || {};
        if (d.analytics === true) {
            grant();
        } else {
            revoke();
        }
        if (d.action && d.action !== 'restore') {
            track('cookie_consent', {
                consent_action: d.action,
                analytics_granted: d.analytics === true
            });
        }
    }, false);

    /* ---- 4. Evenimente comerciale, prinse în faza de captură ---- */

    function closestEl(node, test) {
        while (node && node.nodeType === 1) {
            if (test(node)) return node;
            node = node.parentNode;
        }
        return null;
    }

    function isInteractive(node) {
        return node.tagName === 'A' || node.tagName === 'BUTTON';
    }

    function labelOf(node) {
        var txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) txt = node.getAttribute('aria-label') || '';
        return txt.slice(0, 100);
    }

    function hasClassLike(node, needle) {
        var c = node.className;
        if (typeof c !== 'string') return false;
        return c.toLowerCase().indexOf(needle) !== -1;
    }

    var RE_TICKET = /(cump[\u0103a]r|bilet|buy ticket|get ticket|tickets?\b|comprar|entrada)/i;
    var RE_REGISTER = /(\u00eenscri|inscri|register|registration|sign ?up|inscrib|inscripci)/i;

    document.addEventListener('click', function (e) {
        var node = closestEl(e.target, isInteractive);
        if (!node) return;

        var href = (node.getAttribute('href') || '').trim();
        var lower = href.toLowerCase();
        var label = labelOf(node);

        /* WhatsApp */
        if (lower.indexOf('wa.me') !== -1 || lower.indexOf('api.whatsapp.com') !== -1 || lower.indexOf('whatsapp://') === 0) {
            track('whatsapp_click', { link_url: href, link_text: label });
            return;
        }

        /* Telefon */
        if (lower.indexOf('tel:') === 0) {
            track('phone_click', { link_url: href, link_text: label });
            return;
        }

        /* Email */
        if (lower.indexOf('mailto:') === 0) {
            track('email_click', { link_url: href, link_text: label });
            return;
        }

        /* Bilete: butonul dintr-un card de bilet */
        var ticketCard = closestEl(node, function (n) {
            return hasClassLike(n, 'ticket-card');
        });
        if (!ticketCard) {
            var tFooter = closestEl(node, function (n) { return hasClassLike(n, 'ticket-footer'); });
            if (tFooter) ticketCard = tFooter.parentNode;
        }
        if (ticketCard) {
            var typeEl = ticketCard.querySelector ? ticketCard.querySelector('.ticket-type') : null;
            var priceEl = ticketCard.querySelector ? ticketCard.querySelector('.price-amount') : null;
            track('ticket_cta_click', {
                ticket_type: typeEl ? (typeEl.textContent || '').trim() : 'unknown',
                ticket_price: priceEl ? (priceEl.textContent || '').trim() : '',
                cta_location: 'ticket_card',
                link_text: label
            });
            return;
        }

        /* Înscriere */
        var isRegisterHref = lower.indexOf('/inscriere') !== -1;
        if (isRegisterHref || hasClassLike(node, 'nav-cta') || (RE_REGISTER.test(label) && (node.tagName === 'A' || hasClassLike(node, 'btn')))) {
            track('register_cta_click', {
                cta_location: hasClassLike(node, 'nav-cta') ? 'navbar' : 'page',
                link_text: label,
                link_url: href
            });
            return;
        }

        /* Bilete: din navigație sau alte butoane */
        if (lower.indexOf('/bilete') !== -1 || (RE_TICKET.test(label) && hasClassLike(node, 'btn'))) {
            track('ticket_cta_click', {
                ticket_type: 'unknown',
                cta_location: hasClassLike(node, 'nav-link') ? 'navbar' : 'page',
                link_text: label,
                link_url: href
            });
        }
    }, true);

    /* Trimiterea formularelor */
    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || form.nodeType !== 1) return;
        var id = form.getAttribute('id') || '';
        if (id === 'mafRegisterForm') {
            var pkg = form.querySelector('input[name="package"]:checked');
            var cat = form.querySelector('input[name="category"]:checked');
            var acc = form.querySelector('input[name="accommodation"]:checked');
            track('registration_submit', {
                package: pkg ? pkg.value : '',
                competition_category: cat ? cat.value : '',
                accommodation: acc ? acc.value : ''
            });
        } else if (id === 'nlFooterForm' || id === 'newsletterForm') {
            track('newsletter_submit', {
                form_location: id === 'nlFooterForm' ? 'footer' : 'popup'
            });
        }
    }, true);

    /* Pornirea filmărilor: evenimentul "play" nu urcă, deci ascultăm în captură */
    document.addEventListener('play', function (e) {
        var m = e.target;
        if (!m || (m.tagName !== 'VIDEO' && m.tagName !== 'AUDIO')) return;
        if (m.getAttribute('data-maf-played') === '1') return;
        m.setAttribute('data-maf-played', '1');
        track('video_play', {
            video_title: m.getAttribute('title') || m.getAttribute('aria-label') || (m.currentSrc || m.src || '').split('/').pop() || 'video',
            video_provider: 'self_hosted'
        });
    }, true);

    /* ---- 5. API intern și încărcarea managerului de consimțământ ---- */

    window.MafAnalytics = {
        track: track,
        isEnabled: function () { return analyticsOn === true; }
    };

    (function loadConsentManager() {
        if (document.getElementById('maf-consent-js')) return;
        var s = document.createElement('script');
        s.id = 'maf-consent-js';
        s.src = '/js/consent.js';
        s.defer = true;
        document.head.appendChild(s);
    })();

})(window, document);
