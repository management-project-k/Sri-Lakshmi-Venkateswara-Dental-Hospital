/**
 * Code.gs — Google Apps Script Web App API
 *
 * Connects to a Google Sheet with tabs: Services, Slots, Appointments.
 * Provides GET (services, slots) and POST (book appointment) endpoints.
 *
 * SETUP:
 *   1. Replace SPREADSHEET_ID below with your actual Google Sheet ID.
 *   2. Deploy as Web App: Execute as "Me", Access "Anyone".
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// ============================================================
// GET Handler
// ============================================================
function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();

    if (action === 'services') {
      return jsonResponse(getActiveServices());
    }

    if (action === 'slots') {
      const date = e.parameter.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return jsonResponse({ error: 'Invalid or missing date parameter. Use YYYY-MM-DD.' }, 400);
      }
      return jsonResponse(getAvailableSlots(date));
    }

    return jsonResponse({ error: 'Unknown action. Use ?action=services or ?action=slots&date=YYYY-MM-DD' }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ============================================================
// POST Handler
// ============================================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // --- Honeypot check ---
    if (payload.honeypot) {
      return jsonResponse({ success: false, message: 'Submission rejected.' }, 400);
    }

    // --- Validate required fields ---
    const required = ['patient_name', 'phone', 'service_id', 'date', 'slot_id'];
    for (const field of required) {
      if (!payload[field] || String(payload[field]).trim() === '') {
        return jsonResponse({ success: false, message: `Missing required field: ${field}` }, 400);
      }
    }

    // --- Phone validation ---
    const phone = String(payload.phone).replace(/[\s\-]/g, '');
    if (!/^\+?\d{8,15}$/.test(phone)) {
      return jsonResponse({ success: false, message: 'Invalid phone number format.' }, 400);
    }

    // --- Use LockService to prevent race conditions ---
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // wait up to 10s
    } catch (lockErr) {
      return jsonResponse({ success: false, message: 'Server busy. Please try again in a moment.' }, 503);
    }

    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // --- Verify slot exists and is Available ---
      const slotsSheet = ss.getSheetByName('Slots');
      const slotsData = slotsSheet.getDataRange().getValues();
      const slotHeaders = slotsData[0];
      const slotIdCol = slotHeaders.indexOf('slot_id');
      const slotDateCol = slotHeaders.indexOf('date');
      const slotStartCol = slotHeaders.indexOf('start_time');
      const slotStatusCol = slotHeaders.indexOf('status');

      let slotRow = -1;
      let slotStartTime = '';
      for (let i = 1; i < slotsData.length; i++) {
        const rowDate = formatSheetDate(slotsData[i][slotDateCol]);
        if (String(slotsData[i][slotIdCol]) === String(payload.slot_id) &&
            rowDate === payload.date &&
            slotsData[i][slotStatusCol] === 'Available') {
          slotRow = i + 1; // 1-indexed for sheet
          slotStartTime = slotsData[i][slotStartCol];
          break;
        }
      }

      if (slotRow === -1) {
        return jsonResponse({ success: false, message: 'Slot is no longer available. Please choose another.' }, 409);
      }

      // --- Get service name ---
      const servicesSheet = ss.getSheetByName('Services');
      const servicesData = servicesSheet.getDataRange().getValues();
      const svcHeaders = servicesData[0];
      const svcIdCol = svcHeaders.indexOf('service_id');
      const svcNameCol = svcHeaders.indexOf('service_name');
      let serviceName = '';
      for (let i = 1; i < servicesData.length; i++) {
        if (String(servicesData[i][svcIdCol]) === String(payload.service_id)) {
          serviceName = servicesData[i][svcNameCol];
          break;
        }
      }

      // --- Generate booking ID: BK-YYYYMMDD-XXXX ---
      const now = new Date();
      const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
      const rand = String(Math.floor(1000 + Math.random() * 9000));
      const bookingId = 'BK-' + dateStr + '-' + rand;

      // --- Write appointment ---
      const appointmentsSheet = ss.getSheetByName('Appointments');
      appointmentsSheet.appendRow([
        now,                                         // timestamp
        bookingId,                                    // booking_id
        payload.patient_name.trim(),                  // patient_name
        phone,                                        // phone
        (payload.email || '').trim(),                  // email
        payload.service_id,                            // service_id
        serviceName,                                   // service_name
        payload.date,                                  // date
        slotStartTime,                                 // start_time
        (payload.notes || '').trim(),                  // notes
        'New',                                         // status
        'Website'                                      // source
      ]);

      // --- Mark slot as Booked ---
      slotsSheet.getRange(slotRow, slotStatusCol + 1).setValue('Booked');

      return jsonResponse({ success: true, booking_id: bookingId, message: 'Appointment booked successfully.' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500);
  }
}

// ============================================================
// Helper: Get active services
// ============================================================
function getActiveServices() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Services');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idCol = headers.indexOf('service_id');
  const nameCol = headers.indexOf('service_name');
  const durCol = headers.indexOf('duration_mins');
  const activeCol = headers.indexOf('active');

  const services = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][activeCol] === true || data[i][activeCol] === 'TRUE' || data[i][activeCol] === true) {
      services.push({
        service_id: data[i][idCol],
        service_name: data[i][nameCol],
        duration_mins: data[i][durCol]
      });
    }
  }

  return { services };
}

// ============================================================
// Helper: Get available slots for a date
// ============================================================
function getAvailableSlots(date) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Slots');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idCol = headers.indexOf('slot_id');
  const dateCol = headers.indexOf('date');
  const startCol = headers.indexOf('start_time');
  const endCol = headers.indexOf('end_time');
  const statusCol = headers.indexOf('status');

  const slots = [];
  for (let i = 1; i < data.length; i++) {
    const rowDate = formatSheetDate(data[i][dateCol]);
    if (rowDate === date && data[i][statusCol] === 'Available') {
      slots.push({
        slot_id: data[i][idCol],
        start_time: formatSheetTime(data[i][startCol]),
        end_time: formatSheetTime(data[i][endCol])
      });
    }
  }

  return { slots };
}

// ============================================================
// Helper: Format date from Sheet (may be Date object) to YYYY-MM-DD
// ============================================================
function formatSheetDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

// ============================================================
// Helper: Format time from Sheet to HH:MM
// ============================================================
function formatSheetTime(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(val);
}

// ============================================================
// Helper: JSON response with CORS headers
// ============================================================
function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
