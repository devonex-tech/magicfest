/* ============================================
   MagicArt Fest - Registration Form
   (formular multi-step - doar pagina de înscriere)
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
    const honeypot = form.querySelector('input[name="maf_hp_2"]');
    const payLaterWrap = document.getElementById('formPayLaterWrap');
    const payLaterBtn = document.getElementById('formPayLater');
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
        if (payLaterWrap) payLaterWrap.style.display = n === TOTAL_STEPS ? 'block' : 'none';

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
    // Cele patru pachete (Magician, Competitor, Dealer, Dealer Assistant) au
    // exact aceleași beneficii, deci nu mai există o casetă de informații per
    // pachet: e una singură, mereu vizibilă, scrisă direct în pagină.
    const roommateField = document.getElementById('roommateField');
    const roommateInput = form.querySelector('input[name="roommate"]');
    const dealerFields = document.getElementById('dealerFields');
    const storeInput = form.querySelector('input[name="store_name"]');
    const websiteInput = form.querySelector('input[name="website"]');
    const DEALER_PACKAGES = ['Dealer', 'Dealer Assistant'];

    function updateAccommodation() {
        const withAcc = radioValue('accommodation') === 'With accommodation';
        if (roommateField) roommateField.classList.toggle('visible', withAcc);
        if (!withAcc && roommateInput) roommateInput.value = '';
    }

    // Cine se inscrie pe pachet de Dealer sau Dealer Assistant are nevoie de
    // campurile de magazin oricum, chiar daca nu bifeaza "upgrade dealer".
    function updateDealer() {
        const isDealer =
            radioValue('dealer_upgrade') === 'Yes' ||
            DEALER_PACKAGES.indexOf(radioValue('package')) !== -1;
        if (dealerFields) dealerFields.classList.toggle('visible', isDealer);
        if (!isDealer) {
            if (storeInput) storeInput.value = '';
            if (websiteInput) websiteInput.value = '';
        }
    }

    form.addEventListener('change', (e) => {
        const name = e.target.name;
        if (name === 'package') updateDealer();
        else if (name === 'accommodation') updateAccommodation();
        else if (name === 'dealer_upgrade') updateDealer();
        else if (e.target === termsBox && termsBox.checked && termsError) {
            termsError.style.display = 'none';
        }
    });

    // Inițializare după radio-urile checked
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
            dd.textContent = value || '-';
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

    // Inscrierea e salvata in ambele cazuri. Difera doar ce urmeaza: plata
    // acum inseamna Stripe, plata mai tarziu inseamna ca organizatorul ia
    // legatura. Nu blocam locul dupa plata - altfel am pierde oamenii care
    // vor sa plateasca prin transfer sau la fata locului.
    function onSuccess(payNow) {
        const nav = form.querySelector('.form-nav');
        if (nav) nav.style.display = 'none';
        if (payLaterWrap) payLaterWrap.style.display = 'none';

        if (payNow) {
            setStatus(i18n.success, 'success');
            goToPayment();
        } else {
            setStatus(i18n.pay_later_ok || i18n.success, 'success');
        }
    }

    // Inscrierea e deja salvata in acest punct. Daca plata nu poate fi
    // pornita, NU stricam mesajul de succes: omul chiar s-a inscris, iar
    // organizatorul il poate contacta pentru plata. Ii aratam doar o nota.
    function goToPayment() {
        const payload = {
            package: radioValue('package'),
            email: fieldValue('email'),
            name: (fieldValue('first_name') + ' ' + fieldValue('last_name')).trim(),
            lang: i18n.lang
        };

        setStatus(i18n.redirecting || i18n.success, 'success');

        fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then((res) => (res.ok ? res.json() : null)).then((data) => {
            if (data && data.url) {
                window.location.href = data.url;
            } else {
                setStatus(i18n.pay_later || i18n.success, 'success');
            }
        }).catch(() => {
            setStatus(i18n.pay_later || i18n.success, 'success');
        });
    }

    function submitForm(payNow) {
        if (sending) return;

        if (!termsBox || !termsBox.checked) {
            if (termsError) termsError.style.display = 'block';
            return;
        }
        if (termsError) termsError.style.display = 'none';

        // Capcana anti-robot: doar un robot completeaza un camp invizibil.
        // Nu mai simulam succes in tacere - daca ajungem aici din greseala
        // (completare automata din browser), inscrierea s-ar pierde fara ca
        // nimeni sa afle. Golim campul, logam, si trimitem normal.
        if (honeypot && honeypot.value) {
            console.warn('Camp-capcana completat automat de browser; il ignor si trimit normal.');
            honeypot.value = '';
        }

        sending = true;
        nextBtn.disabled = true;
        if (payLaterBtn) payLaterBtn.disabled = true;

        // Semnalul "se trimite" merge pe butonul chiar apasat, ca omul sa vada
        // ca a fost inregistrat clicul lui, nu al celuilalt buton.
        const busyLabel = payNow || !payLaterBtn ? nextLabel : payLaterBtn;
        const busyText = busyLabel.textContent;
        busyLabel.textContent = i18n.sending;
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
            lang: i18n.lang,
            payment_choice: payNow ? 'now' : 'later'
        };

        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then((res) => {
            if (res.ok) {
                onSuccess(payNow);
            } else {
                onError();
            }
        }).catch(onError);

        function onError() {
            sending = false;
            setStatus(i18n.error, 'error');
            nextBtn.disabled = false;
            if (payLaterBtn) payLaterBtn.disabled = false;
            busyLabel.textContent = busyText;
        }
    }

    // ---- Butoane ----
    nextBtn.addEventListener('click', () => {
        if (currentStep === TOTAL_STEPS) {
            submitForm(true);
            return;
        }
        if (validateStep(currentStep)) {
            goToStep(currentStep + 1);
        }
    });

    if (payLaterBtn) {
        payLaterBtn.addEventListener('click', () => {
            if (currentStep === TOTAL_STEPS) submitForm(false);
        });
    }

    backBtn.addEventListener('click', () => {
        if (currentStep > 1 && !sending) {
            goToStep(currentStep - 1);
        }
    });

});
