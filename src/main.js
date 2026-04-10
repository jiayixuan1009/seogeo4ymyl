// ===== SEOGEO4YMYL v3.0 — Unified Architecture =====

import './styles/index.css';
import { registerRoute, initRouter } from './router.js';
import { renderNavBar } from './components/nav-bar.js';
import { renderHomePage } from './pages/home.js';
import { renderModulePage } from './pages/module-page.js';
import { MODULES } from './utils/constants.js';

// === Routes ===

// Home — unified input + results
registerRoute('', renderHomePage);

// Deep-dive module pages (kept as drill-down, not in main nav)
for (const mod of MODULES) {
  registerRoute(mod.id, (params) => renderModulePage(mod, params));
}

// === Initialize ===
renderNavBar();
initRouter();

console.log(
  '%c🚀 SEOGEO4YMYL v3.0 — Unified Architecture\n%cSingle flow: URL + Keyword + Competitors → Summary → Insights → Actions',
  'color:#00ff88;font-size:14px;font-weight:bold',
  'color:#4d9fff;font-size:11px'
);
