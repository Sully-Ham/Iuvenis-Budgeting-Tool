const BASE = import.meta.env.VITE_API_URL || '/api';

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (email, password) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  getSettings: () => request('/settings'),
  updateSettings: (settings) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  getJobs: () => request('/jobs'),
  addJob: (job) => request('/jobs', { method: 'POST', body: JSON.stringify(job) }),
  updateJob: (id, job) => request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),

  getItems: () => request('/items'),
  addItem: (item) => request('/items', { method: 'POST', body: JSON.stringify(item) }),
  updateItem: (id, item) =>
    request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  getGoals: () => request('/goals'),
  addGoal: (goal) => request('/goals', { method: 'POST', body: JSON.stringify(goal) }),
  contributeToGoal: (id, delta) =>
    request(`/goals/${id}/contribute`, { method: 'PUT', body: JSON.stringify({ delta }) }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: 'DELETE' }),

  getReminders: () => request('/reminders'),
  addReminder: (reminder) => request('/reminders', { method: 'POST', body: JSON.stringify(reminder) }),
  deleteReminder: (id) => request(`/reminders/${id}`, { method: 'DELETE' })
};
