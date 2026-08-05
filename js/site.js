/* ============================================
   MagicArt Fest - Site-wide JavaScript
   (newsletter: popup + formular în footer — pe toate paginile)
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

    // localStorage poate arunca (private mode) — acces protejat
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

    // Afișare: la 12s sau la 40% scroll — primul care se întâmplă
    timerId = setTimeout(showPopup, 12000);
    window.addEventListener('scroll', onScrollTrigger, { passive: true });

});
