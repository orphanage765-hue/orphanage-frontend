// ============================================
// api.js — All backend API calls
// ============================================

// ── Backend URL ────────────────────────────
// Change this to your Render backend URL before deploying to Netlify
// e.g. const API_BASE = 'https://kindconnect-backend.onrender.com';
const API_BASE = window.KINDCONNECT_API_BASE || 'https://kindconnect-backend.onrender.com';

// ── Token helpers ──────────────────────────
function getToken()  { return localStorage.getItem('kc_token'); }
function getRole()   { return localStorage.getItem('kc_role'); }
function getUser()   { return JSON.parse(localStorage.getItem('kc_user') || 'null'); }

function saveSession(token, role, user) {
  localStorage.setItem('kc_token', token);
  localStorage.setItem('kc_role', role);
  localStorage.setItem('kc_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('kc_token');
  localStorage.removeItem('kc_role');
  localStorage.removeItem('kc_user');
}

function isLoggedIn()  { return !!getToken(); }
function isAdmin()     { return getRole() === 'admin'; }
function isOrphanage() { return getRole() === 'orphanage'; }
function isUser()      { return getRole() === 'user'; }

// ── Core fetch wrapper ─────────────────────
async function apiFetch(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let res, data;
  try {
    res  = await fetch(API_BASE + path, opts);
    data = await res.json();
  } catch (networkErr) {
    throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:8000');
  }

  if (!res.ok) {
    // FastAPI returns detail as string OR as array of validation errors
    let msg = 'Request failed';
    if (typeof data.detail === 'string') {
      msg = data.detail;
    } else if (Array.isArray(data.detail)) {
      // Pydantic validation errors — extract readable messages
      msg = data.detail.map(e => {
        const field = e.loc ? e.loc[e.loc.length - 1] : '';
        return field ? `${field}: ${e.msg}` : e.msg;
      }).join(' | ');
    }
    throw new Error(msg);
  }
  return data;
}

// ── Auth ───────────────────────────────────
async function apiLogin(email, password, role) {
  return apiFetch('POST', '/auth/login', { email, password, role });
}

async function apiRegisterUser(payload) {
  return apiFetch('POST', '/users/register', payload);
}

async function apiRegisterOrphanage(payload) {
  return apiFetch('POST', '/orphanages/register', payload);
}

// ── Profile ────────────────────────────────
async function apiGetMyProfile() {
  const role = getRole();
  if (role === 'user')      return apiFetch('GET', '/users/me', null, true);
  if (role === 'orphanage') return apiFetch('GET', '/orphanages/me', null, true);
  return null;
}

// ── Orphanages ─────────────────────────────
async function apiListOrphanages() {
  return apiFetch('GET', '/orphanages/list');
}

// ── Donations ──────────────────────────────
async function apiSubmitDonation(payload) {
  return apiFetch('POST', '/donations/', payload);
}

async function apiMyDonations() {
  return apiFetch('GET', '/donations/my-donations', null, true);
}

async function apiOrphanageDonations() {
  return apiFetch('GET', '/donations/orphanage/received', null, true);
}

async function apiUpdateDonationStatus(id, status) {
  return apiFetch('PATCH', `/donations/${id}/status?new_status=${status}`, null, true);
}

// ── Admin ──────────────────────────────────
async function apiAdminStats() {
  return apiFetch('GET', '/admin/stats', null, true);
}

async function apiAdminUsers() {
  return apiFetch('GET', '/admin/users', null, true);
}

async function apiAdminOrphanages() {
  return apiFetch('GET', '/admin/orphanages', null, true);
}

async function apiAdminDonations() {
  return apiFetch('GET', '/admin/donations', null, true);
}

async function apiAdminDeleteUser(id) {
  return apiFetch('DELETE', `/admin/users/${id}`, null, true);
}

async function apiAdminDeleteOrphanage(id) {
  return apiFetch('DELETE', `/admin/orphanages/${id}`, null, true);
}

async function apiAdminDeleteDonation(id) {
  return apiFetch('DELETE', `/admin/donations/${id}`, null, true);
}

// ── Appointments ───────────────────────────────────────────────────────────
async function apiBookAppointment(payload) {
  return apiFetch('POST', '/appointments/', payload, true);
}
async function apiMyAppointments() {
  return apiFetch('GET', '/appointments/my-appointments', null, true);
}
async function apiOrphanageAppointments() {
  return apiFetch('GET', '/appointments/orphanage/received', null, true);
}
async function apiUpdateAppointmentStatus(id, status) {
  return apiFetch('PATCH', `/appointments/${id}/status?new_status=${status}`, null, true);
}
async function apiAdminAllAppointments() {
  return apiFetch('GET', '/appointments/admin/all', null, true);
}
async function apiDeleteAppointment(id) {
  return apiFetch('DELETE', `/appointments/${id}`, null, true);
}

// ── Feedback ───────────────────────────────────────────────────────────────
async function apiSubmitFeedback(payload) {
  return apiFetch('POST', '/feedback/', payload);
}
async function apiPublicFeedback() {
  return apiFetch('GET', '/feedback/public?limit=20');
}
async function apiAdminAllFeedback() {
  return apiFetch('GET', '/feedback/admin/all', null, true);
}
async function apiDeleteFeedback(id) {
  return apiFetch('DELETE', `/feedback/${id}`, null, true);
}

// ── UI Helpers ─────────────────────────────
function showAlert(message, type = 'success', containerId = null) {
  const existing = document.querySelectorAll('.kc-alert');
  existing.forEach(e => e.remove());

  const div = document.createElement('div');
  div.className = `alert alert-${type} kc-alert fade-in`;
  div.textContent = message;

  const target = containerId
    ? document.getElementById(containerId)
    : document.querySelector('.container-sm .card') || document.querySelector('.container');

  if (target) target.insertBefore(div, target.firstChild);
  setTimeout(() => div.remove(), 5000);
}

function requireAuth(redirectTo = '../index.html') {
  if (!isLoggedIn()) { window.location.href = redirectTo; return false; }
  return true;
}

function requireAdminAuth() {
  if (!isLoggedIn() || !isAdmin()) { window.location.href = '../index.html'; return false; }
  return true;
}

function logout() {
  clearSession();
  const isAdminPage = window.location.pathname.includes('/admin/');
  window.location.href = isAdminPage ? '../index.html' : 'index.html';
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else                           { input.type = 'password'; btn.textContent = '👁️'; }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount) {
  return '₹' + (amount || 0).toLocaleString('en-IN');
}
