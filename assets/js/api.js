const API = {
  base: '/api',
  token: localStorage.getItem('pos_token') || sessionStorage.getItem('pos_token') || null,
  user: JSON.parse(localStorage.getItem('pos_user') || sessionStorage.getItem('pos_user') || 'null'),

  setAuth(token, user, remember = true) {
    this.token = token; this.user = user;
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    store.setItem('pos_token', token);
    store.setItem('pos_user', JSON.stringify(user));
    other.removeItem('pos_token');
    other.removeItem('pos_user');
  },
  clearAuth() {
    this.token = null; this.user = null;
    localStorage.removeItem('pos_token'); localStorage.removeItem('pos_user');
    sessionStorage.removeItem('pos_token'); sessionStorage.removeItem('pos_user');
  },

  async req(method, path, body) {
    const opts = { method, headers: {} };
    if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(this.base + path, opts);
    if (res.status === 401) { this.clearAuth(); location.reload(); throw new Error('Unauthorized'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get(p) { return this.req('GET', p); },
  post(p, b) { return this.req('POST', p, b); },
  put(p, b) { return this.req('PUT', p, b); },
  patch(p, b) { return this.req('PATCH', p, b); },
  del(p) { return this.req('DELETE', p); },
};
