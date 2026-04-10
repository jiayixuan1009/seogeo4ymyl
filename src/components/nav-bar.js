// ===== SEOGEO4YMYL — Simplified Nav Bar =====

export function renderNavBar() {
  const nav = document.getElementById('nav-bar');
  if (!nav) return;

  nav.innerHTML = `
    <nav class="nav-bar">
      <div class="nav-bar__inner">
        <a href="#/" class="nav-bar__logo">SEOGEO4YMYL</a>
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
