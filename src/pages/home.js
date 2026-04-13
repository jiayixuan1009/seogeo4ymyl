// ===== SEOGEO4YMYL — Home Page (Unified) =====
// Single input: URL (required) + Keyword (optional) + Competitors (optional)

import { store } from '../core/store.js';
import { fetchSiteResources, clearFetchCache } from '../core/fetcher.js';
import { parseHtml, enrichPageData } from '../core/parser.js';
import { runUnifiedAnalysis } from '../analyzers/unified-engine.js';
import { renderUnifiedResults, initUnifiedResults } from './unified-results.js';
import { renderComparisonResults, initComparisonResults } from './comparison-results.js';
import { crawlLightweightSite } from '../core/spider.js';
import { parseScreamingFrogCSV } from '../core/csv-parser.js';
import { analyzeSiteData } from '../core/engine/site-rule-engine.js';
import { renderSiteResults, drawNetworkGraph, renderSiteActions, fillSiteKpis } from './site-results.js';
import { getLlmConfig, saveLlmConfig, DEFAULT_CONFIG } from '../core/engine/llm-orchestrator.js';
import { esc } from '../utils/html-escape.js';

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
            <!-- Presets -->
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap">
              <span style="font-size:11px;color:var(--text-muted);align-self:center">快速预设：</span>
              <button class="btn btn-ghost preset-btn" data-preset="remittance" style="font-size:11px;padding:3px 10px">🌏 国际汇款</button>
              <button class="btn btn-ghost preset-btn" data-preset="stock" style="font-size:11px;padding:3px 10px">📈 美港股券商</button>
              <button class="btn btn-ghost preset-btn" data-preset="crypto" style="font-size:11px;padding:3px 10px">₿ 加密交易所</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-top:var(--space-2)" class="competitor-inputs">
              <input type="url" id="input-comp-1" placeholder="竞品 URL 1" style="width:100%" />
              <input type="url" id="input-comp-2" placeholder="竞品 URL 2 (可选)" style="width:100%" />
              <input type="url" id="input-comp-3" placeholder="竞品 URL 3 (可选)" style="width:100%" />
            </div>
            <!-- Compare Mode Toggle -->
            <div style="margin-top:var(--space-3);padding:var(--space-3);background:rgba(77,159,255,0.06);border:1px solid rgba(77,159,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:var(--font-size-xs);font-weight:600;color:var(--accent-blue)">⚔️ 并排对比模式</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">开启后输出并排对比矩阵，关闭则输出标准单页诊断</div>
              </div>
              <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;flex-shrink:0">
                <input type="checkbox" id="toggle-compare" style="opacity:0;width:0;height:0" />
                <span id="toggle-compare-track" style="position:absolute;inset:0;background:rgba(255,255,255,0.1);border-radius:12px;transition:background 0.3s"></span>
                <span id="toggle-compare-thumb" style="position:absolute;left:3px;top:3px;width:18px;height:18px;background:white;border-radius:50%;transition:left 0.3s"></span>
              </label>
            </div>
          </details>

          <!-- Submit -->
          <div style="text-align:center;margin-bottom:var(--space-4)">
            <button class="btn btn-primary btn-lg" id="btn-analyze" style="min-width:240px">
              🚀 开始分析
            </button>
          </div>

          <!-- LLM Config Bar (persistent) -->
          <details id="llm-config-bar" style="border-top:1px solid var(--border-default);padding-top:var(--space-3)">
            <summary style="cursor:pointer;display:flex;align-items:center;gap:var(--space-2);list-style:none;user-select:none">
              <span style="font-size:11px;color:var(--text-muted)">⚙️ AI 设置</span>
              <span id="llm-status-badge" style="font-size:10px;padding:1px 7px;border-radius:10px;background:rgba(255,255,255,0.07);color:var(--text-muted)">检查中...</span>
              <span style="margin-left:auto;font-size:10px;color:var(--text-muted)">(点展开配置)</span>
            </summary>

            <!-- Provider quick presets -->
            <div style="margin-top:var(--space-3);margin-bottom:var(--space-2)">
              <div style="font-size:9px;color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.5px">一键选择服务商（浏览器可直调）</div>
              <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)" id="llm-provider-presets">
                <button class="llm-preset-btn" data-baseurl="https://api.deepseek.com/v1" data-model="deepseek-chat"
                  style="font-size:11px;padding:3px 12px;background:rgba(77,159,255,0.1);border:1px solid rgba(77,159,255,0.2);border-radius:4px;color:var(--accent-blue);cursor:pointer">
                  🔵 DeepSeek <span style="font-size:9px;opacity:0.6">推荐</span>
                </button>
                <button class="llm-preset-btn" data-baseurl="https://api.moonshot.cn/v1" data-model="moonshot-v1-8k"
                  style="font-size:11px;padding:3px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:var(--text-primary);cursor:pointer">
                  🌙 Kimi
                </button>
                <button class="llm-preset-btn" data-baseurl="https://dashscope.aliyuncs.com/compatible-mode/v1" data-model="qwen-plus"
                  style="font-size:11px;padding:3px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:var(--text-primary);cursor:pointer">
                  ☁️ 阿里百炼
                </button>
                <button class="llm-preset-btn" data-baseurl="https://generativelanguage.googleapis.com/v1beta/openai" data-model="gemini-2.0-flash"
                  style="font-size:11px;padding:3px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:var(--text-primary);cursor:pointer">
                  💎 Gemini
                </button>
                <button class="llm-preset-btn" data-baseurl="https://api.openai.com/v1" data-model="gpt-4o-mini"
                  style="font-size:11px;padding:3px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:var(--text-muted);cursor:pointer">
                  🤖 OpenAI <span style="font-size:9px;opacity:0.5">需代理</span>
                </button>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:3fr 1fr;gap:var(--space-2);align-items:end">
              <div>
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">API Base URL</div>
                <input type="text" id="llm-base-url"
                  style="width:100%;font-size:12px;padding:6px 8px"
                  placeholder="https://api.deepseek.com/v1" />
              </div>
              <div>
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Model</div>
                <input type="text" id="llm-model"
                  style="width:100%;font-size:12px;padding:6px 8px"
                  placeholder="deepseek-chat" />
              </div>
            </div>
            <div style="margin-top:var(--space-2);display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:10px;color:var(--text-muted)">API 鉴权现已由服务端统一安全接管（读取云端服务器中的专属配置），前端无需再填写 Key。</span>
              <button id="llm-save-home" class="btn btn-secondary" style="font-size:11px;padding:4px 14px;flex-shrink:0">保存</button>
            </div>
          </details>
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
            <div style="font-size:13px;margin-bottom:var(--space-3)">上传 Screaming Frog 导出的 Internal HTML CSV / XLSX</div>
            <input type="file" id="input-csv" accept=".csv,.xlsx,.xls" style="display:none" />
            <button id="btn-trigger-file" class="btn btn-secondary">选择 CSV / XLSX 文件</button>
            <div id="csv-filename" style="font-size:11px;margin-top:8px;color:var(--accent-blue)"></div>
            <div id="csv-preview" style="font-size:11px;margin-top:4px;color:var(--text-muted)"></div>
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
    const csvPreview = root.querySelector('#csv-preview');

    // ── LLM Config Bar (persistent) ───────────────────────────────────────────
    const llmBaseUrlInput = root.querySelector('#llm-base-url');
    const llmApiKeyInput  = root.querySelector('#llm-api-key');
    const llmModelInput   = root.querySelector('#llm-model');
    const llmSaveBtn      = root.querySelector('#llm-save-home');
    const llmStatusBadge  = root.querySelector('#llm-status-badge');
    const llmConfigBar    = root.querySelector('#llm-config-bar');

    function updateLlmBadge(cfg) {
      if (!llmStatusBadge) return;
      const modelShort = (cfg.model || 'gpt-4o-mini').replace('gpt-', '').slice(0, 12);
      llmStatusBadge.textContent = `✅ Server-auth (${modelShort})`;
      llmStatusBadge.style.background = 'rgba(34,197,94,0.15)';
      llmStatusBadge.style.color = 'var(--accent-green)';
      if (llmConfigBar) llmConfigBar.open = false; // By default close it
    }

    // Read saved config and populate fields
    const savedCfg = getLlmConfig();
    if (llmBaseUrlInput)  llmBaseUrlInput.value  = savedCfg.baseUrl || DEFAULT_CONFIG.baseUrl;
    if (llmModelInput)    llmModelInput.value    = savedCfg.model   || DEFAULT_CONFIG.model;
    updateLlmBadge(savedCfg);

    function saveLlmFromBar() {
      const baseUrl = llmBaseUrlInput.value.trim() || DEFAULT_CONFIG.baseUrl;
      const model   = llmModelInput.value.trim()   || DEFAULT_CONFIG.model;

      localStorage.setItem('seotool_llm_config', JSON.stringify({ baseUrl, model }));
      updateLlmBadge({ baseUrl, model });
      
      if (llmSaveBtn) {
        llmSaveBtn.textContent = '✅ 已保存';
        setTimeout(() => { llmSaveBtn.textContent = '保存'; }, 1800);
      }
      if (llmConfigBar) llmConfigBar.open = false;
    }

    if (llmSaveBtn)     llmSaveBtn.addEventListener('click', saveLlmFromBar);
    // Also save on Enter in any LLM field
    [llmBaseUrlInput, llmApiKeyInput, llmModelInput].forEach(el => {
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') saveLlmFromBar(); });
    });

    // Provider preset buttons — fill Base URL + Model on click
    root.querySelectorAll('.llm-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url   = btn.dataset.baseurl;
        const model = btn.dataset.model;
        if (llmBaseUrlInput && url)   llmBaseUrlInput.value = url;
        if (llmModelInput   && model) llmModelInput.value   = model;
        // Highlight active preset
        root.querySelectorAll('.llm-preset-btn').forEach(b => b.style.outline = 'none');
        btn.style.outline = '2px solid var(--accent-blue)';
        // Focus API key field so user pastes their key
        llmApiKeyInput?.focus();
      });
    });

    // Compare Mode Toggle
    const toggleCompare = root.querySelector('#toggle-compare');
    const toggleTrack   = root.querySelector('#toggle-compare-track');
    const toggleThumb   = root.querySelector('#toggle-compare-thumb');
    let compareMode = false;

    if (toggleCompare) {
      toggleCompare.addEventListener('change', () => {
        compareMode = toggleCompare.checked;
        if (toggleTrack) toggleTrack.style.background = compareMode ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)';
        if (toggleThumb) toggleThumb.style.left = compareMode ? '23px' : '3px';
        if (btnAnalyze) btnAnalyze.textContent = compareMode ? '⚔️ 开始并排对比' : '🚀 开始分析';
      });
    }

    // Competitor Presets
    const PRESETS = {
      // 国际汇款：WISE + PandaRemit（用户指定）
      remittance: ['https://wise.com', 'https://www.pandaremit.com', ''],
      // 美港股券商：富途 + 盈透
      stock:      ['https://www.futunn.com', 'https://www.interactivebrokers.com.hk', ''],
      // 加密交易所：OKX + 币安 + 抹茶 MEXC
      crypto:     ['https://www.okx.com', 'https://www.binance.com', 'https://www.mexc.com'],
    };
    root.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const urls = PRESETS[btn.dataset.preset] || [];
        const inputs = [comp1, comp2, comp3];
        urls.forEach((u, i) => { if (inputs[i]) inputs[i].value = u; });
        // Auto-open competitor section
        const sec = root.querySelector('#competitor-section');
        if (sec) sec.open = true;
      });
    });

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
        resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ 无效 URL: ${esc(url)}</div>`;
        return;
      }

      const keyword = kwInput.value.trim() || null;
      const competitorUrls = [comp1.value.trim(), comp2.value.trim(), comp3.value.trim()].filter(Boolean);

      // Validate competitor URLs
      for (const cu of competitorUrls) {
        try { new URL(cu); } catch {
          resultsArea.style.display = 'block';
          resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ 无效竞品 URL: ${esc(cu)}</div>`;
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

        progressArea.classList.remove('active');
        resultsArea.style.display = 'block';

        if (compareMode && competitorUrls.length > 0) {
          // ── Compare mode: side-by-side matrix ──
          updateProgress('生成并排对比矩阵...');
          const myPageData = pageDataMap.get(url);
          const competitorPageDatas = competitorUrls.map(u => pageDataMap.get(u)).filter(Boolean);
          resultsArea.innerHTML = renderComparisonResults(url, myPageData, competitorUrls, competitorPageDatas, keyword);
          initComparisonResults(resultsArea);
        } else {
          // ── Standard unified analysis ──
          updateProgress('综合分析中...');
          const myPageData = pageDataMap.get(url);
          const competitorPageDatas = competitorUrls.map(u => pageDataMap.get(u)).filter(Boolean);
          const result = runUnifiedAnalysis(myPageData, { keyword, competitorPageDatas, competitorUrls });
          resultsArea.innerHTML = renderUnifiedResults(result);
          initUnifiedResults(resultsArea);
        }

        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

      } catch (err) {
        resultsArea.style.display = 'block';
        resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ ${esc(err.message || String(err))}</div>`;
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
          progressFill.style.width = '60%';
          progressLabel.textContent = '解析文件数据...';
          const result = await parseScreamingFrogCSV(rootUrlOrFile);
          nodes = result.nodes;
          edges = result.edges;
          insights = result.insights;
          progressFill.style.width = '80%';
          progressLabel.textContent = '运算 SEO 规则...';
        }

        progressLabel.textContent = '运算宏观规则...';
        const actions = analyzeSiteData(nodes, edges, insights);

        progressArea.classList.remove('active');
        resultsArea.style.display = 'block';
        
        // Render skeleton
        const graphContainerId = 'sr-network-graph';
        resultsArea.innerHTML = renderSiteResults(graphContainerId);

        // Fill KPI row (pass nodes for fallback totalParsed)
        fillSiteKpis(nodes, insights);

        // Update file preview with result summary
        if (csvPreview && sourceType === 'csv') {
          const total   = insights.totalParsed ?? nodes.length;
          const issues  = (insights.brokenCount ?? 0) + (insights.orphanCount ?? 0) +
                          (insights.missingTitle ?? 0) + (insights.missingH1 ?? 0);
          csvPreview.textContent = `✅ 已解析 ${total} 个页面 · 发现 ${issues} 个主要问题`;
        }

        // Render Graph & Actions
        renderSiteActions(actions);
        drawNetworkGraph(graphContainerId, nodes, edges);

        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        progressArea.classList.remove('active');
        resultsArea.style.display = 'block';
        resultsArea.innerHTML = `<div class="glass-card" style="color:var(--accent-red)">❌ 操作失败: ${esc(err.message || String(err))}</div>`;
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

    // CSV / XLSX Mode Trigger
    btnTriggerFile.addEventListener('click', () => inputCsv.click());
    inputCsv.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      csvFilename.textContent = `📄 ${file.name}`;
      if (csvPreview) csvPreview.textContent = `文件大小: ${(file.size / 1024).toFixed(1)} KB · 正在解析...`;
      executeSiteAnalysis('csv', file);
    });


    return () => {};
  }

  return { html, mount };
}
