/**
 * config.js — Clinic constants & API configuration
 * Edit these values to update clinic info across the site.
 */
const CLINIC = Object.freeze({
  name: 'Sri Lakshmi Venkateswara Dental Hospital',
  altName: 'Sri Lakshmi Venkateshwara Super Speciality Dental Hospital',
  doctor: 'Dr. Rajasekhar Yadav',
  phone: '+91 90522 77769',
  phoneRaw: '+919052277769',
  whatsappLink: 'https://wa.me/919052277769?text=Hi%2C%20I%20would%20like%20to%20book%20an%20appointment.',
  email: '',
  address: 'Holmes Pet Rd, opposite Kanva Mart, Ward 20, Holmes Pet, Proddatur, Andhra Pradesh 516360',
  city: 'Proddatur',
  state: 'Andhra Pradesh',
  country: 'India',
  zip: '516360',
  mapQuery: 'Sri+Lakshmi+Venkateswara+Dental+Hospital+Proddatur',
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.0!2d78.55!3d14.75!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1sen!2sin!4v1700000000000',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Sri+Lakshmi+Venkateswara+Dental+Hospital+Proddatur',

  hours: {
    display: 'Mon–Sat: 9:00 AM – 9:00 PM',
    open: '09:00',
    close: '21:00',
    days: 'Mo,Tu,We,Th,Fr,Sa',
    note: 'Closed on Sundays'
  },

  ratings: {
    google: { score: 5.0, count: 97, url: 'https://g.page/CLINIC_GOOGLE_PLACE_ID/review' },
    justdial: { score: 5.0, count: 204, url: 'https://www.justdial.com/' }
  },

  pricing: {
    startingFrom: 1500,
    currency: '₹',
    note: 'Indicative pricing'
  }
});

/**
 * Apps Script Web App URL — Replace with your deployed URL
 */
const API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

/* Expose globally */
window.CLINIC = CLINIC;
window.API_URL = API_URL;
