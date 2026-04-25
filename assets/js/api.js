import { APPS_SCRIPT_URL } from "./config.js";

const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Request failed.");
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function ensureConfigured() {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    throw new Error("Booking API not configured. Add your Apps Script URL in assets/js/config.js.");
  }
}

export async function getServices() {
  ensureConfigured();
  const url = `${APPS_SCRIPT_URL}?action=services`;
  const data = await fetchWithTimeout(url);
  return data.services || [];
}

export async function getSlots(date) {
  ensureConfigured();
  const url = `${APPS_SCRIPT_URL}?action=slots&date=${encodeURIComponent(date)}`;
  const data = await fetchWithTimeout(url);
  return data.slots || [];
}

export async function createAppointment(payload) {
  ensureConfigured();
  return fetchWithTimeout(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
