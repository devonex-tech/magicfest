/* ============================================
   MagicArt Fest - Managerul de consimțământ (GDPR / ePrivacy)
   Două categorii: necessary (mereu activ) și analytics (implicit oprit).
   Nu modifică niciun fișier HTML: bara și panoul sunt randate din JS.
   Expune window.MafConsent și evenimentul document "maf:consent".
   ============================================ */

(function (window, document) {
    'use strict';

    if (window.MafConsent) return;

    var STORAGE_KEY = 'maf_consent';
    var VERSION = 1;
    var CSS_HREF = '/css/consent.css';

    /* ---------- Limba ---------- */

    function detectLang() {
        var htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
        if (htmlLang.indexOf('en') === 0) return 'en';
        if (htmlLang.indexOf('es') === 0) return 'es';
        if (htmlLang.indexOf('ro') === 0) return 'ro';

        var path = (window.location.pathname || '').toLowerCase();
        if (path === '/en' || path.indexOf('/en/') === 0) return 'en';
        if (path === '/es' || path.indexOf('/es/') === 0) return 'es';
        return 'ro';
    }

    var I18N = {
        ro: {
            title: 'Cookie-uri și confidențialitate',
            desc: 'Folosim cookie-uri strict necesare pentru funcționarea site-ului. Doar cu acordul tău folosim și cookie-uri de analiză (Google Analytics 4 și Microsoft Clarity), ca să înțelegem cum este folosit site-ul și să îl îmbunătățim. Poți accepta, poți refuza sau poți alege în detaliu, oricând.',
            more: 'Detalii în {cookies} și în {privacy}.',
            cookiesLink: 'Politica de cookie-uri',
            privacyLink: 'Politica de confidențialitate',
            acceptAll: 'Accept tot',
            rejectAll: 'Doar necesare',
            prefs: 'Preferințe',
            barLabel: 'Informare privind cookie-urile',
            panelTitle: 'Preferințe privind cookie-urile',
            panelDesc: 'Alege ce categorii de cookie-uri permiți. Alegerea ta este păstrată pe acest dispozitiv și o poți schimba oricând din subsolul paginii.',
            close: 'Închide',
            necTitle: 'Strict necesare',
            necDesc: 'Asigură funcționarea site-ului: navigarea, formularul de înscriere, plata și păstrarea alegerii tale privind cookie-urile. Nu pot fi dezactivate și nu sunt folosite pentru urmărire.',
            always: 'Mereu active',
            anaTitle: 'Analiză și statistici',
            anaDesc: 'Google Analytics 4 și Microsoft Clarity ne arată câte persoane vizitează site-ul, ce pagini citesc și unde întâmpină dificultăți. Datele sunt folosite doar în scop statistic. Fără acordul tău, aceste instrumente nu sunt încărcate deloc.',
            save: 'Salvează preferințele',
            switchLabel: 'Activează cookie-urile de analiză'
        },
        en: {
            title: 'Cookies and privacy',
            desc: 'We use strictly necessary cookies to run this website. Only with your consent do we also use analytics cookies (Google Analytics 4 and Microsoft Clarity), so we can understand how the site is used and improve it. You can accept, decline or choose in detail, at any time.',
            more: 'Details in our {cookies} and {privacy}.',
            cookiesLink: 'Cookie Policy',
            privacyLink: 'Privacy Policy',
            acceptAll: 'Accept all',
            rejectAll: 'Necessary only',
            prefs: 'Preferences',
            barLabel: 'Cookie notice',
            panelTitle: 'Cookie preferences',
            panelDesc: 'Choose which cookie categories you allow. Your choice is stored on this device and you can change it at any time from the page footer.',
            close: 'Close',
            necTitle: 'Strictly necessary',
            necDesc: 'These keep the website working: navigation, the registration form, payment and remembering your cookie choice. They cannot be switched off and are not used for tracking.',
            always: 'Always on',
            anaTitle: 'Analytics and statistics',
            anaDesc: 'Google Analytics 4 and Microsoft Clarity show us how many people visit the site, which pages they read and where they run into trouble. The data is used for statistics only. Without your consent these tools are not loaded at all.',
            save: 'Save preferences',
            switchLabel: 'Enable analytics cookies'
        },
        es: {
            title: 'Cookies y privacidad',
            desc: 'Usamos cookies estrictamente necesarias para que el sitio funcione. Solo con tu consentimiento usamos también cookies de análisis (Google Analytics 4 y Microsoft Clarity), para entender cómo se usa el sitio y mejorarlo. Puedes aceptar, rechazar o elegir en detalle, en cualquier momento.',
            more: 'Más información en la {cookies} y en la {privacy}.',
            cookiesLink: 'Política de Cookies',
            privacyLink: 'Política de Privacidad',
            acceptAll: 'Aceptar todo',
            rejectAll: 'Solo necesarias',
            prefs: 'Preferencias',
            barLabel: 'Aviso sobre cookies',
            panelTitle: 'Preferencias de cookies',
            panelDesc: 'Elige qué categorías de cookies permites. Tu elección se guarda en este dispositivo y puedes cambiarla cuando quieras desde el pie de página.',
            close: 'Cerrar',
            necTitle: 'Estrictamente necesarias',
            necDesc: 'Hacen funcionar el sitio: la navegación, el formulario de inscripción, el pago y el recuerdo de tu elección sobre cookies. No se pueden desactivar y no se usan para rastreo.',
            always: 'Siempre activas',
            anaTitle: 'Análisis y estadísticas',
            anaDesc: 'Google Analytics 4 y Microsoft Clarity nos muestran cuántas personas visitan el sitio, qué páginas leen y dónde encuentran dificultades. Los datos se usan solo con fines estadísticos. Sin tu consentimiento, estas herramientas no se cargan en absoluto.',
            save: 'Guardar preferencias',
            switchLabel: 'Activar las cookies de análisis'
        }
    };

    var LINKS = {
        ro: { cookies: '/politica-cookies', privacy: '/politica-confidentialitate' },
        en: { cookies: '/en/cookie-policy', privacy: '/en/privacy-policy' },
        es: { cookies: '/es/politica-cookies', privacy: '/es/politica-privacidad' }
    };

    var lang = detectLang();
    var t = I18N[lang] || I18N.ro;
    var links = LINKS[lang] || LINKS.ro;

    /* ---------- Stocare, protejată la private mode ---------- */

    function readState() {
        var raw = null;
        try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
        if (!raw) return null;
        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { return null; }
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.version !== VERSION) return null;
        return {
            version: VERSION,
            necessary: true,
            analytics: parsed.analytics === true,
            date: typeof parsed.date === 'string' ? parsed.date : null
        };
    }

    function writeState(analytics) {
        var state = {
            version: VERSION,
            necessary: true,
            analytics: analytics === true,
            date: new Date().toISOString()
        };
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* private mode: alegerea ține doar cât sesiunea */ }
        return state;
    }

    var current = readState();

    /* ---------- Utilitare DOM ---------- */

    function el(tag, attrs, text) {
        var node = document.createElement(tag);
        if (attrs) {
            for (var k in attrs) {
                if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
            }
        }
        if (text != null) node.textContent = text;
        return node;
    }

    function ensureStyles() {
        if (document.querySelector('link[data-maf-consent-css]')) return;
        var link = el('link', { rel: 'stylesheet', href: CSS_HREF });
        link.setAttribute('data-maf-consent-css', '1');
        document.head.appendChild(link);
    }

    function moreLine() {
        var wrap = el('span');
        var parts = t.more.split(/(\{cookies\}|\{privacy\})/);
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === '{cookies}') {
                wrap.appendChild(el('a', { href: links.cookies }, t.cookiesLink));
            } else if (parts[i] === '{privacy}') {
                wrap.appendChild(el('a', { href: links.privacy }, t.privacyLink));
            } else if (parts[i]) {
                wrap.appendChild(document.createTextNode(parts[i]));
            }
        }
        return wrap;
    }

    /* ---------- Difuzarea stării ---------- */

    function emit(state, action) {
        var detail = {
            necessary: true,
            analytics: state.analytics === true,
            action: action || 'set',
            date: state.date,
            version: VERSION,
            lang: lang
        };
        try {
            document.dispatchEvent(new CustomEvent('maf:consent', { detail: detail }));
        } catch (e) {
            var ev = document.createEvent('CustomEvent');
            ev.initCustomEvent('maf:consent', false, false, detail);
            document.dispatchEvent(ev);
        }
    }

    /* ---------- Interfața ---------- */

    var bar = null;
    var panel = null;
    var pendingAnalytics = false;
    var lastFocused = null;

    function hideBar() {
        if (!bar) return;
        bar.classList.remove('is-open');
        var node = bar;
        window.setTimeout(function () {
            if (node && node.parentNode) node.parentNode.removeChild(node);
        }, 400);
        bar = null;
    }

    var PENDING_CLASS = 'maf-cc-pending';

    function setPending(on) {
        var root = document.documentElement;
        if (!root || !root.classList) return;
        if (on) root.classList.add(PENDING_CLASS);
        else root.classList.remove(PENDING_CLASS);
    }

    function decide(analytics, action) {
        var state = writeState(analytics);
        current = state;
        setPending(false);
        closePanel();
        hideBar();
        emit(state, action);
    }

    function buildBar() {
        if (bar) return;
        ensureStyles();

        bar = el('div', {
            'class': 'maf-cc maf-cc-bar',
            role: 'dialog',
            'aria-modal': 'false',
            'aria-label': t.barLabel,
            'aria-describedby': 'mafCcDesc'
        });

        var inner = el('div', { 'class': 'maf-cc-inner' });
        var textWrap = el('div', { 'class': 'maf-cc-text' });
        textWrap.appendChild(el('p', { 'class': 'maf-cc-title' }, t.title));

        var desc = el('p', { 'class': 'maf-cc-desc', id: 'mafCcDesc' }, t.desc + ' ');
        desc.appendChild(moreLine());
        textWrap.appendChild(desc);

        var actions = el('div', { 'class': 'maf-cc-actions' });

        var accept = el('button', { type: 'button', 'class': 'maf-cc-btn' }, t.acceptAll);
        var reject = el('button', { type: 'button', 'class': 'maf-cc-btn' }, t.rejectAll);
        var prefs = el('button', { type: 'button', 'class': 'maf-cc-btn' }, t.prefs);

        accept.addEventListener('click', function () { decide(true, 'accept_all'); });
        reject.addEventListener('click', function () { decide(false, 'necessary_only'); });
        prefs.addEventListener('click', function () { openPanel(); });

        actions.appendChild(accept);
        actions.appendChild(reject);
        actions.appendChild(prefs);

        inner.appendChild(textWrap);
        inner.appendChild(actions);
        bar.appendChild(inner);
        document.body.appendChild(bar);

        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                if (bar) bar.classList.add('is-open');
            });
        });
    }

    function closePanel() {
        if (!panel) return;
        panel.classList.remove('is-open');
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        panel = null;
        document.removeEventListener('keydown', onPanelKeydown, true);
        if (lastFocused && typeof lastFocused.focus === 'function') {
            try { lastFocused.focus(); } catch (e) { /* ignorat */ }
        }
        lastFocused = null;
    }

    function onPanelKeydown(e) {
        if (!panel) return;
        if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            closePanel();
            if (!current) buildBar();
            return;
        }
        if (e.key !== 'Tab') return;
        var focusable = panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function openPanel() {
        if (panel) return;
        ensureStyles();
        lastFocused = document.activeElement;
        pendingAnalytics = current ? current.analytics === true : false;

        panel = el('div', { 'class': 'maf-cc maf-cc-panel' });

        var card = el('div', {
            'class': 'maf-cc-card',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'mafCcPanelTitle'
        });

        var close = el('button', { type: 'button', 'class': 'maf-cc-close', 'aria-label': t.close }, '×');
        close.addEventListener('click', function () {
            closePanel();
            if (!current) buildBar();
        });
        card.appendChild(close);

        card.appendChild(el('h2', { id: 'mafCcPanelTitle' }, t.panelTitle));
        card.appendChild(el('p', null, t.panelDesc));

        /* Categoria strict necesară */
        var gNec = el('div', { 'class': 'maf-cc-group' });
        var hNec = el('div', { 'class': 'maf-cc-group-head' });
        hNec.appendChild(el('p', { 'class': 'maf-cc-group-title' }, t.necTitle));
        hNec.appendChild(el('span', { 'class': 'maf-cc-always' }, t.always));
        gNec.appendChild(hNec);
        gNec.appendChild(el('p', null, t.necDesc));
        card.appendChild(gNec);

        /* Categoria de analiză */
        var gAna = el('div', { 'class': 'maf-cc-group' });
        var hAna = el('div', { 'class': 'maf-cc-group-head' });
        hAna.appendChild(el('p', { 'class': 'maf-cc-group-title', id: 'mafCcAnaTitle' }, t.anaTitle));

        var sw = el('button', {
            type: 'button',
            'class': 'maf-cc-switch',
            role: 'switch',
            'aria-checked': pendingAnalytics ? 'true' : 'false',
            'aria-label': t.switchLabel
        });
        function toggle() {
            pendingAnalytics = !pendingAnalytics;
            sw.setAttribute('aria-checked', pendingAnalytics ? 'true' : 'false');
        }
        sw.addEventListener('click', toggle);
        sw.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
                e.preventDefault();
                toggle();
            }
        });
        hAna.appendChild(sw);
        gAna.appendChild(hAna);
        gAna.appendChild(el('p', null, t.anaDesc));
        card.appendChild(gAna);

        /* Acțiuni: aceleași trei opțiuni, aceeași greutate vizuală */
        var pActions = el('div', { 'class': 'maf-cc-panel-actions' });
        var save = el('button', { type: 'button', 'class': 'maf-cc-btn' }, t.save);
        var acceptAll = el('button', { type: 'button', 'class': 'maf-cc-btn' }, t.acceptAll);
        var rejectAll = el('button', { type: 'button', 'class': 'maf-cc-btn' }, t.rejectAll);
        save.addEventListener('click', function () { decide(pendingAnalytics, 'save_preferences'); });
        acceptAll.addEventListener('click', function () { decide(true, 'accept_all'); });
        rejectAll.addEventListener('click', function () { decide(false, 'necessary_only'); });
        pActions.appendChild(acceptAll);
        pActions.appendChild(rejectAll);
        pActions.appendChild(save);
        card.appendChild(pActions);

        var pLinks = el('div', { 'class': 'maf-cc-panel-links' });
        pLinks.appendChild(moreLine());
        card.appendChild(pLinks);

        panel.appendChild(card);
        panel.addEventListener('click', function (e) {
            if (e.target === panel) {
                closePanel();
                if (!current) buildBar();
            }
        });

        document.body.appendChild(panel);
        panel.classList.add('is-open');
        document.addEventListener('keydown', onPanelKeydown, true);
        window.setTimeout(function () {
            try { acceptAll.focus(); } catch (e) { /* ignorat */ }
        }, 30);
    }

    /* ---------- API public ---------- */

    var api = {
        VERSION: VERSION,
        lang: lang,
        /* Starea curentă, sau null dacă vizitatorul nu a ales încă */
        get: function () {
            return current ? {
                necessary: true,
                analytics: current.analytics === true,
                date: current.date,
                version: current.version
            } : null;
        },
        /* true dacă există deja o alegere salvată */
        has: function () { return current !== null; },
        /* true doar dacă analiza a fost acceptată explicit */
        allows: function (category) {
            if (category === 'necessary') return true;
            if (category === 'analytics') return current !== null && current.analytics === true;
            return false;
        },
        /* Salveaza programatic o alegere */
        set: function (prefs, action) {
            var analytics = !!(prefs && prefs.analytics);
            decide(analytics, action || 'set');
        },
        /* Redeschide panoul de preferințe (folosit de linkul din subsol) */
        open: function () { openPanel(); return false; },
        openPreferences: function () { openPanel(); return false; },
        /* Șterge alegerea și reafișează bara */
        reset: function () {
            try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignorat */ }
            current = null;
            closePanel();
            buildBar();
        }
    };

    window.MafConsent = api;

    /* ---------- Pornire ---------- */

    function start() {
        /* Orice element cu data-maf-consent-open redeschide preferințele */
        document.addEventListener('click', function (e) {
            var target = e.target;
            while (target && target !== document.body) {
                if (target.nodeType === 1 &&
                    (target.hasAttribute('data-maf-consent-open') ||
                     (target.getAttribute && target.getAttribute('href') === '#cookie-preferences'))) {
                    e.preventDefault();
                    openPanel();
                    return;
                }
                target = target.parentNode;
            }
        }, false);

        if (current) {
            /* Alegere deja făcută: nimic vizibil, doar anunțăm consumatorii */
            setPending(false);
            emit(current, 'restore');
        } else {
            /* Cât timp alegerea e în așteptare, nu suprapunem alte ferestre peste bară */
            setPending(true);
            buildBar();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})(window, document);
