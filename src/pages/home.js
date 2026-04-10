// ===== SEOGEO4YMYL — Home Page (Unified) =====
// Single input: URL (required) + Keyword (optional) + Competitors (optional)

import { store } from '../core/store.js';
import { fetchSiteResources, clearFetchCache } from '../core/fetcher.js';
import { parseHtml, enrichPageData } from '../core/parser.js';
import { runUnifiedAnalysis } from '../analyzers/unified-engine.js';
import { renderUnifiedResults, initUnifiedResults } from './unified-results.js';
import { crawlLightweightSite } from '../core/spider.js';
import { parseScreamingFrogCSV } from '../core/csv-parser.js';
import { analyzeSiteData } from '../core/engine/site-rule-engine.js';
import { renderSiteResults, drawNetworkGraph, renderSiteActions } from './site-results.js';

export function renderHomePage() {
  const html = `
    <div class="container">
      <!-- Hero -->
      <section class="hero animate-fade-in">
        <div class="hero__badge">🔥 基于 March 2026 Google Core Update 校准</div>
        <h1 class="hero__title">Fintech SEO/GEO<br/>一站式诊断</h1>
        <p class="hero__subtitle">
          输入 URL 即可获得 AI 引用就绪度诊断。添加关键词和竞品获得更深入的分析。
        </p>
      </section>

      <!-- Unified Input / Tabs -->
      <section class="animate-slide-up" style="animation-delay:0.1s;max-width:720px;margin:0 auto var(--space-6)">
        
        <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);justify-content:center;">
          <button id="tab-single" class="btn btn-secondary" style="border-radius:20px;padding:8px 24px;background:var(--accent-blue);color:white;border:none">📄 单页微观重写</button>
          <button id="tab-site" class="btn btn-ghost" style="border-radius:20px;padding:8px 24px;border:none">🕸️ 网站内链架构</button>
        </div>

        <!-- Form 1: Single Page -->
        <div class="glass-card" id="form-single">
          <!-- URL (Required) -->
          <div style="margin-bottom:var(--space-4)">
            <label style="display:block;font-size:var(--font-size-xs);color:var(--accent-green);margin-bottom:var(--space-2);font-weight:600">
              🔗 页面 URL <span style="color:var(--accent-red)">*</span>
            </label>
            <input type="url" id="input-url" placeholder="https://example.com/your-page" style="width:100%;font-size:var(--font-size-base)" />
          </div>

          <!-- Keyword (Optional) -->
          <div style="margin-bottom:var(--space-4)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
              <label style="font-size:var(--font-size-xs);color:var(--accent-blue);font-weight:600">
                🎯 目标关键词 <span style="color:var(--text-muted);font-weight:400">(选填 — 激活 Intent 分析)</span>
              </label>
            </div>
            <input type="text" id="input-keyword" placeholder="如: 国际汇款费用对比" style="width:100%" />
          </div>

          <!-- Competitors (Optional, collapsed by default) -->
          <details id="competitor-section" style="margin-bottom:var(--space-4)">
            <summary style="font-size:var(--font-size-xs);color:var(--accent-orange);font-weight:600;cursor:pointer;margin-bottom:var(--space-2)">
              ⚔️ 竞品 URL (选填 — 激活竞品对标 + 信息增益 + AI 引用排名)
            </summary>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-top:var(--space-3)" class="competitor-inputs">
              <input type="url" id="input-comp-1" placeholder="竞品 1" style="width:100%" />
              <input type="url" id="input-comp-2" placeholder="竞品 2 (可选)" style="width:100%" />
              <input type="url" id="input-comp-3" placeholder="竞品 3 (可选)" style="width:100%" />
            </div>
          </details>

          <!-- Submit -->
          <div style="text-align:center">
            <button class="btn btn-primary btn-lg" id="btn-analyze" style="min-width:240px">
              🚀 开始分析
            </button>
          </div>
        </div>

        <!-- Form 2: Site Architecture -->
        <div class="glass-card" id="form-site" style="display:none">
          <h3 style="margin-top:0;font-size:var(--font-size-lg)">🕸️ 全站 / 版块拓扑扫描</h3>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:var(--space-4)">输入根目录让轻量化蜘蛛爬取上下级结构，或导入大型网站的 Screaming Frog CSV。</p>
          
          <div style="margin-bottom:var(--space-4)">
            <label style="display:block;font-size:var(--font-size-xs);color:var(--accent-green);margin-bottom:var(--space-2);font-weight:600">
              🔗 版块 Root URL (前端轻量蛛蛛)
            </label>
            <div style="display:flex;gap:var(--space-2)">
              <input type="url" id="input-site-url" placeholder="https://example.com/blog/" style="flex:1" />
              <button id="btn-spider" class="btn btn-primary" style="flex-shrink:0">🕸️ 织网爬取</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">安全限制：单次并发上限 40 页面（防由于跨域及内存导致崩溃）</div>
          </div>
          
          <div style="text-align:center;margin:var(--space-4) 0;color:var(--text-muted);font-size:11px">— 或者 —</div>
          
          <div style="margin-bottom:var(--space-2);padding:var(--space-4);border:1px dashed var(--border-default);border-radius:8px;text-align:center">
            <div style="font-size:var(--font-size-lg);margin-bottom:var(--space-2)">📊</div>
            <div style="font-size:13px;margin-bottom:var(--space-3)">上传 Screaming Frog 导出的 Internal HTML CSV</div>
            <input type="file" id="input-csv" accept=".csv" style="display:none" />
            <button id="btn-trigger-file" class="btn btn-secondary">选择 CSV 文件</button>
            <div id="csv-filename" style="font-size:11px;margin-top:8px;color:var(--accent-blue)"></div>
          </div>
        </div>

      </section>

      <!-- Progress -->
      <div class="progress-container" id="progress-area">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="progress-fill"></div>
        </div>
        <div class="progress-label" id="progress-label">准备中...</div>
      </div>

      <!-- Results -->
      <div id="results-area" style="display:none"></div>
    </div>
  `;

  function mount(root) {
    const urlInput = root.querySelector('#input-url');
    const kwInput = root.querySelector('#input-keyword');
    const comp1 = root.querySelector('#input-comp-1');
    const comp2 = root.querySelector('#input-comp-2');
    const comp3 = root.querySelector('#input-comp-3');
    const btnAnalyze = root.querySelector('#btn-analyze');
    const progressArea = root.querySelector('#progress-area');
    const progressFill = root.querySelector('#progress-fill');
    const progressLabel = root.querySelector('#progress-label');
    const resultsArea = root.querySelector('#results-area');

    // DOM Refs for Site Mode
    const tabSingle = root.querySelector('#tab-single');
    const tabSite = root.querySelector('#tab-site');
    const formSingle = root.querySelector('#form-single');
    const formSite = root.querySelector('#form-site');
    const inputSiteUrl = root.querySelector('#input-site-url');
    const btnSpider = root.querySelector('#btn-spider');
    const inputCsv = root.querySelector('#input-csv');
    const btnTriggerFile = root.querySelector('#btn-trigger-file');
    const csvFilename = root.querySelector('#csv-filename');

    // Tab Switching
    function switchTab(mode) {
      if (mode === 'single') {
        tabSingle.style.background = 'var(--accent-blue)';
        tabSingle.style.color = 'white';
        tabSite.style.background = 'transparent';
        tabSite.style.color = 'var(--text-primary)';
        formSingle.style.display = 'block';
        formSite.style.display = 'none';
      } else {
        tabSite.style.background = 'var(--accent-blue)';
        tabSite.style.color = 'white';
        tabSingle.style.background = 'transparent';
        tabSingle.style.color = 'var(--text-primary)';
        formSite.style.display = 'block';
        formSingle.style.display = 'none';
      }
      resultsArea.style.display = 'none'; // hide previous results
    }

    tabSingle.addEventListener('click', () => switchTab('single'));
    tabSite.addEventListener('click', () => switchTab('site'));

    // --- Original Single Page Analysis Handler ---
    btnAnalyze.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) { urlInput.focus(); return; }

      // Validate URL
      try { new URL(url); } catch {
        resultsArea.style.display = 'block';
        resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ 无效 URL: ${url}</div>`;
        return;
      }

      const keyword = kwInput.value.trim() || null;
      const competitorUrls = [comp1.value.trim(), comp2.value.trim(), comp3.value.trim()].filter(Boolean);

      // Validate competitor URLs
      for (const cu of competitorUrls) {
        try { new URL(cu); } catch {
          resultsArea.style.display = 'block';
          resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ 无效竞品 URL: ${cu}</div>`;
          return;
        }
      }

      const allUrls = [url, ...competitorUrls];
      const totalSteps = allUrls.length * 2 + 1; // fetch + parse each + analyze
      let step = 0;

      clearFetchCache();
      progressArea.classList.add('active');
      resultsArea.style.display = 'none';

      const updateProgress = (label) => {
        step++;
        progressFill.style.width = `${Math.round((step / totalSteps) * 100)}%`;
        progressLabel.textContent = label;
      };

      try {
        // Fetch and parse all pages
        const pageDataMap = new Map();

        for (const u of allUrls) {
          updateProgress(`抓取: ${new URL(u).hostname}...`);
          const resources = await fetchSiteResources(u);

          if (!resources.html?.ok) {
            throw new Error(`抓取失败: ${u}`);
          }

          updateProgress(`解析: ${new URL(u).hostname}...`);
          let pageData = parseHtml(u, resources.html.text);
          pageData = enrichPageData(pageData, resources);
          pageDataMap.set(u, pageData);
        }

        // Run unified analysis
        updateProgress('综合分析中...');
        const myPageData = pageDataMap.get(url);
        const competitorPageDatas = competitorUrls.map(u => pageDataMap.get(u)).filter(Boolean);

        const result = runUnifiedAnalysis(myPageData, {
          keyword,
          competitorPageDatas,
          competitorUrls,
        });

        progressArea.classList.remove('active');
        resultsArea.style.display = 'block';
        resultsArea.innerHTML = renderUnifiedResults(result);
        
        // Initialize dynamic interactions (LLM modals, strategy expansion)
        initUnifiedResults(resultsArea);

        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

      } catch (err) {
        resultsArea.style.display = 'block';
        resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ ${err.message || String(err)}</div>`;
      } finally {
        progressArea.classList.remove('active');
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = '🚀 开始分析';
      }
    });

    // --- Site / Architecture Analysis Handlers ---
    async function executeSiteAnalysis(sourceType, rootUrlOrFile) {
      clearFetchCache();
      progressArea.classList.add('active');
      resultsArea.style.display = 'none';
      resultsArea.innerHTML = '';
      
      try {
        let nodes, edges, insights;

        if (sourceType === 'spider') {
          btnSpider.disabled = true;
          const u = new URL(rootUrlOrFile); // validate
          const result = await crawlLightweightSite(u.href, 1, 40, (msg) => {
            progressFill.style.width = '100%'; 
            progressLabel.textContent = msg;
          });
          nodes = result.nodes;
          edges = result.edges;
          insights = result.stats;
        } else if (sourceType === 'csv') {
          progressFill.style.width = '100%';
          progressLabel.textContent = '解析 CSV 数据...';
          const result = await parseScreamingFrogCSV(rootUrlOrFile);
          nodes = result.nodes;
          edges = result.edges;
          insights = result.insights;
        }

        progressLabel.textContent = '运算宏观规则...';
        const actions = analyzeSiteData(nodes, edges, insights);

        progressArea.classList.remove('active');
        resultsArea.style.display = 'block';
        
        // Render empty container skeleton
        const graphContainerId = 'sr-network-graph';
        resultsArea.innerHTML = renderSiteResults(graphContainerId);

        // Fill Data
        resultsArea.querySelector('#sr-nodes-count').textContent = nodes.length;
        resultsArea.querySelector('#sr-broken-count').textContent = insights.brokenCount || 0;
        resultsArea.querySelector('#sr-orphan-count').textContent = insights.orphanCount || 0;

        // Render Graph & Actions
        renderSiteActions(actions);
        drawNetworkGraph(graphContainerId, nodes, edges);

        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        progressArea.classList.remove('active');
        resultsArea.style.display = 'block';
        resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ 操作失败: ${err.message || String(err)}</div>`;
      } finally {
        if (btnSpider) btnSpider.disabled = false;
      }
    }

    // Spider Mode Trigger
    btnSpider.addEventListener('click', () => {
      const url = inputSiteUrl.value.trim();
      if (!url) return inputSiteUrl.focus();
      try {
        new URL(url);
        executeSiteAnalysis('spider', url);
      } catch {
        alert('请输入有效的根 URL');
      }
    });

    // CSV Mode Trigger
    btnTriggerFile.addEventListener('click', () => inputCsv.click());
    inputCsv.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      csvFilename.textContent = file.name;
      executeSiteAnalysis('csv', file);
    });


    return () => {};
  }

  return { html, mount };
}
