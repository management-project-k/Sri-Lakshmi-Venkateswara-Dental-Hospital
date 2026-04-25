/**
 * api.js — Fetch wrappers for Apps Script Web App
 */
const Api = (() => {
    const TIMEOUT_MS = 15000;

    async function request(url, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const res = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(body || `HTTP ${res.status}`);
            }

            return await res.json();
        } catch (err) {
            if (err.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * GET active services list
     * @returns {Promise<Array<{service_id, service_name, duration_mins}>>}
     */
    async function getServices() {
        const url = `${window.API_URL}?action=services`;
        const data = await request(url);
        return data.services || [];
    }

    /**
     * GET available slots for a date
     * @param {string} date — YYYY-MM-DD
     * @returns {Promise<Array<{slot_id, start_time, end_time}>>}
     */
    async function getSlots(date) {
        const url = `${window.API_URL}?action=slots&date=${encodeURIComponent(date)}`;
        const data = await request(url);
        return data.slots || [];
    }

    /**
     * POST new appointment
     * @param {Object} payload
     * @returns {Promise<{success, booking_id, message}>}
     */
    async function bookAppointment(payload) {
        const url = window.API_URL;
        const data = await request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Apps Script workaround
            body: JSON.stringify(payload)
        });
        return data;
    }

    return { getServices, getSlots, bookAppointment };
})();

window.Api = Api;
