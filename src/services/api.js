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
    request('/brukere/login', { method: 'POST', body: JSON.stringify({ username: brukernavn, password: passord }) }),
  logout: () =>
    request('/brukere/logout', { method: 'POST' }),
  register: (data) => {
    // normalize Norwegian field names to backend expectations
    const payload = { ...data };
    if (payload.brukernavn) { payload.username = payload.brukernavn; delete payload.brukernavn; }
    if (payload.passord) { payload.password = payload.passord; delete payload.passord; }
    return request('/brukere/register', { method: 'POST', body: JSON.stringify(payload) });
  },
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
  getAll: () => request('/roller'),
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
  updateStatus: (hendelseId, statusId) =>
      request(`/hendelser/${hendelseId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ statusId })
      }),
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
  
  // Endret fra (hendelseId, innhold) til (hendelseId, brukerId, tekst)
  create: (hendelseId, brukerId, tekst) =>
    request(`/kommentarer/${hendelseId}/kommentarer`, { 
      method: 'POST', 
      body: JSON.stringify({ 
        brukerId, // Sender nå brukerId
        tekst     // Bruker feltnavnet 'tekst' som forespurt
      }) 
    }),

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
  createStatus: (data) => request('/lookup/statuser', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, data) => request(`/lookup/statuser/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStatus: (id) => request(`/lookup/statuser/${id}`, { method: 'DELETE' }),

  getPriorities: () => request('/lookup/prioriteringer'),
  createPriority: (data) => request('/lookup/prioriteringer', { method: 'POST', body: JSON.stringify(data) }),
  updatePriority: (id, data) => request(`/lookup/prioriteringer/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePriority: (id) => request(`/lookup/prioriteringer/${id}`, { method: 'DELETE' }),

  getCategories: () => request('/lookup/kategorier'),
  createCategory: (data) => request('/lookup/kategorier', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/lookup/kategorier/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/lookup/kategorier/${id}`, { method: 'DELETE' }),

  getRoles: () => request('/roller'),
  createRole: (data) => request('/roller', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id, data) => request(`/roller/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id) => request(`/roller/${id}`, { method: 'DELETE' }),
};