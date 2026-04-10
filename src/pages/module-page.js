// ===== SEOGEO4YMYL — Generic Module Page Template =====

import { store } from '../core/store.js';
import { navigate } from '../router.js';
import { MODULES, PERSONAS } from '../utils/constants.js';
import { fetchSiteResources, clearFetchCache } from '../core/fetcher.js';
import { parseHtml, enrichPageData } from '../core/parser.js';
import { getAnalyzerById } from '../analyzers/registry.js';
import { impactBadgeHtml, confidenceBadgeHtml } from '../core/audit-formatter.js';

/**
 * Render a module-specific independent analysis page
 * @param {Object} moduleConfig - Module definition from MODULES
 * @param {Object} params - Route params (may contain ?url=)
 */
export function renderModulePage(moduleConfig, params = {}) {
  const mod = typeof moduleConfig === 'function' ? null : moduleConfig;
  const modDef = mod || MODULES.find(m => m.id === (params.moduleId || store.state.currentRoute));

  if (!modDef) {
    return { html: `<div class="container" style="padding:80px 0;text-align:center"><h2>模块未找到</h2></div>`, mount: () => {} };
  }

  const html = `
    <div class="container" style="padding-top:var(--space-10)">
      <!-- Module Header -->
      <div class="animate-fade-in" style="margin-bottom:var(--space-8)">
        <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4)">
          <div style="font-size:var(--font-size-4xl)">${modDef.icon}</div>
          <div>
            <h1 style="font-size:var(--font-size-3xl);font-weight:800">${modDef.name}</h1>
            <p style="color:var(--text-secondary);font-size:var(--font-size-sm)">${modDef.nameEn} · 独立模块分析 · 权重 ${Math.round(modDef.weight * 100)}%</p>
          </div>
        </div>
      </div>

      <!-- Batch URL Input -->
      <div class="glass-card animate-slide-up" style="animation-delay:0.1s;margin-bottom:var(--space-6)">
        <label style="display:block;font-weight:600;margin-bottom:var(--space-3);font-size:var(--font-size-sm)">
          输入 URL（每行一个，最多 10 个）
        </label>
        <textarea
          id="batch-url-input"
          rows="5"
          style="width:100%;resize:vertical;font-family:var(--font-family);font-size:var(--font-size-sm);line-height:1.8;padding:var(--space-4)"
          placeholder="https://wise.com/us/send-money&#10;https://www.binance.com/en/markets&#10;https://www.futunn.com/trade"
        >${params.url ? params.url : ''}</textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-4)">
          <span style="color:var(--text-muted);font-size:var(--font-size-xs)" id="url-count">0/10 个 URL</span>
          <button class="btn btn-primary" id="btn-analyze">🔍 开始分析</button>
        </div>
      </div>

      <!-- Progress -->
      <div class="progress-container" id="module-progress">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="module-progress-fill"></div>
        </div>
        <div class="progress-label" id="module-progress-label">准备中...</div>
      </div>

      <!-- Results Area -->
      <div id="module-results" style="margin-top:var(--space-6)"></div>
    </div>
  `;

  function mount(root) {
    const textarea = root.querySelector('#batch-url-input');
    const urlCountEl = root.querySelector('#url-count');
    const btnAnalyze = root.querySelector('#btn-analyze');
    const progressContainer = root.querySelector('#module-progress');
    const progressFill = root.querySelector('#module-progress-fill');
    const progressLabel = root.querySelector('#module-progress-label');
    const resultsArea = root.querySelector('#module-results');

    // URL count
    function updateCount() {
      const urls = textarea.value.split('\n').map(u => u.trim()).filter(Boolean);
      urlCountEl.textContent = `${Math.min(urls.length, 10)}/10 个 URL`;
      urlCountEl.style.color = urls.length > 10 ? 'var(--accent-red)' : 'var(--text-muted)';
    }
    textarea.addEventListener('input', updateCount);
    updateCount();

    // Auto-analyze if URL passed via route
    if (params.url) {
      setTimeout(() => btnAnalyze.click(), 300);
    }

    // Analyze handler
    btnAnalyze.addEventListener('click', async () => {
      const urls = textarea.value.split('\n').map(u => u.trim()).filter(Boolean).slice(0, 10);
      if (urls.length === 0) { textarea.focus(); return; }

      // Validate
      for (const u of urls) {
        try { new URL(u); } catch {
          resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ 无效 URL: ${u}</div>`;
          return;
        }
      }

      progressContainer.classList.add('active');
      resultsArea.innerHTML = '';
      let step = 0;
      const totalSteps = urls.length * 2;

      const update = (label) => {
        step++;
        progressFill.style.width = `${Math.round((step / totalSteps) * 100)}%`;
        progressLabel.textContent = label;
      };

      const urlResults = [];

      for (const url of urls) {
        try {
          update(`抓取: ${new URL(url).hostname}...`);
          const resources = await fetchSiteResources(url, modDef.requiredResources);

          if (!resources.html?.ok) {
            urlResults.push({ url, error: '抓取失败' });
            update(`${new URL(url).hostname} 抓取失败`);
            continue;
          }

          let pageData = parseHtml(url, resources.html.text);
          pageData = enrichPageData(pageData, resources);
          update(`分析: ${new URL(url).hostname}...`);

          const analyzer = getAnalyzerById(modDef.id);
          const result = analyzer ? analyzer.analyze(pageData) : { rawScore: 0, items: [] };

          urlResults.push({
            url,
            data: pageData,
            score: result.rawScore,
            items: result.items,
          });
        } catch (err) {
          urlResults.push({ url, error: err.message });
          update(`${url} 错误`);
        }
      }

      progressContainer.classList.remove('active');

      // Render results
      resultsArea.innerHTML = urlResults.map((r, i) => {
        if (r.error) {
          return `<div class="glass-card" style="margin-bottom:var(--space-4);border-color:var(--accent-red)">
            <strong>${r.url}</strong>
            <p style="color:var(--accent-red);margin-top:var(--space-2)">❌ ${r.error}</p>
          </div>`;
        }

        const d = r.data;
        const colorClass = r.score >= 70 ? 'var(--accent-green)' : r.score >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';
        
        let itemsHtml = (r.items || []).map(item => `
          <div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid rgba(255,255,255,0.05)">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
              <div style="font-weight:600">${item.finding}</div>
              <div>${confidenceBadgeHtml(item.confidence)} ${impactBadgeHtml(item.impact)}</div>
            </div>
            <div style="color:var(--text-secondary);font-size:var(--font-size-sm);margin-bottom:var(--space-2)">
              ${item.evidence}
            </div>
            ${item.fix ? `<div style="color:var(--accent-gold);font-size:var(--font-size-sm);margin-bottom:var(--space-2)">🔧 建议: ${item.fix}</div>` : ''}
            
            ${item.fixCode ? `
            <div style="background:#1a1c23;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:var(--space-3);margin-top:var(--space-2)">
              <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);">
                <span style="font-size:var(--font-size-xs);color:var(--text-muted)">修复代码 (Fix Code)</span>
                <button class="btn btn-ghost" style="padding:0 var(--space-2);font-size:var(--font-size-xs)" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='已复制!🥑';setTimeout(()=>this.innerText='复制',2000)">复制</button>
              </div>
              <pre style="margin:0;overflow-x:auto;font-size:var(--font-size-xs);color:#a5d6ff"><code>${item.fixCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
            ` : ''}

            ${item.llmReviewRequired && item.prompt ? `
            <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:4px;padding:var(--space-3);margin-top:var(--space-2)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
                <span style="font-size:var(--font-size-xs);color:var(--accent-blue);font-weight:600">🎯 AI 语义复审提示词</span>
                <button class="btn btn-ghost" style="padding:0 var(--space-2);font-size:var(--font-size-xs);color:var(--accent-blue)" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='已复制!🥑';setTimeout(()=>this.innerText='复制 Prompt',2000)">复制 Prompt</button>
              </div>
              <pre style="margin:0;white-space:pre-wrap;font-size:var(--font-size-xs);color:var(--text-secondary)"><code>${item.prompt}</code></pre>
            </div>
            ` : ''}
          </div>
        `).join('');

        if ((r.items || []).length === 0) {
           itemsHtml = `<div style="color:var(--text-muted);font-size:var(--font-size-sm);margin-top:var(--space-4)">无详细审计结果。</div>`;
        }

        return `<div class="glass-card" style="margin-bottom:var(--space-4);animation:slideUp 0.5s ease ${i * 0.1}s both">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
            <div>
               <strong style="font-size:var(--font-size-base)">${d.url}</strong>
               <span class="badge badge-info" style="margin-left:var(--space-2)">${d.source}</span>
            </div>
            <div style="font-size:var(--font-size-xl);font-weight:800;color:${colorClass}">
               ${r.score}
            </div>
          </div>
          <div style="background:rgba(0,0,0,0.2);padding:var(--space-4);border-radius:8px">
             <!-- Audit Items List -->
             ${itemsHtml}
          </div>
        </div>`;
      }).join('');
    });

    return () => {};
  }

  return { html, mount };
}
