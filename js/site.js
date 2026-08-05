/* ============================================
   MagicArt Fest - Site-wide JavaScript
   (newsletter popup — încărcat pe toate paginile)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ---- Newsletter Popup ----
    const popup = document.getElementById('newsletterPopup');
    const closeBtn = document.getElementById('newsletterClose');
    const nlForm = document.getElementById('newsletterForm');
    const nlEmail = document.getElementById('newsletterEmail');
    const nlConsent = document.getElementById('newsletterConsent');
    const nlStatus = document.getElementById('newsletterStatus');
    const i18nEl = document.getElementById('mafNlI18n');

    if (!popup || !closeBtn || !nlForm || !nlEmail || !nlConsent || !nlStatus || !i18nEl) {
        return;
    }

    let i18n;
    try {
        i18n = JSON.parse(i18nEl.textContent);
    } catch (e) {
        return;
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 zile

    // localStorage poate arunca (private mode) — acces protejat
    function lsGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function lsSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignorat */ }
    }

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

    function hidePopup() {
        popup.classList.remove('visible');
    }

    function dismiss() {
        hidePopup();
        lsSet('maf_newsletter_dismissed', String(Date.now()));
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

    // Afișare: la 12s sau la 40% scroll — primul care se întâmplă
    timerId = setTimeout(showPopup, 12000);
    window.addEventListener('scroll', onScrollTrigger, { passive: true });

    // Închidere: buton, click pe backdrop, Escape
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

    function setStatus(message, type) {
        nlStatus.textContent = message;
        nlStatus.classList.remove('success', 'error');
        if (type) nlStatus.classList.add(type);
    }

    nlForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = nlEmail.value.trim();
        if (!EMAIL_RE.test(email)) {
            setStatus(i18n.err_email, 'error');
            return;
        }
        if (!nlConsent.checked) {
            setStatus(i18n.err_consent, 'error');
            return;
        }

        setStatus('', null);

        fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, consent: true, lang: i18n.lang })
        }).then((res) => {
            if (res.ok) {
                setStatus(i18n.success, 'success');
                lsSet('maf_newsletter', 'subscribed');
                setTimeout(hidePopup, 2500);
            } else {
                setStatus(i18n.error, 'error');
            }
        }).catch(() => {
            setStatus(i18n.error, 'error');
        });
    });

});
