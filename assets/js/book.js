/**
 * book.js — Multi-step booking form logic
 * Only loaded on book.html
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('booking-form');
    if (!form) return;

    const state = {
        step: 1,
        serviceId: '',
        serviceName: '',
        date: '',
        slotId: '',
        slotTime: '',
        services: [],
        slots: []
    };

    const steps = form.querySelectorAll('.step-panel');
    const stepIndicators = document.querySelectorAll('.booking-step');
    const connectors = document.querySelectorAll('.booking-step__connector');

    // Cached DOM
    const serviceSelect = document.getElementById('bs-service');
    const dateInput = document.getElementById('bs-date');
    const slotsContainer = document.getElementById('slots-container');
    const slotsGrid = document.getElementById('slots-grid');
    const selectedSlotDisplay = document.getElementById('selected-slot');
    const submitBtn = document.getElementById('bs-submit');
    const confirmationEl = document.getElementById('booking-confirmation');
    const formWrapper = document.getElementById('booking-form-wrapper');

    // Anti-spam
    let submitCooldown = false;

    // Set min date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (dateInput) dateInput.min = `${yyyy}-${mm}-${dd}`;

    // Init
    loadServices();

    /* =========================================================
       Load services
       ========================================================= */
    async function loadServices() {
        showSkeletonIn(serviceSelect.parentElement);

        try {
            const services = await Api.getServices();
            state.services = services;

            serviceSelect.innerHTML = '<option value="">Select a service…</option>';
            services.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.service_id;
                opt.textContent = `${s.service_name} (${s.duration_mins} min)`;
                serviceSelect.appendChild(opt);
            });
        } catch (err) {
            serviceSelect.innerHTML = '<option value="">Failed to load services</option>';
            showRetryButton(serviceSelect.parentElement, loadServices);
            showToast('Could not load services. Please try again.', 'error');
        } finally {
            hideSkeletonIn(serviceSelect.parentElement);
        }
    }

    /* =========================================================
       Load slots for date
       ========================================================= */
    async function loadSlots(date) {
        slotsGrid.innerHTML = '';
        slotsContainer.style.display = 'block';
        showSkeletonIn(slotsContainer, 6);

        try {
            const slots = await Api.getSlots(date);
            state.slots = slots;

            hideSkeletonIn(slotsContainer);

            if (!slots.length) {
                slotsGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">📅</div>
            <p>No available slots for this date. Please try another day.</p>
          </div>`;
                return;
            }

            slots.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'slot-btn';
                btn.textContent = formatTime(slot.start_time) + ' – ' + formatTime(slot.end_time);
                btn.dataset.slotId = slot.slot_id;
                btn.dataset.time = slot.start_time;

                btn.addEventListener('click', () => {
                    slotsGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('is-selected'));
                    btn.classList.add('is-selected');
                    state.slotId = slot.slot_id;
                    state.slotTime = slot.start_time;
                    selectedSlotDisplay.textContent = btn.textContent;
                });

                slotsGrid.appendChild(btn);
            });
        } catch (err) {
            hideSkeletonIn(slotsContainer);
            slotsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <p>Could not load slots. Please try again.</p>
        </div>`;
            showRetryButton(slotsContainer, () => loadSlots(date));
            showToast('Could not load available slots.', 'error');
        }
    }

    /* =========================================================
       Step navigation
       ========================================================= */
    function goToStep(n) {
        state.step = n;

        steps.forEach((panel, i) => {
            panel.classList.toggle('is-active', i === n - 1);
        });

        stepIndicators.forEach((ind, i) => {
            ind.classList.remove('is-active', 'is-done');
            if (i + 1 < n) ind.classList.add('is-done');
            if (i + 1 === n) ind.classList.add('is-active');
        });

        // Scroll to form top
        formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Next buttons
    document.querySelectorAll('[data-step-next]').forEach(btn => {
        btn.addEventListener('click', () => {
            const next = parseInt(btn.dataset.stepNext);

            // Validate current step
            if (state.step === 1) {
                if (!serviceSelect.value) {
                    showFieldError(serviceSelect, 'Please select a service');
                    return;
                }
                state.serviceId = serviceSelect.value;
                state.serviceName = serviceSelect.options[serviceSelect.selectedIndex].textContent;
                clearFieldError(serviceSelect);
            }

            if (state.step === 2) {
                if (!dateInput.value) {
                    showFieldError(dateInput, 'Please choose a date');
                    return;
                }
                state.date = dateInput.value;
                clearFieldError(dateInput);
                loadSlots(state.date);
            }

            if (state.step === 3) {
                if (!state.slotId) {
                    showToast('Please select a time slot.', 'error');
                    return;
                }
            }

            goToStep(next);
        });
    });

    // Prev buttons
    document.querySelectorAll('[data-step-prev]').forEach(btn => {
        btn.addEventListener('click', () => {
            goToStep(parseInt(btn.dataset.stepPrev));
        });
    });

    /* =========================================================
       Date change
       ========================================================= */
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            state.slotId = '';
            state.slotTime = '';
            if (selectedSlotDisplay) selectedSlotDisplay.textContent = '—';
            if (dateInput.value) loadSlots(dateInput.value);
        });
    }

    /* =========================================================
       Form submission
       ========================================================= */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitCooldown) return;

        // Validate step 4 fields
        const name = form.querySelector('#bs-name');
        const phone = form.querySelector('#bs-phone');
        const email = form.querySelector('#bs-email');
        const notes = form.querySelector('#bs-notes');
        const consent = form.querySelector('#bs-consent');
        const honeypot = form.querySelector('#bs-hp');

        let valid = true;

        if (!name.value.trim()) { showFieldError(name, 'Name is required'); valid = false; }
        else clearFieldError(name);

        const phonePattern = /^[+]?\d[\d\s\-]{7,15}$/;
        if (!phonePattern.test(phone.value.trim())) { showFieldError(phone, 'Enter a valid phone number'); valid = false; }
        else clearFieldError(phone);

        if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            showFieldError(email, 'Enter a valid email');
            valid = false;
        } else clearFieldError(email);

        if (!consent.checked) {
            showToast('Please agree to the terms to proceed.', 'error');
            valid = false;
        }

        if (!valid) return;

        // Anti-spam: cooldown
        submitCooldown = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';

        const payload = {
            patient_name: name.value.trim(),
            phone: phone.value.trim(),
            email: email.value.trim(),
            service_id: state.serviceId,
            date: state.date,
            slot_id: state.slotId,
            notes: notes.value.trim(),
            consent: true,
            honeypot: honeypot ? honeypot.value : ''
        };

        try {
            const result = await Api.bookAppointment(payload);

            if (result.success) {
                showConfirmation(result.booking_id);
                showToast('Appointment booked successfully!', 'success');
            } else {
                throw new Error(result.message || 'Booking failed');
            }
        } catch (err) {
            showToast(err.message || 'Something went wrong. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Booking';
        } finally {
            setTimeout(() => { submitCooldown = false; }, 10000);
        }
    });

    /* =========================================================
       Show confirmation card
       ========================================================= */
    function showConfirmation(bookingId) {
        formWrapper.style.display = 'none';
        confirmationEl.style.display = 'block';

        document.getElementById('conf-booking-id').textContent = bookingId;
        document.getElementById('conf-service').textContent = state.serviceName;
        document.getElementById('conf-date').textContent = formatDate(state.date);
        document.getElementById('conf-time').textContent = formatTime(state.slotTime);
    }

    /* =========================================================
       Helpers
       ========================================================= */
    function formatTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    function formatDate(d) {
        if (!d) return '';
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    function showFieldError(input, msg) {
        input.classList.add('form-control--error');
        const group = input.closest('.form-group');
        if (group) {
            group.classList.add('has-error');
            const errEl = group.querySelector('.form-error');
            if (errEl) errEl.textContent = msg;
        }
    }

    function clearFieldError(input) {
        input.classList.remove('form-control--error');
        const group = input.closest('.form-group');
        if (group) group.classList.remove('has-error');
    }

    function showSkeletonIn(container, count = 3) {
        let html = '<div class="skeleton-group">';
        for (let i = 0; i < count; i++) {
            html += '<div class="skeleton skeleton--card" style="height:44px;margin-bottom:8px;"></div>';
        }
        html += '</div>';
        container.insertAdjacentHTML('afterbegin', html);
    }

    function hideSkeletonIn(container) {
        const group = container.querySelector('.skeleton-group');
        if (group) group.remove();
    }

    function showRetryButton(container, fn) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--outline btn--sm';
        btn.textContent = 'Retry';
        btn.style.marginTop = '12px';
        btn.addEventListener('click', () => {
            btn.remove();
            fn();
        });
        container.appendChild(btn);
    }
});
