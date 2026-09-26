import Constants from 'expo-constants';

/**
 * Where is the backend?
 *
 * "localhost" only works from a web browser or an iOS Simulator on the
 * SAME machine as the backend. A physical phone or an Android emulator
 * needs your computer's actual LAN IP address instead.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL, if you set one (recommended — see .env note below)
 *   2. Auto-detected from the Metro/Expo dev server's own host (works great
 *      when testing on a real device via Expo Go, since Expo already knows
 *      your computer's LAN IP to talk to your phone)
 *   3. localhost fallback (web / iOS Simulator only)
 *
 * To set it manually, create a file named `.env` in your project root with:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.23:5000/api
 * (use your own computer's LAN IP — find it with `ipconfig` on Windows,
 * look for "IPv4 Address"). Restart `npm start` after adding/editing .env.
 */
function resolveApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:5000/api`;
  }

  return 'http://localhost:5000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * A small error class so callers can check `error.status` and
 * `error.data` (the parsed JSON body your backend sent back), instead of
 * just getting a generic "fetch failed" message.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Every request in this file goes through here.
 *   path    e.g. "/auth/login"
 *   method  "GET" | "POST" | "PUT" | "DELETE"
 *   body    plain object — gets JSON.stringify'd for you
 *   token   pass a JWT to send `Authorization: Bearer <token>`
 */
async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    // fetch() itself throws for network failures (server down, wrong IP,
    // no internet) — this never reaches a status code at all.
    throw new ApiError(
      'Could not reach the server. Check that it is running and that the app can reach it on your network.',
      0,
      null
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // A non-JSON response (e.g. an HTML error page) — keep data as null.
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed (${response.status})`,
      response.status,
      data
    );
  }

  return data;
}

// ---- auth endpoints, matching your backend's authController.js ----

export function registerRequest({ name, email, password, phone, role }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password, phone, role },
  });
}

export function loginRequest({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function meRequest(token) {
  return apiRequest('/auth/me', { method: 'GET', token });
}   