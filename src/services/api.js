const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3868/api/v1.0.0';
console.log('API Base URL:', BASE_URL);

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  if (res.status === 204) return null;
  return res.json();
}

// --- Auth ---
export const auth = {
  login: (brukernavn, passord) =>
    request('/brukere/login', { method: 'POST', body: JSON.stringify({ brukernavn, passord }) }),
  logout: () =>
    request('/brukere/logout', { method: 'POST' }),
  register: (data) =>
    request('/brukere/register', { method: 'POST', body: JSON.stringify(data) }),
};

// --- Brukere ---
export const brukere = {
  getAll: () => request('/brukere'),
  getById: (id) => request(`/brukere/${id}`),
  getWithRoles: (id) => request(`/brukere/${id}/roller`),
  update: (id, data) => request(`/brukere/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/brukere/${id}`, { method: 'DELETE' }),
};

// --- Roller ---
export const roller = {
  assign: (brukerId, rolleId) =>
    request(`/roller/${brukerId}/roller`, { method: 'POST', body: JSON.stringify({ rolleId }) }),
  remove: (brukerId, rolleId) =>
    request(`/roller/${brukerId}/roller/${rolleId}`, { method: 'DELETE' }),
  getForUser: (brukerId) => request(`/roller/${brukerId}/roller`),
};

// --- Hendelser ---
export const hendelser = {
  getAll: () => request('/hendelser'),
  getById: (id) => request(`/hendelser/${id}`),
  create: (data) => request('/hendelser', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/hendelser/${id}`, { method: 'DELETE' }),
  updateStatus: (id, status) =>
    request(`/hendelser/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updatePriority: (id, prioritering) =>
    request(`/hendelser/${id}/prioritering`, { method: 'PATCH', body: JSON.stringify({ prioritering }) }),
  updateResponsible: (id, ansvarligId) =>
    request(`/hendelser/${id}/ansvarlig`, { method: 'PATCH', body: JSON.stringify({ ansvarligId }) }),
  getCategories: (id) => request(`/hendelser/${id}/kategorier`),
  addCategory: (id, kategoriId) =>
    request(`/hendelser/${id}/kategorier`, { method: 'POST', body: JSON.stringify({ kategoriId }) }),
  removeCategory: (id, kategoriId) =>
    request(`/hendelser/${id}/kategorier/${kategoriId}`, { method: 'DELETE' }),
};

// --- Kommentarer ---
export const kommentarer = {
  getByHendelse: (hendelseId) => request(`/kommentarer/${hendelseId}/kommentarer`),
  create: (hendelseId, innhold) =>
    request(`/kommentarer/${hendelseId}/kommentarer`, { method: 'POST', body: JSON.stringify({ innhold }) }),
  delete: (id) => request(`/kommentarer/${id}`, { method: 'DELETE' }),
};

// --- Tiltak ---
export const tiltak = {
  getByHendelse: (hendelseId) => request(`/tiltak/${hendelseId}/tiltak`),
  add: (hendelseId, data) =>
    request(`/tiltak/${hendelseId}/tiltak`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/tiltak/${id}`, { method: 'DELETE' }),
};

// --- Lookup ---
export const lookup = {
  getStatuses: () => request('/lookup/statuser'),
  getPriorities: () => request('/lookup/prioriteringer'),
  getCategories: () => request('/lookup/kategorier'),
  getRoles: () => request('/lookup/roller'),
};