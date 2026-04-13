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
        
        <div class="gap-2 mb-4 flex justify-center">
          <button id="tab-single" class="btn btn-secondary" style="border-radius:20px;padding:8px 24px;background:var(--accent-blue);color:white;border:none">📄 单页微观重写</button>
          <button id="tab-site" class="btn btn-ghost" style="border-radius:20px;padding:8px 24px;border:none">🕸️ 网站内链架构</button>
        </div>

        <!-- Form 1: Single Page -->
        <div class="glass-card" id="form-single">
          <!-- URL (Required) -->
          <div class="mb-4">
            <label class="text-xs text-accent-green mb-2 font-semibold" style="display:block">
              🔗 页面 URL <span class="text-accent-red">*</span>
            </label>
            <input type="url" id="input-url" placeholder="https://example.com/your-page" class="w-full text-base" />
          </div>

          <!-- Keyword (Optional) -->
          <div class="mb-4">
            <div class="flex justify-between mb-2" style="align-items:center">
              <label class="text-xs text-accent-blue font-semibold">
                🎯 目标关键词 <span class="text-muted font-normal">(选填 — 激活 Intent 分析)</span>
              </label>
            </div>
            <input type="text" id="input-keyword" placeholder="如: 国际汇款费用对比" class="w-full" />
          </div>

          <!-- Competitors (Optional, collapsed by default) -->
          <details id="competitor-section" class="mb-4">
            <summary class="text-xs text-accent-orange font-semibold cursor-pointer mb-2">
              ⚔️ 竞品 URL (选填 — 激活竞品对标 + 信息增益 + AI 引用排名)
            </summary>
            <!-- Presets -->
            <div class="gap-2 mt-2 mb-2" style="display:flex; flex-wrap:wrap">
              <span class="text-[11px] text-muted" style="align-self:center">快速预设：</span>
              <button class="btn btn-ghost preset-btn text-[11px]" data-preset="remittance" style="padding:3px 10px">🌏 国际汇款</button>
              <button class="btn btn-ghost preset-btn text-[11px]" data-preset="stock" style="padding:3px 10px">📈 美港股券商</button>
              <button class="btn btn-ghost preset-btn text-[11px]" data-preset="crypto" style="padding:3px 10px">₿ 加密交易所</button>
            </div>
            <div class="grid gap-3 mt-2" style="grid-template-columns:repeat(3,1fr)" class="competitor-inputs">
              <input type="url" id="input-comp-1" placeholder="竞品 URL 1" class="w-full" />
              <input type="url" id="input-comp-2" placeholder="竞品 URL 2 (可选)" class="w-full" />
              <input type="url" id="input-comp-3" placeholder="竞品 URL 3 (可选)" class="w-full" />
            </div>
            <!-- Compare Mode Toggle -->
            <div class="mt-3 flex items-center" style="padding:var(--space-3); background:rgba(77,159,255,0.06); border:1px solid rgba(77,159,255,0.15); border-radius:8px; justify-content:space-between">
              <div>
                <div class="text-xs font-semibold text-accent-blue">⚔️ 并排对比模式</div>
                <div class="text-[11px] text-muted" style="margin-top:2px">开启后输出并排对比矩阵，关闭则输出标准单页诊断</div>
              </div>
              <label class="cursor-pointer shrink-0" style="position:relative; display:inline-block; width:44px; height:24px">
                <input type="checkbox" id="toggle-compare" style="opacity:0;width:0;height:0" />
                <span id="toggle-compare-track" style="position:absolute;inset:0;background:rgba(255,255,255,0.1);border-radius:12px;transition:background 0.3s"></span>
                <span id="toggle-compare-thumb" style="position:absolute;left:3px;top:3px;width:18px;height:18px;background:white;border-radius:50%;transition:left 0.3s"></span>
              </label>
            </div>
          </details>

          <!-- Submit -->
          <div class="text-center mb-4">
            <button class="btn btn-primary btn-lg" id="btn-analyze" style="min-width:240px">
              🚀 开始分析
            </button>
          </div>

          <!-- LLM Config Bar (persistent) -->
          <details id="llm-config-bar" style="border-top:1px solid var(--border-default);padding-top:var(--space-3)">
            <summary class="cursor-pointer flex items-center gap-2" style="list-style:none; user-select:none">
              <span class="text-[11px] text-muted">⚙️ AI 设置</span>
              <span id="llm-status-badge" class="text-[10px] text-muted" style="padding:1px 7px; border-radius:10px; background:rgba(255,255,255,0.07)">检查中...</span>
              <span class="text-[10px] text-muted" style="margin-left:auto">(点展开配置)</span>
            </summary>

            <!-- Provider quick presets -->
            <div class="mt-3 mb-2">
              <div class="text-muted mb-2" style="font-size:9px; text-transform:uppercase; letter-spacing:0.5px">一键选择服务商（浏览器可直调）</div>
              <div class="gap-2" style="display:flex; flex-wrap:wrap" id="llm-provider-presets">
                <button class="llm-preset-btn text-[11px] text-accent-blue cursor-pointer" data-baseurl="https://api.deepseek.com/v1" data-model="deepseek-chat"
                  style="padding:3px 12px; background:rgba(77,159,255,0.1); border:1px solid rgba(77,159,255,0.2); border-radius:4px">
                  🔵 DeepSeek <span style="font-size:9px;opacity:0.6">推荐</span>
                </button>
                <button class="llm-preset-btn text-[11px] text-primary cursor-pointer" data-baseurl="https://api.moonshot.cn/v1" data-model="moonshot-v1-8k"
                  style="padding:3px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:4px">
                  🌙 Kimi
                </button>
                <button class="llm-preset-btn text-[11px] text-primary cursor-pointer" data-baseurl="https://dashscope.aliyuncs.com/compatible-mode/v1" data-model="qwen-plus"
                  style="padding:3px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:4px">
                  ☁️ 阿里百炼
                </button>
                <button class="llm-preset-btn text-[11px] text-primary cursor-pointer" data-baseurl="https://generativelanguage.googleapis.com/v1beta/openai" data-model="gemini-2.0-flash"
                  style="padding:3px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:4px">
                  💎 Gemini
                </button>
                <button class="llm-preset-btn text-[11px] text-muted cursor-pointer" data-baseurl="https://api.openai.com/v1" data-model="gpt-4o-mini"
                  style="padding:3px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px">
                  🤖 OpenAI <span style="font-size:9px;opacity:0.5">需代理</span>
                </button>
              </div>
            </div>

            <div class="grid gap-2" style="grid-template-columns:3fr 1fr; align-items:end">
              <div>
                <div class="text-[10px] text-muted" style="margin-bottom:4px">API Base URL</div>
                <input type="text" id="llm-base-url"
                  class="w-full text-xs" style="padding:6px 8px"
                  placeholder="https://api.deepseek.com/v1" />
              </div>
              <div>
                <div class="text-[10px] text-muted" style="margin-bottom:4px">Model</div>
                <input type="text" id="llm-model"
                  class="w-full text-xs" style="padding:6px 8px"
                  placeholder="deepseek-chat" />
              </div>
            </div>
            <div class="mt-2 flex items-center" style="justify-content:space-between">
              <span class="text-[10px] text-muted">API 鉴权现已由服务端统一安全接管（读取云端服务器中的专属配置），前端无需再填写 Key。</span>
              <button id="llm-save-home" class="btn btn-secondary text-[11px] shrink-0" style="padding:4px 14px">保存</button>
            </div>
          </details>
        </div>

        <!-- Form 2: Site Architecture -->
        <div class="glass-card" id="form-site" style="display:none">
          <h3 class="text-lg" style="margin-top:0">🕸️ 全站 / 版块拓扑扫描</h3>
          <p class="text-xs text-muted mb-4">输入根目录让轻量化蜘蛛爬取上下级结构，或导入大型网站的 Screaming Frog CSV。</p>
          
          <div class="mb-4">
            <label class="text-xs text-accent-green mb-2 font-semibold" style="display:block">
              🔗 版块 Root URL (前端轻量蛛蛛)
            </label>
            <div class="gap-2" style="display:flex">
              <input type="url" id="input-site-url" placeholder="https://example.com/blog/" style="flex:1" />
              <button id="btn-spider" class="btn btn-primary shrink-0">🕸️ 织网爬取</button>
            </div>
            <div class="text-[11px] text-muted" style="margin-top:4px">安全限制：单次并发上限 40 页面（防由于跨域及内存导致崩溃）</div>
          </div>
          
          <div class="text-center text-muted text-[11px]" style="margin:var(--space-4) 0">— 或者 —</div>
          
          <div class="mb-2 text-center" style="padding:var(--space-4); border:1px dashed var(--border-default); border-radius:8px">
            <div class="text-lg mb-2">📊</div>
            <div class="text-[13px] mb-3">上传 Screaming Frog 导出的 Internal HTML CSV / XLSX</div>
            <input type="file" id="input-csv" accept=".csv,.xlsx,.xls" style="display:none" />
            <button id="btn-trigger-file" class="btn btn-secondary">选择 CSV / XLSX 文件</button>
            <div id="csv-filename" class="text-[11px] text-accent-blue" style="margin-top:8px"></div>
            <div id="csv-preview" class="text-[11px] text-muted" style="margin-top:4px"></div>
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

      saveLlmConfig({ baseUrl, apiKey: '', model });
      updateLlmBadge({ baseUrl, model });
      
      if (llmSaveBtn) {
        llmSaveBtn.textContent = '✅ 已保存';
        setTimeout(() => { llmSaveBtn.textContent = '保存'; }, 1800);
      }
      if (llmConfigBar) llmConfigBar.open = false;
    }

    if (llmSaveBtn)     llmSaveBtn.addEventListener('click', saveLlmFromBar);
    // Also save on Enter in any LLM field
    [llmBaseUrlInput, llmModelInput].forEach(el => {
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
        llmModelInput?.focus();
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
        resultsArea.innerHTML = `<div class="glass-card text-accent-red">❌ 无效 URL: ${esc(url)}</div>`;
        return;
      }

      const keyword = kwInput.value.trim() || null;
      const competitorUrls = [comp1.value.trim(), comp2.value.trim(), comp3.value.trim()].filter(Boolean);

      // Validate competitor URLs
      for (const cu of competitorUrls) {
        try { new URL(cu); } catch {
          resultsArea.style.display = 'block';
          resultsArea.innerHTML = `<div class="glass-card text-accent-red">❌ 无效竞品 URL: ${esc(cu)}</div>`;
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
        resultsArea.innerHTML = `<div class="glass-card text-accent-red">❌ ${esc(err.message || String(err))}</div>`;
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
        resultsArea.innerHTML = `<div class="glass-card text-accent-red">❌ 操作失败: ${esc(err.message || String(err))}</div>`;
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
