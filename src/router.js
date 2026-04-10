// ===== SEOGEO4YMYL — Hash-based SPA Router =====

import { store } from './core/store.js';

const routes = new Map();
let currentCleanup = null;

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

export function navigate(path, params = {}) {
  const search = new URLSearchParams(params).toString();
  window.location.hash = search ? `#/${path}?${search}` : `#/${path}`;
}

function parseHash() {
  const raw = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart.replace(/^\//, '').replace(/\/$/, '');
  const params = Object.fromEntries(new URLSearchParams(queryPart || ''));
  return { path, params };
}

async function handleRoute() {
  const { path, params } = parseHash();

  // Cleanup previous page
  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (e) { console.warn('[Router] cleanup error:', e); }
    currentCleanup = null;
  }

  store.state.currentRoute = path;
  store.state.routeParams = params;

  const handler = routes.get(path) || routes.get('');
  if (!handler) return;

  const appRoot = document.getElementById('app-root');
  try {
    const page = await handler(params);
    appRoot.innerHTML = '';
    appRoot.insertAdjacentHTML('beforeend', page.html);
    if (page.mount) {
      currentCleanup = page.mount(appRoot);
    }
  } catch (err) {
    console.error('[Router] Page render error:', err);
    appRoot.innerHTML = `<div class="container" style="padding-top:80px;text-align:center;">
      <h2 style="color:var(--accent-red)">Page Error</h2>
      <p style="color:var(--text-secondary)">${err.message}</p>
    </div>`;
  }

  // Update nav active state
  store.emit('route:changed', { path, params });
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
