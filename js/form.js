/* ============================================
   MagicArt Fest - Registration Form
   (formular multi-step — doar pagina de înscriere)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const form = document.getElementById('mafRegisterForm');
    if (!form) return;

    const steps = form.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('#formProgress .form-progress-step');
    const backBtn = document.getElementById('formBack');
    const nextBtn = document.getElementById('formNext');
    const status = document.getElementById('formStatus');
    const summaryList = document.getElementById('formSummaryList');
    const termsBox = document.getElementById('f-terms');
    const termsError = document.getElementById('termsError');
    const honeypot = form.querySelector('input[name="company"]');
    const i18nEl = document.getElementById('mafFormI18n');

    if (!steps.length || !backBtn || !nextBtn || !status || !i18nEl) return;

    let i18n;
    try {
        i18n = JSON.parse(i18nEl.textContent);
    } catch (e) {
        return;
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const TOTAL_STEPS = steps.length;
    const nextLabel = nextBtn.querySelector('span') || nextBtn;
    const nextDefaultText = nextLabel.textContent;

    let currentStep = 1;
    let sending = false;

    // ---- Helpers ----
    function getStepEl(n) {
        return form.querySelector(`.form-step[data-step="${n}"]`);
    }

    function radioValue(name) {
        const checked = form.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : '';
    }

    function fieldValue(name) {
        const el = form.querySelector(`[name="${name}"]`);
        return el ? el.value.trim() : '';
    }

    // ---- Navigare pași ----
    function goToStep(n) {
        currentStep = n;

        steps.forEach((step) => {
            step.classList.toggle('active', parseInt(step.dataset.step, 10) === n);
        });

        progressSteps.forEach((ps) => {
            const ind = parseInt(ps.dataset.stepInd, 10);
            ps.classList.toggle('active', ind === n);
            ps.classList.toggle('done', ind < n);
        });

        backBtn.style.visibility = n === 1 ? 'hidden' : 'visible';
        nextLabel.textContent = n === TOTAL_STEPS ? i18n.send : nextDefaultText;

        if (n === TOTAL_STEPS) {
            buildSummary();
        }

        const wrapper = form.closest('.register-form-wrapper') || form;
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---- Validare per pas ----
    function clearFieldError(input) {
        input.classList.remove('invalid');
        const group = input.closest('.form-group');
        if (group) group.classList.remove('has-error');
    }

    function markFieldError(input) {
        input.classList.add('invalid');
        const group = input.closest('.form-group');
        if (group) group.classList.add('has-error');
    }

    function validateStep(n) {
        const stepEl = getStepEl(n);
        if (!stepEl) return true;

        let valid = true;
        const fields = stepEl.querySelectorAll('input[required], textarea[required]');
        fields.forEach((input) => {
            if (input.type === 'checkbox' || input.type === 'radio') return;
            const value = input.value.trim();
            if (!value || (input.type === 'email' && !EMAIL_RE.test(value))) {
                markFieldError(input);
                valid = false;
            } else {
                clearFieldError(input);
            }
        });
        return valid;
    }

    // Curăță eroarea la tastare
    form.addEventListener('input', (e) => {
        const input = e.target;
        if (input.matches('input, textarea')) {
            clearFieldError(input);
        }
    });

    // ---- Câmpuri condiționale ----
    const pkgInfoFull = document.getElementById('pkgInfoFull');
    const pkgInfoStandard = document.getElementById('pkgInfoStandard');
    const roommateField = document.getElementById('roommateField');
    const roommateInput = form.querySelector('input[name="roommate"]');
    const dealerFields = document.getElementById('dealerFields');
    const storeInput = form.querySelector('input[name="store_name"]');
    const websiteInput = form.querySelector('input[name="website"]');

    function updatePackageInfo() {
        const isFull = radioValue('package') === 'Full';
        if (pkgInfoFull) pkgInfoFull.classList.toggle('visible', isFull);
        if (pkgInfoStandard) pkgInfoStandard.classList.toggle('visible', !isFull);
    }

    function updateAccommodation() {
        const withAcc = radioValue('accommodation') === 'With accommodation';
        if (roommateField) roommateField.classList.toggle('visible', withAcc);
        if (!withAcc && roommateInput) roommateInput.value = '';
    }

    function updateDealer() {
        const isDealer = radioValue('dealer_upgrade') === 'Yes';
        if (dealerFields) dealerFields.classList.toggle('visible', isDealer);
        if (!isDealer) {
            if (storeInput) storeInput.value = '';
            if (websiteInput) websiteInput.value = '';
        }
    }

    form.addEventListener('change', (e) => {
        const name = e.target.name;
        if (name === 'package') updatePackageInfo();
        else if (name === 'accommodation') updateAccommodation();
        else if (name === 'dealer_upgrade') updateDealer();
        else if (e.target === termsBox && termsBox.checked && termsError) {
            termsError.style.display = 'none';
        }
    });

    // Inițializare după radio-urile checked
    updatePackageInfo();
    updateAccommodation();
    updateDealer();

    // ---- Rezumat (pasul 4) ----
    function buildSummary() {
        if (!summaryList) return;
        const labels = i18n.summary_labels || {};
        const accValue = radioValue('accommodation');
        const catValue = radioValue('category');

        const rows = [
            [labels.name, (fieldValue('first_name') + ' ' + fieldValue('last_name')).trim()],
            [labels.email, fieldValue('email')],
            [labels.country, fieldValue('country')],
            [labels.package, radioValue('package')],
            [labels.accommodation, accValue === 'With accommodation' ? i18n.acc_with : i18n.acc_without],
            [labels.category, catValue === 'None' ? i18n.cat_none : catValue]
        ];

        summaryList.textContent = '';
        rows.forEach(([label, value]) => {
            const dt = document.createElement('dt');
            dt.textContent = label || '';
            const dd = document.createElement('dd');
            dd.textContent = value || '—';
            summaryList.appendChild(dt);
            summaryList.appendChild(dd);
        });
    }

    // ---- Trimitere ----
    function setStatus(message, type) {
        status.textContent = message;
        status.classList.remove('success', 'error');
        if (type) status.classList.add(type);
    }

    function onSuccess() {
        setStatus(i18n.success, 'success');
        const nav = form.querySelector('.form-nav');
        if (nav) nav.style.display = 'none';
    }

    function submitForm() {
        if (sending) return;

        if (!termsBox || !termsBox.checked) {
            if (termsError) termsError.style.display = 'block';
            return;
        }
        if (termsError) termsError.style.display = 'none';

        // Honeypot completat → simulăm succes, fără request
        if (honeypot && honeypot.value) {
            onSuccess();
            return;
        }

        sending = true;
        nextBtn.disabled = true;
        nextLabel.textContent = i18n.sending;
        setStatus('', null);

        const payload = {
            first_name: fieldValue('first_name'),
            last_name: fieldValue('last_name'),
            country: fieldValue('country'),
            whatsapp: fieldValue('whatsapp'),
            email: fieldValue('email'),
            package: radioValue('package'),
            accommodation: radioValue('accommodation'),
            roommate: fieldValue('roommate'),
            stage_name: fieldValue('stage_name'),
            magic_society: fieldValue('magic_society'),
            category: radioValue('category'),
            dealer_upgrade: radioValue('dealer_upgrade'),
            store_name: fieldValue('store_name'),
            website: fieldValue('website'),
            comments: fieldValue('comments'),
            lang: i18n.lang
        };

        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then((res) => {
            if (res.ok) {
                onSuccess();
            } else {
                onError();
            }
        }).catch(onError);

        function onError() {
            sending = false;
            setStatus(i18n.error, 'error');
            nextBtn.disabled = false;
            nextLabel.textContent = i18n.send;
        }
    }

    // ---- Butoane ----
    nextBtn.addEventListener('click', () => {
        if (currentStep === TOTAL_STEPS) {
            submitForm();
            return;
        }
        if (validateStep(currentStep)) {
            goToStep(currentStep + 1);
        }
    });

    backBtn.addEventListener('click', () => {
        if (currentStep > 1 && !sending) {
            goToStep(currentStep - 1);
        }
    });

});
