// ===== SEOGEO4YMYL — Simplified Nav Bar =====

import pkg from '../../package.json';

export function renderNavBar() {
  const nav = document.getElementById('nav-bar');
  if (!nav) return;

  nav.innerHTML = `
    <nav class="nav-bar">
      <div class="nav-bar__inner flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <a href="#/" class="nav-bar__logo m-0">SEOGEO4YMYL</a>
          <span class="text-xs text-muted" style="background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:10px">v${pkg.version}</span>
        </div>
        <div class="nav-bar__links">
          <a href="#/" class="nav-link nav-link--active" data-route="">🚀 分析</a>
        </div>
      </div>
    </nav>
  `;

  // Update active state on route change
  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#/', '');
    nav.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route;
      link.classList.toggle('nav-link--active', route === hash);
    });
  });
}
