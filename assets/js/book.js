import { CLINIC } from "./config.js";
import { createAppointment, getServices, getSlots } from "./api.js";

const state = {
  selectedService: null,
  selectedDate: "",
  selectedSlot: null,
  submitReadyAt: Date.now() + 10000,
};

const els = {
  serviceSelect: document.getElementById("service_id"),
  dateInput: document.getElementById("date"),
  slotsWrap: document.getElementById("slotsWrap"),
  slotStatus: document.getElementById("slotStatus"),
  form: document.getElementById("bookingForm"),
  submitBtn: document.getElementById("submitBtn"),
  submitHint: document.getElementById("submitHint"),
  successCard: document.getElementById("successCard"),
  bookingId: document.getElementById("bookingId"),
  retryBtn: document.getElementById("retrySlots"),
  steps: document.querySelectorAll(".step"),
};

function setStep(index) {
  els.steps.forEach((step, i) => step.classList.toggle("active", i <= index));
}

function setTodayMin() {
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  els.dateInput.min = iso;
}

function setSlotsLoading() {
  els.slotsWrap.innerHTML = "";
  for (let i = 0; i < 4; i += 1) {
    const node = document.createElement("div");
    node.className = "skeleton";
    els.slotsWrap.appendChild(node);
  }
  els.slotStatus.textContent = "Fetching available slots...";
}

function setSlotsEmpty(message) {
  els.slotsWrap.innerHTML = "";
  els.slotStatus.textContent = message;
}

function renderSlots(slots) {
  els.slotsWrap.innerHTML = "";
  if (!slots.length) {
    setSlotsEmpty("No open slots for this date. Please choose another date.");
    return;
  }
  const fragment = document.createDocumentFragment();
  slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";
    btn.dataset.slotId = slot.slot_id;
    btn.textContent = `${slot.start_time} - ${slot.end_time}`;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      els.slotsWrap.querySelectorAll(".slot-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      state.selectedSlot = slot;
      setStep(2);
    });
    fragment.appendChild(btn);
  });
  els.slotsWrap.appendChild(fragment);
  els.slotStatus.textContent = "Select a suitable slot.";
}

async function loadServices() {
  els.serviceSelect.innerHTML = '<option value="">Loading services...</option>';
  try {
    const services = await getServices();
    els.serviceSelect.innerHTML = '<option value="">Choose service</option>';
    services.forEach((service) => {
      const option = document.createElement("option");
      option.value = service.service_id;
      option.textContent = `${service.service_name} (${service.duration_mins} mins)`;
      option.dataset.serviceName = service.service_name;
      els.serviceSelect.appendChild(option);
    });
  } catch (error) {
    els.serviceSelect.innerHTML = '<option value="">Unable to load services</option>';
    window.showToast(error.message, "error");
  }
}

async function loadSlots() {
  if (!state.selectedDate) return;
  setSlotsLoading();
  try {
    const slots = await getSlots(state.selectedDate);
    renderSlots(slots);
  } catch (error) {
    setSlotsEmpty("Could not load slots. Please retry.");
    els.retryBtn.classList.remove("hide");
    window.showToast(error.message, "error");
  }
}

function setSubmitLock() {
  els.submitBtn.disabled = true;
  const timer = setInterval(() => {
    const secondsLeft = Math.max(0, Math.ceil((state.submitReadyAt - Date.now()) / 1000));
    if (secondsLeft <= 0) {
      els.submitHint.textContent = "";
      els.submitBtn.disabled = false;
      clearInterval(timer);
      return;
    }
    els.submitHint.textContent = `Submit enabled in ${secondsLeft}s`;
  }, 250);
}

function phoneValid(phone) {
  return /^\+?\d[\d\s-]{8,14}$/.test(phone.trim());
}

async function onSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.form);
  const honeypot = formData.get("website");

  if (Date.now() < state.submitReadyAt) {
    window.showToast("Please wait a few seconds and try again.", "error");
    return;
  }
  if (honeypot) {
    window.showToast("Submission blocked.", "error");
    return;
  }
  if (!state.selectedSlot) {
    window.showToast("Choose a time slot to continue.", "error");
    return;
  }
  if (!phoneValid(formData.get("phone"))) {
    window.showToast("Enter a valid phone number.", "error");
    return;
  }
  if (!formData.get("consent")) {
    window.showToast("Please provide consent to proceed.", "error");
    return;
  }

  const serviceOption = els.serviceSelect.selectedOptions[0];
  const payload = {
    patient_name: formData.get("patient_name").trim(),
    phone: formData.get("phone").trim(),
    email: formData.get("email").trim(),
    service_id: formData.get("service_id"),
    date: formData.get("date"),
    slot_id: state.selectedSlot.slot_id,
    notes: formData.get("notes").trim(),
    consent: true,
    honeypot,
    service_name: serviceOption ? serviceOption.dataset.serviceName : "",
    source: "Website",
  };

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "Booking...";
  try {
    const result = await createAppointment(payload);
    els.bookingId.textContent = result.booking_id;
    els.successCard.classList.remove("hide");
    els.form.classList.add("hide");
    setStep(3);
    window.showToast("Appointment request received.");
  } catch (error) {
    window.showToast(error.message, "error");
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = "Confirm Appointment";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!els.form) return;
  document.getElementById("clinicPhoneBook").textContent = CLINIC.phoneDisplay;
  setTodayMin();
  setSubmitLock();
  loadServices();

  els.serviceSelect.addEventListener("change", () => {
    state.selectedService = els.serviceSelect.value;
    state.selectedSlot = null;
    if (state.selectedService) setStep(1);
  });

  els.dateInput.addEventListener("change", () => {
    state.selectedDate = els.dateInput.value;
    state.selectedSlot = null;
    if (!state.selectedDate) return;
    setStep(1);
    els.retryBtn.classList.add("hide");
    loadSlots();
  });

  els.retryBtn.addEventListener("click", loadSlots);
  els.form.addEventListener("submit", onSubmit);
});