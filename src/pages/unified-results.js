// ===== SEOGEO4YMYL — Unified Results Page =====
// 4-Layer output: Summary → Decision → Insights → Actions

import { DIMENSION_MAP, VERDICTS } from '../analyzers/unified-engine.js';
import { EXEC_PRIORITY_META, getCategoryLabel, MAX_VISIBLE_STRATEGIES } from '../utils/strategy-templates.js';
import { getLlmConfig, saveLlmConfig, streamContent, isLlmConfigured } from '../core/engine/llm-orchestrator.js';
import { esc } from '../utils/html-escape.js';

/**
 * Render the unified results page
 */
export function renderUnifiedResults(result) {
  const { summary, decision, insights, actions, meta } = result;

  return `
    <div class="container" style="padding-top:var(--space-4);padding-bottom:var(--space-10)">
      <div class="flex justify-end mb-3">
        <button id="open-llm-settings" class="btn btn-ghost text-[10px] text-muted"
          style="background:transparent; padding:3px 8px; opacity:0.6"
          title="AI 功能需在首页配置 LLM 设置">⚙️ LLM 设置</button>
      </div>
      ${renderSummaryLayer(summary, meta)}
      ${renderDecisionCard(decision)}
      ${renderInsightsLayer(insights, meta)}
      ${renderActionsLayer(actions)}
      ${renderPageRewriteStudio(result)}
      ${renderLlmModal()}
    </div>
  `;
}

// ============================================================
// Layer 1: SUMMARY
// ============================================================

function renderSummaryLayer(summary, meta) {
  const metricsHtml = summary.metrics.map(m => `
    <div class="text-center">
      <div class="text-xs text-muted" style="margin-bottom:4px">${esc(m.label)}</div>
      <div class="text-lg font-extrabold" style="color:${m.color}">${esc(m.value)}</div>
    </div>
  `).join('');

  const dimBars = ['structure', 'content', 'trust'].map(dimId => {
    const dim = DIMENSION_MAP[dimId];
    const score = summary.dimensionScores[dimId] || 0;
    const level = score >= 70 ? '高' : score >= 40 ? '中' : '低';
    const levelColor = score >= 70 ? 'var(--accent-green)' : score >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)';
    return `
      <div class="flex items-center gap-3 mb-2">
        <span class="text-xs text-muted shrink-0" style="width:70px">${dim.icon} ${esc(dim.label)}</span>
        <div style="flex:1;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${score}%;background:${levelColor};border-radius:3px;transition:width 1s ease"></div>
        </div>
        <span class="text-sm font-bold text-right" style="color:${levelColor}; width:24px">${level}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="glass-card animate-fade-in mb-4" style="border-color:${summary.ratingColor}33">
      <div class="flex justify-between mb-4 gap-4" style="align-items:flex-start; flex-wrap:wrap">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div style="font-size:var(--font-size-4xl);font-weight:900;color:${summary.ratingColor}">${summary.overallScore}</div>
            <div>
              <div class="text-lg font-bold">${summary.ratingEmoji} ${esc(summary.rating)}</div>
              <div class="text-xs" style="color:${summary.readinessLabel.color}">${esc(summary.readinessLabel.label)}</div>
            </div>
          </div>
          <div class="text-xs text-muted">
            ${esc(safeHost(meta.url))}${meta.keyword ? ` · ${esc(meta.keyword)}` : ''}${meta.hasCompetitors ? ` · ${meta.competitorUrls.length} 竞品` : ''}
          </div>
        </div>
        ${summary.metrics.length > 0 ? `<div class="gap-5" style="display:flex; flex-wrap:wrap">${metricsHtml}</div>` : ''}
      </div>
      <div>${dimBars}</div>
    </div>
  `;
}

// ============================================================
// Decision Card
// ============================================================

function renderDecisionCard(decision) {
  if (!decision) return '';
  const v = decision.verdict;
  const conf = Math.round(decision.confidence * 100);

  const reasonsHtml = decision.reasons.map(r =>
    `<div class="gap-2" style="display:flex; padding:2px 0"><span>•</span><span class="text-xs">${esc(r)}</span></div>`
  ).join('');

  const actionsHtml = decision.nextActions.map((a, i) =>
    `<div class="gap-2" style="display:flex; padding:3px 0"><span class="text-xs font-bold text-muted" style="width:16px">${i + 1}.</span><span class="text-sm">${esc(a)}</span></div>`
  ).join('');

  const signals = decision.allSignals;
  const signalBadges = signals ? [
    signals.overallLevel && `综合:${lv(signals.overallLevel)}`,
    signals.structureLevel && `结构:${lv(signals.structureLevel)}`,
    signals.contentLevel && `内容:${lv(signals.contentLevel)}`,
    signals.trustLevel && `信任:${lv(signals.trustLevel)}`,
    signals.matchLevel && `匹配:${lv(signals.matchLevel)}`,
    signals.citationLevel && `引用:${lv(signals.citationLevel)}`,
    signals.igLevel && `增益:${lv(signals.igLevel)}`,
  ].filter(Boolean).map(s =>
    `<span class="text-[10px] text-muted" style="background:rgba(255,255,255,0.05); padding:1px 5px; border-radius:3px">${esc(s)}</span>`
  ).join(' ') : '';

  return `
    <div class="glass-card animate-slide-up mb-5" style="border-left:4px solid ${v.color}">
      <div class="flex justify-between mb-3" style="align-items:flex-start">
        <div>
          <div class="text-xs text-muted mb-1">决策引擎判定</div>
          <div class="font-extrabold" style="font-size:var(--font-size-xl); color:${v.color}">${v.emoji} ${esc(v.label)}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-muted">置信度</div>
          <div class="text-lg font-extrabold" style="color:${conf >= 70 ? 'var(--accent-green)' : 'var(--accent-gold)'}">${conf}%</div>
        </div>
      </div>
      <div class="text-sm text-secondary mb-3">${esc(v.template)}</div>
      <div class="grid gap-4" style="grid-template-columns:1fr 1fr">
        <div style="background:rgba(0,0,0,0.12);padding:var(--space-3);border-radius:8px">
          <div class="text-xs text-muted font-semibold mb-2">判定依据</div>
          ${reasonsHtml}
        </div>
        <div style="background:rgba(0,0,0,0.12);padding:var(--space-3);border-radius:8px">
          <div class="text-xs text-accent-green font-semibold mb-2">下一步行动</div>
          ${actionsHtml}
        </div>
      </div>
      ${signalBadges ? `<div class="mt-3" style="display:flex; gap:4px; flex-wrap:wrap"><span class="text-[10px] text-muted">信号:</span>${signalBadges}</div>` : ''}
    </div>
  `;
}

function lv(level) {
  if (level === 'high') return '高';
  if (level === 'mid') return '中';
  return '低';
}

// ============================================================
// Layer 2: INSIGHTS
// ============================================================

function renderInsightsLayer(insights, meta) {
  const cards = [];
  for (const [dimId, dim] of Object.entries(insights)) {
    if (dimId === 'competitive') { cards.push(renderCompetitiveCard(dim)); continue; }
    cards.push(renderDimensionCard(dimId, dim));
  }
  return `
    <div class="mb-6">
      <h2 class="text-lg font-bold mb-4">📊 诊断详情</h2>
      <div class="grid gap-4">${cards.join('')}</div>
    </div>
  `;
}

function renderDimensionCard(dimId, dim) {
  const score = dim.score;
  const level = score >= 70 ? '高' : score >= 40 ? '中' : '低';
  const clr = score >= 70 ? 'var(--accent-green)' : score >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)';

  const issuesHtml = dim.issues.slice(0, 5).map(item => `
    <div class="gap-2" style="display:flex; padding:var(--space-2) 0; border-bottom:1px solid rgba(255,255,255,0.04)">
      <span class="shrink-0">${item.impact === 'Critical' ? '🔴' : '🟡'}</span>
      <div style="flex:1">
        <div class="text-sm">${esc(item.finding)}</div>
        ${item.fix ? `<div class="text-xs text-accent-blue" style="margin-top:2px">💡 ${esc(item.fix)}</div>` : ''}
      </div>
    </div>
  `).join('');

  const more = dim.issues.length > 5 ? `
    <details class="mt-3 cursor-pointer">
      <summary class="text-xs text-muted hover:text-white" style="padding:var(--space-2) 0">点击查看还有 ${dim.issues.length - 5} 项此维度的优化项</summary>
      <div style="padding-top:var(--space-2)">
        ${dim.issues.slice(5).map(item => `
          <div class="gap-2" style="display:flex; padding:var(--space-2) 0; border-bottom:1px solid rgba(255,255,255,0.04)">
            <span class="shrink-0">${item.impact === 'Critical' ? '🔴' : '🟡'}</span>
            <div style="flex:1">
              <div class="text-sm">${esc(item.finding)}</div>
              ${item.fix ? `<div class="text-xs text-accent-blue" style="margin-top:2px">💡 ${esc(item.fix)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </details>
  ` : '';

  let queryExtra = '';
  if (dim.queryAnalysis) {
    const intent = dim.queryAnalysis.panels?.intent;
    const verdict = dim.queryAnalysis.panels?.verdict;
    if (intent && verdict) {
      const ml = verdict.matchScore >= 70 ? '高' : verdict.matchScore >= 40 ? '中' : '低';
      const mc = verdict.matchScore >= 70 ? 'var(--accent-green)' : verdict.matchScore >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)';
      queryExtra = `
        <div class="mt-3" style="background:rgba(77,159,255,0.05); padding:var(--space-3); border-radius:8px; border:1px solid rgba(77,159,255,0.15)">
          <div class="text-xs font-semibold text-accent-blue mb-2">🎯 关键词匹配</div>
          <div class="gap-4" style="display:flex; flex-wrap:wrap">
            <span class="text-sm">Intent: <strong>${esc(intent.label)}</strong></span>
            <span class="text-sm">匹配度: <strong style="color:${mc}">${ml}</strong></span>
            <span class="text-sm">判定: <strong>${esc(verdict.title)}</strong></span>
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="glass-card">
      <div class="flex justify-between mb-3" style="align-items:center">
        <div class="flex items-center gap-2">
          <span style="font-size:var(--font-size-xl)">${dim.icon}</span>
          <h3 class="text-base font-bold m-0">${esc(dim.label)}</h3>
        </div>
        <div class="flex items-center gap-3">
          ${dim.issueCount > 0 ? `<span class="badge text-accent-red" style="background:var(--accent-red)22">${dim.issueCount} 问题</span>` : ''}
          ${dim.passCount > 0 ? `<span class="badge text-accent-green" style="background:var(--accent-green)22">${dim.passCount} 通过</span>` : ''}
          <span class="text-lg font-extrabold" style="color:${clr}">${level}</span>
        </div>
      </div>
      ${dim.issueCount > 0 ? `<div style="background:rgba(0,0,0,0.15);padding:var(--space-3);border-radius:8px">${issuesHtml}${more}</div>` : `<div class="text-center text-accent-green text-sm" style="padding:var(--space-3)">✅ 全部通过</div>`}
      ${queryExtra}
      ${dim.passCount > 0 && dim.issueCount > 0 ? `<details class="mt-3 cursor-pointer"><summary class="text-xs text-muted">查看 ${dim.passCount} 项通过项</summary><div class="text-xs text-muted" style="padding:var(--space-2) 0">${dim.passes.map(p => `<div style="padding:2px 0">✅ ${esc(p.finding)}</div>`).join('')}</div></details>` : ''}
    </div>
  `;
}

function renderCompetitiveCard(dim) {
  const data = dim.competitiveData;
  if (!data) return '';
  const cs = data.panels.citationSimulation;
  const ig = data.panels.informationGain;
  const gaps = data.panels.gaps || [];

  const rankingHtml = cs ? cs.ranking.map((r, i) => {
    const bc = r.probability >= 50 ? 'var(--accent-green)' : r.probability >= 25 ? 'var(--accent-gold)' : 'var(--accent-red)';
    return `<div class="flex items-center gap-2" style="padding:4px 0"><span class="text-xs font-bold" style="width:20px; color:${i === 0 ? 'var(--accent-green)' : 'var(--text-muted)'}">#${i+1}</span><div class="text-xs" style="flex:1; font-weight:${r.isMe?'700':'400'}; color:${r.isMe?'var(--accent-green)':'var(--text-primary)'}">${r.isMe?'🏠 ':''}${esc(safeHost(r.url))}</div><div style="width:60px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden"><div style="height:100%;width:${r.probability}%;background:${bc};border-radius:2px"></div></div><span class="text-xs font-bold text-right" style="color:${bc}; width:32px">${r.probability}%</span></div>`;
  }).join('') : '';

  return `
    <div class="glass-card" style="border-color:rgba(255,159,67,0.2)">
      <div class="flex justify-between mb-3" style="align-items:center">
        <div class="flex items-center gap-2"><span style="font-size:var(--font-size-xl)">⚔️</span><h3 class="text-base font-bold m-0">竞品对标</h3></div>
        ${gaps.length > 0 ? `<span class="badge text-accent-red" style="background:var(--accent-red)22">${gaps.length} 差距</span>` : ''}
      </div>
      <div class="grid gap-4" style="grid-template-columns:1fr 1fr">
        ${cs ? `<div style="background:rgba(0,0,0,0.15);padding:var(--space-3);border-radius:8px"><div class="text-xs text-muted mb-2">AI 引用概率排名</div>${rankingHtml}</div>` : ''}
        ${ig ? `<div style="background:rgba(0,0,0,0.15);padding:var(--space-3);border-radius:8px"><div class="text-xs text-muted mb-2">信息增益</div><div class="text-base font-bold mb-2" style="color:${ig.igColor}">${esc(ig.igLabel)}</div><div class="text-xs text-muted">原创: ${ig.hasOriginalContent?'✅':'❌'} · 可引用: ${ig.hasCitableValue?'✅':'❌'}</div></div>` : ''}
      </div>
      ${gaps.length > 0 ? `<details class="mt-3 cursor-pointer"><summary class="text-xs text-accent-orange font-semibold">查看 ${gaps.length} 个差距</summary><div class="mt-2" style="background:rgba(0,0,0,0.1); padding:var(--space-2); border-radius:6px">${gaps.map(g => `<div class="text-xs" style="padding:2px 0">${g.severity==='critical'?'🔴':g.severity==='warning'?'🟡':'🔵'} ${esc(g.label)}</div>`).join('')}</div></details>` : ''}
    </div>
  `;
}

// ============================================================
// Layer 3: ACTIONS
// ============================================================

function renderActionsLayer(actions) {
  const { strategies, top5, counts, total } = actions;
  if (total === 0) {
    return `<div class="glass-card text-center" style="border-color:var(--accent-green); padding:var(--space-8)"><div class="mb-3" style="font-size:var(--font-size-4xl)">🎉</div><h2 class="text-lg font-bold text-accent-green">无需优化操作</h2></div>`;
  }

  const top5Html = top5.map(item => {
    const m = EXEC_PRIORITY_META[item.execPriority] || EXEC_PRIORITY_META.P2;
    return `<div class="gap-3" style="display:flex; padding:var(--space-2) 0; border-bottom:1px solid rgba(255,255,255,0.05)"><span class="text-base font-extrabold text-muted" style="width:20px">${item.rank}</span><div style="flex:1"><div class="flex items-center gap-2" style="margin-bottom:2px"><span class="badge text-[10px]" style="background:${m.color}22; color:${m.color}; padding:1px 6px">${item.execPriority}</span><span class="text-sm font-semibold">${esc(item.title)}</span></div>${item.importance ? `<div class="text-xs text-muted">${esc(item.importance)}</div>` : ''}</div></div>`;
  }).join('');

  const top5Copy = top5.map(i => `${i.rank}. [${i.execPriority}] ${i.title}`).join('\n');

  const cardsHtml = strategies.map((s, i) => {
    const hidden = i >= MAX_VISIBLE_STRATEGIES;
    const ep = s.execPriority || s.priority?.execPriority || 'P2';
    const epm = EXEC_PRIORITY_META[ep] || EXEC_PRIORITY_META.P2;
    const bc = ep === 'P0' ? 'var(--accent-red)' : ep === 'P1' ? 'var(--accent-orange)' : 'var(--accent-gold)';
    return `
      <div class="glass-card strategy-card mb-3" style="border-left:3px solid ${bc}; ${hidden?'display:none':''}" ${hidden?'data-hidden-strategy':''}>
        <div class="flex justify-between mb-2" style="align-items:flex-start">
          <div class="gap-2" style="display:flex; flex-wrap:wrap">
            <span class="badge" style="background:${epm.color}22;color:${epm.color}">${epm.label}</span>
            ${s.category ? `<span class="badge badge-info">${getCategoryLabel(s.category).icon} ${esc(getCategoryLabel(s.category).label)}</span>` : ''}
          </div>
          <div style="display:flex;gap:4px">
            ${s.aiPrompt ? `
              <button class="btn btn-secondary llm-gen-btn text-xs" data-prompt="${esc(s.aiPrompt)}" data-id="llm-out-${i}" style="padding:2px 8px; background:var(--accent-blue); color:white; border:none">✨ AI 自动生成</button>
              <button class="btn btn-ghost text-xs" onclick="navigator.clipboard.writeText(this.dataset.text);this.textContent='已复制!';setTimeout(()=>this.textContent='📋 Prompt',2000)" data-text="${esc(s.aiPrompt)}">📋 Prompt</button>
            ` : ''}
            <button class="btn btn-ghost text-xs" onclick="navigator.clipboard.writeText(this.dataset.text);this.textContent='已复制!';setTimeout(()=>this.textContent='📋 动作',2000)" data-text="${esc(s.action || s.title)}">📋 动作</button>
          </div>
        </div>
        ${s.aiPrompt ? `<div id="llm-out-${i}" class="llm-output-container mb-2 text-[13px] text-primary" style="display:none; padding:var(--space-3); background:rgba(0,0,0,0.3); border:1px solid rgba(77,159,255,0.2); border-radius:6px; line-height:1.6; white-space:pre-wrap; box-shadow:inset 0 2px 10px rgba(0,0,0,0.2)"></div>` : ''}
        <h4 class="text-sm font-bold mb-2">${esc(s.title)}</h4>
        ${s.importance && s.riskOfNotDoing && s.benefitOfDoing ? `<div class="grid gap-2 mb-2" style="grid-template-columns:repeat(3,1fr)"><div style="background:rgba(0,0,0,0.12);padding:6px;border-radius:4px"><div class="text-muted" style="font-size:9px">为什么重要</div><div class="text-xs text-secondary">${esc(s.importance)}</div></div><div style="background:rgba(255,77,106,0.04);padding:6px;border-radius:4px"><div class="text-accent-red" style="font-size:9px">不做的风险</div><div class="text-xs text-secondary">${esc(s.riskOfNotDoing)}</div></div><div style="background:rgba(0,255,136,0.04);padding:6px;border-radius:4px"><div class="text-accent-green" style="font-size:9px">做了的收益</div><div class="text-xs text-secondary">${esc(s.benefitOfDoing)}</div></div></div>` : ''}
        ${s.action && s.action !== s.title ? `<div class="text-xs text-primary mb-2" style="white-space:pre-line">${esc(s.action)}</div>` : ''}
        ${s.codeTemplate ? `<details class="cursor-pointer"><summary class="text-xs text-accent-blue">📝 代码模板</summary><div class="mt-1" style="background:#1a1c23; border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:var(--space-2)"><pre class="m-0 text-xs" style="overflow-x:auto; color:#a5d6ff"><code>${esc(s.codeTemplate)}</code></pre></div></details>` : ''}
      </div>
    `;
  }).join('');

  const hasMore = strategies.length > MAX_VISIBLE_STRATEGIES;

  return `
    <div>
      <div class="glass-card animate-slide-up mb-5" style="border-color:var(--accent-green)33">
        <div class="flex justify-between mb-3" style="align-items:center">
          <div><h2 class="text-lg font-bold m-0">👉 Top 5 必做事项</h2><div class="text-xs text-muted">已做取舍，只保留最关键的</div></div>
          <div class="gap-2" style="display:flex">
            ${counts.p0 > 0 ? `<span class="badge text-accent-red" style="background:var(--accent-red)22">P0 ×${counts.p0}</span>` : ''}
            ${counts.p1 > 0 ? `<span class="badge text-accent-orange" style="background:var(--accent-orange)22">P1 ×${counts.p1}</span>` : ''}
            ${counts.p2 > 0 ? `<span class="badge" style="background:var(--accent-gold)22;color:var(--accent-gold)">P2 ×${counts.p2}</span>` : ''}
          </div>
        </div>
        <div class="mb-3" style="background:rgba(0,0,0,0.15); padding:var(--space-3); border-radius:8px">${top5Html}</div>
        <button class="btn btn-ghost text-xs w-full" onclick="navigator.clipboard.writeText(this.dataset.text);this.textContent='已复制! ✅';setTimeout(()=>this.textContent='📋 复制 Top 5 清单',2000)" data-text="${esc(top5Copy)}">📋 复制 Top 5 清单</button>
      </div>
      <div class="flex justify-between mb-4" style="align-items:center">
        <div class="flex items-center gap-2">
          <h3 class="text-base font-bold m-0">全部优化操作</h3>
          <span class="badge badge-info">${total} 条</span>
        </div>
      </div>
      ${cardsHtml}
      ${hasMore ? `<div class="text-center mt-3"><button class="btn btn-secondary" id="expand-all-strategies">📂 查看全部 ${total} 条 (已显示 ${MAX_VISIBLE_STRATEGIES} 条)</button></div>` : ''}
    </div>
  `;
}

// ============================================================
function safeHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function renderLlmModal() {
  const config = getLlmConfig();
  return `
    <div id="llm-config-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;align-items:center;justify-content:center;">
      <div class="glass-card" style="width:400px;background:#1a1c23;border-color:var(--accent-blue);box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <h3 class="mb-3 text-primary flex items-center" style="margin-top:0; justify-content:space-between">
          <span>⚙️ LLM 设置</span>
        </h3>
        <p class="text-xs text-muted mb-4" style="line-height:1.4">
          配置兼容 OpenAI 格式的大模型 API，以启用页面自动生成功能。您的密钥安全保存在本地。
        </p>
        
        <div class="mb-3">
          <label class="text-xs text-secondary" style="display:block; margin-bottom:4px">Base URL <span class="text-accent-red">*</span></label>
          <input type="text" id="llm-base-url" value="${esc(config.baseUrl)}" placeholder="https://api.openai.com/v1" class="w-full text-primary" style="box-sizing:border-box; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); padding:8px 12px; border-radius:4px; font-size:14px" />
        </div>
        
        <div class="mb-3">
          <label class="text-xs text-secondary" style="display:block; margin-bottom:4px">API Key <span class="text-accent-red">*</span></label>
          <input type="password" id="llm-api-key" value="${esc(config.apiKey)}" placeholder="sk-..." class="w-full text-primary" style="box-sizing:border-box; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); padding:8px 12px; border-radius:4px; font-size:14px" />
        </div>
        
        <div class="mb-4">
          <label class="text-xs text-secondary" style="display:block; margin-bottom:4px">模型名称 (Model) <span class="text-accent-red">*</span></label>
          <input type="text" id="llm-model" value="${esc(config.model)}" placeholder="gpt-4o-mini" class="w-full text-primary" style="box-sizing:border-box; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); padding:8px 12px; border-radius:4px; font-size:14px" />
        </div>
        
        <div class="flex justify-end gap-2">
          <button id="llm-cancel-btn" class="btn btn-ghost">取消</button>
          <button id="llm-save-btn" class="btn" style="background:var(--accent-blue);color:#fff;border:none;">保存配置</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize interactions natively on the output container after rendering.
 * Should be called by the outer script that binds the HTML into the page.
 */
export function initUnifiedResults(container) {
  // Strategy Expand 
  const expandBtn = container.querySelector('#expand-all-strategies');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      const hidden = container.querySelectorAll('[data-hidden-strategy]');
      hidden.forEach(el => {
        el.style.display = 'block';
        el.removeAttribute('data-hidden-strategy');
      });
      expandBtn.style.display = 'none';
    });
  }

  // LLM Modal bindings
  const modal = container.querySelector('#llm-config-modal');
  const openModalBtn = container.querySelector('#open-llm-settings');
  const cancelBtn = container.querySelector('#llm-cancel-btn');
  const saveBtn = container.querySelector('#llm-save-btn');
  
  if (openModalBtn && modal) {
    openModalBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const baseUrl = container.querySelector('#llm-base-url').value.trim();
      const apiKey = container.querySelector('#llm-api-key').value.trim();
      const model = container.querySelector('#llm-model').value.trim();
      
      saveLlmConfig({ baseUrl, apiKey, model });
      modal.style.display = 'none';
      alert('✅ LLM 配置已保存！现在可以点击【✨ AI 自动生成】了。');
    });
  }

  // Bind Generate Buttons
  const genBtns = container.querySelectorAll('.llm-gen-btn');
  genBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const promptText = e.target.getAttribute('data-prompt');
      const outId = e.target.getAttribute('data-id');
      const outContainer = container.querySelector(`#${outId}`);
      
      if (!outContainer) return;
      
      outContainer.style.display = 'block';
      outContainer.innerHTML = '<span class="text-muted">正在呼叫 AI 加载配置，准备开始生成... ⏳</span>';
      e.target.disabled = true;
      const originalText = e.target.textContent;
      e.target.textContent = '生成中... 🌊';
      
      try {
        let isFirstToken = true;
        await streamContent(promptText, (chunk) => {
          if (isFirstToken) {
            outContainer.innerHTML = '';
            isFirstToken = false;
          }
          outContainer.innerHTML += formatChunkToHtml(chunk);
          // auto scroll if possible
          outContainer.scrollTop = outContainer.scrollHeight;
        });
        e.target.textContent = '✅ 生成完成';
      } catch (err) {
        let errMsg = err.message || String(err);
        outContainer.innerHTML = `<span class="text-accent-red">⚠️ 生成出错: ${esc(errMsg)}</span>`;
        e.target.textContent = '🔁 重试生成';
        e.target.disabled = false;
        
        // If error looks like unconfigured API key, open modal
        if (errMsg.includes('未配置 API Key')) {
          if (modal) modal.style.display = 'flex';
        }
      }
    });
  });

  // Init Rewrite Studio
  initPageRewriteStudio(container);
}

function formatChunkToHtml(chunk) {
  return esc(chunk);
}

// ============================================================
// REWRITE STUDIO v2 — Auto-gen + Before/After comparison
// ============================================================

function lenBadge(val, maxLen) {
  if (!val) return `<span class="text-[10px] text-accent-red" style="background:rgba(239,68,68,0.15); padding:1px 7px; border-radius:10px">缺失</span>`;
  const len = val.length;
  const ok  = len <= maxLen && len >= Math.round(maxLen * 0.45);
  const clr = ok ? 'var(--accent-green)' : len > maxLen ? 'var(--accent-red)' : 'var(--accent-gold)';
  const icon = ok ? '✅' : len > maxLen ? '超长' : '偏短';
  return `<span class="text-[10px]" style="background:${clr}22; color:${clr}; padding:1px 7px; border-radius:10px">${len}字符 ${icon}</span>`;
}

// Short field (Title / Meta Desc / H1): side-by-side columns
function rwCompareShort(id, icon, label, currentVal, maxLen, promptAttr) {
  const escapedCurrent = currentVal ? esc(currentVal) : '';
  return `
    <div class="rw-field-block mb-4" data-rw-id="${id}">
      <div class="text-[11px] font-bold text-secondary mb-2 flex items-center" style="gap:6px">
        <span>${icon}</span><span>${label}</span>
      </div>
      <div class="grid gap-2" style="grid-template-columns:1fr 1fr">
        <!-- Original -->
        <div>
          <div class="text-muted flex items-center" style="font-size:9px; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.6px; gap:6px">
            当前版本 ${lenBadge(currentVal, maxLen)}
          </div>
          <div class="text-xs text-muted" style="padding:9px 11px; min-height:46px; background:rgba(0,0,0,0.18); border:1px solid rgba(255,255,255,0.07); border-radius:5px; line-height:1.5; word-break:break-word">
            ${escapedCurrent || '<span style="font-style:italic;opacity:0.4">（缺失）</span>'}
          </div>
        </div>
        <!-- AI Optimized -->
        <div>
          <div class="text-accent-green flex items-center" style="font-size:9px; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.6px; justify-content:space-between">
            <span>AI 优化版 <span id="${id}-ai-badge"></span></span>
            <button class="rw-regen-btn text-muted cursor-pointer" data-target="${id}-ta" data-prompt="${promptAttr}"
              style="font-size:9px; padding:1px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:3px">
              🔁 重新生成
            </button>
          </div>
          <textarea id="${id}-ta" rows="2"
            style="width:100%;box-sizing:border-box;background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2);color:var(--text-primary); padding:9px 11px;border-radius:5px;font-size:12px;line-height:1.5;"
            placeholder="暂无 AI 输出..."
            data-rw-sync="true" data-rw-id="${id}"
          >${escapedCurrent}</textarea>
        </div>
      </div>
    </div>`;
}

// Long field (Intro / FAQ): stacked rows
function rwCompareLong(id, icon, label, promptAttr, rows = 5, previewMaxLen = 180) {
  return `
    <div class="rw-field-block mb-4" data-rw-id="${id}">
      <div class="text-[11px] font-bold text-secondary mb-2 flex items-center" style="gap:6px">
        <span>${icon}</span><span>${label}</span>
        <button class="rw-regen-btn" data-target="${id}-ta" data-prompt="${promptAttr}"
          style="margin-left:auto;font-size:9px;padding:1px 8px;background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.12);border-radius:3px;color:var(--text-muted);cursor:pointer">
          🔁 重新生成
        </button>
      </div>
      <!-- AI output (main) -->
      <div class="text-accent-green" style="font-size:9px; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.6px">AI 生成版 <span id="${id}-ai-badge"></span></div>
      <textarea id="${id}-ta" rows="${rows}"
        style="width:100%;box-sizing:border-box;background:rgba(34,197,94,0.05);
          border:1px solid rgba(34,197,94,0.2);color:var(--text-primary);
          padding:9px 11px;border-radius:5px;font-size:12px;line-height:1.6;
          resize:vertical;font-family:inherit;margin-bottom:var(--space-2)"
        placeholder="暂无 AI 输出..."
        data-rw-sync data-rw-id="${id}"
      ></textarea>
    </div>`;
}

function buildHeadCode(title, desc, url, schemas) {
  const schemaTypes = [...new Set((schemas || []).map(s => s['@type']).filter(Boolean))];
  const schemaNote  = schemas && schemas.length > 0
    ? `<!-- 已有 Schema: ${schemaTypes.join(', ')} -->`
    : `<!-- 尚未配置 Schema：在左侧「🗂️ Schema」字段生成并复制到此处 -->`;
  return `<!-- ===== <head> 优化代码 ===== -->

<title>${title || '[Title 生成中...]'}</title>

<meta name="description"
  content="${desc || '[Meta Description 生成中...]'}" />

<link rel="canonical" href="${url}" />

<!-- Open Graph -->
<meta property="og:title"       content="${title || ''}" />
<meta property="og:description" content="${desc  || ''}" />
<meta property="og:type"        content="website" />
<meta property="og:url"         content="${url}" />
<meta property="og:image"       content="[封面图 URL, 1200×630px]" />

<!-- Twitter Card -->
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:title"       content="${title || ''}" />
<meta name="twitter:description" content="${desc  || ''}" />

${schemaNote}`;
}

function buildBodyCode(h1, intro, faq, schema, schemas) {
  const schemaBlock = schema
    ? schema
    : schemas && schemas.length > 0
      ? `<!-- 当前页面已有 Schema，如需优化请重新生成 -->`
      : `<!-- Schema 尚未生成，点击左侧「🗂️ Schema」字段的「🔁 重新生成」 -->`;

  const faqHtml = faq
    ? faq.split(/\n/).map(line => {
        line = line.trim();
        if (!line) return '';
        if (line.match(/^Q[：:]/)) return `  <details>\n    <summary>${esc(line.replace(/^Q[：:]\s*/,''))}</summary>`;
        if (line.match(/^A[：:]/)) return `    <p>${esc(line.replace(/^A[：:]\s*/,''))}</p>\n  </details>`;
        return '';
      }).filter(Boolean).join('\n')
    : '  <!-- FAQ 生成中... -->';

  return `<!-- ===== <body> 内容结构 ===== -->

<h1>${h1 || '[H1 生成中...]'}</h1>

<p class="intro">
  ${intro ? intro.slice(0, 300) + (intro.length > 300 ? '...' : '') : '[引言生成中...]'}
</p>

<!-- 主体内容（建议 3-5 个 H2 区块） -->
<section>
  <h2>[核心价值第一点]</h2>
  <p>[内容...]</p>
</section>

<section>
  <h2>[核心价值第二点]</h2>
  <p>[内容...]</p>
</section>

<!-- FAQ -->
<section class="faq" id="faq">
  <h2>常见问题</h2>
${faqHtml}
</section>

<!-- Schema 结构化数据 -->
${schemaBlock}`;
}

function renderPageRewriteStudio(result) {
  const pd      = result.raw?.pageData || {};
  const meta    = result.meta || {};
  const url     = meta.url || '';
  const keyword = meta.keyword || '';

  const curTitle  = pd.meta?.title        || '';
  const curDesc   = pd.meta?.description  || '';
  const curH1     = (pd.headings?.h1 || [])[0] || '';
  const schemas   = pd.schemas || [];
  const titleLen  = pd.meta?.titleLength  || curTitle.length;
  const descLen   = pd.meta?.descriptionLength || curDesc.length;

  // ── Smart Prompts for Content Overhaul ────────────────────────────────────
  const mkTitle = () =>
    `你是顶级 Fintech SEO 内容专家。为以下页面生成高点击率的 Title 标签（50-60字符，含关键词，吸引点击，符合YMYL信任感），直接在一行内输出结果，不要解释。如果评估后认为当前标题已完全符合要求无需修改，请严格仅输出"{无需修改}"五字。\nURL: ${url}\n当前标题: "${curTitle}"\n关键词: ${keyword || '(根据URL推断)'}`;

  const mkDesc = () =>
    `你是顶级 Fintech SEO 内容专家。为以下页面生成高转化 Meta Description（130-150字符，概括核心价值并带CTA）。直接输出结果，不要解释。如果当前描述已极具吸引力无需优化，请严格仅输出"{无需修改}"五字。\nURL: ${url}\n当前描述: "${curDesc}"\n关键词: ${keyword || '(根据URL推断)'}`;

  const mkH1 = () =>
    `你是顶级 Fintech SEO 内容专家。为以下页面生成核心 H1 标题（直接输出一句话标题，不要解释）。如果当前 H1 已完美紧扣主题无需修改，请严格仅输出"{无需修改}"五字。\nURL: ${url}\n当前H1: "${curH1}"\n关键词: ${keyword || '(根据URL推断)'}`;

  const mkIntro = () =>
    `你是顶级 Fintech 内容专家。为以下页面生成首屏引言段落，不包含任何标题和说明文字。\nURL: ${url}\n关键词: ${keyword || '(根据URL推断)'}\nH1: "${curH1 || curTitle}"\n要求: 100-160词，首句含核心关键词，阐述用户痛点，引导继续阅读。直接输出段落正文。`;

  const mkFaq = () =>
    `你是顶级 Fintech SEO 内容专家。为以下页面生成5个高质量 FAQ，直接输出，不含说明文字。\nURL: ${url}\n主题: "${curH1 || curTitle}"\n关键词: ${keyword || '(根据URL推断)'}\n格式（严格遵守，每条都是这格式）:\nQ: [问题]\nA: [60-120词的直接回答]\n（重复5次）`;

  const mkSchema = () =>
    `你是结构化数据专家。为以下 Fintech 页面生成 JSON-LD Schema 代码。\nURL: ${url}\n标题: "${curTitle || curH1 || 'Fintech Service'}"\n关键词: ${keyword || '跨境支付/国际汇款'}\n
要求（严格遵守，以通过 Google Rich Results 测试）：
1. 输出单个 <script type="application/ld+json"> 包含一个 JSON 数组（4个对象）。
2. 对象1: "Organization" (必须包含 name, url, logo 等必填属性)。
3. 对象2: "FAQPage" (必须包含 mainEntity 数组，内含3个带 acceptedAnswer 的 Question)。
4. 对象3: "FinancialProduct" (必须包含 name, description, brand, image，以及能通过测试的 aggregateRating)。
5. 对象4: "Person" (必须包含 name, jobTitle, url，且必须包含 knowsAbout 数组填入金融专长，用于强化 E-E-A-T)。
6. 严格输出合法 JSON-LD 代码块，不能有任何多余的 markdown 或文字。`;

  const mkAll = () =>
    `你是顶级 SEO 和内容专家。对以下页面全面优化，严格按指定格式输出，不含其他文字。\nURL: ${url}\n关键词: ${keyword || '(根据URL推断)'}\n当前Title: "${curTitle || '(缺失)'}"\n当前H1: "${curH1 || '(缺失)'}"\n\n=== TITLE ===\n[45-60字符]\n\n=== META DESCRIPTION ===\n[120-150字符]\n\n=== H1 ===\n[20-50字符]\n\n=== 引言段落 ===\n[100-160词的引言正文]\n\n=== FAQ（5条）===\nQ: ...\nA: ...\n（重复5次）`;

  return `
    <div style="margin-top:var(--space-8)" id="rw-studio-root">

      <!-- Studio Header -->
      <div class="flex justify-between mb-4 gap-3" style="align-items:flex-start; flex-wrap:wrap">
        <div>
          <h2 class="m-0 text-lg font-extrabold">📝 页面重写工作台</h2>
          <div class="flex items-center gap-3" style="margin-top:4px; flex-wrap:wrap">
            <div id="rw-progress-bar" class="gap-2" style="display:none; align-items:center">
              <div style="width:120px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden">
                <div id="rw-progress-fill" style="height:100%;width:0%;background:var(--accent-green);border-radius:2px;transition:width 0.4s ease"></div>
              </div>
              <span id="rw-progress-label" class="text-[11px] text-muted">准备中...</span>
            </div>
            <span id="rw-done-msg" class="text-[11px] text-accent-green" style="display:none">✅ 全部生成完成，右侧代码已同步</span>
          </div>
        </div>
        <div class="gap-2" style="display:flex">
          <button id="rw-ai-all-btn" class="btn text-xs"
            style="background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; padding:8px 16px"
            data-prompt="${esc(mkAll())}">
            🔁 重新全页优化
          </button>
        </div>
      </div>

      <!-- Two-column layout -->
      <div id="rw-layout-grid" class="grid gap-4" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr); align-items:start; transition:all 0.3s">

        <!-- ── LEFT: Before / After Fields ── -->
        <div>

          <!-- HEAD 标签 -->
          <div class="glass-card mb-4">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
              color:var(--text-muted);margin-bottom:var(--space-3);padding-bottom:var(--space-2);
              border-bottom:1px solid var(--border-default)">🔖 HEAD 标签</div>
            ${rwCompareShort('rw-title', '🏷️', 'Title 标签',      curTitle, 60,  esc(mkTitle()))}
            ${rwCompareShort('rw-desc',  '📝', 'Meta Description', curDesc,  150, esc(mkDesc()))}
          </div>

          <!-- 页面结构 -->
          <div class="glass-card mb-4">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
              color:var(--text-muted);margin-bottom:var(--space-3);padding-bottom:var(--space-2);
              border-bottom:1px solid var(--border-default)">🏗️ 页面结构</div>
            ${rwCompareShort('rw-h1',    '🔥', 'H1 主标题',        curH1,    55,  esc(mkH1()))}
            ${rwCompareLong( 'rw-intro', '📄', '引言段落（首屏文字）', esc(mkIntro()), 5)}
          </div>

          <!-- 内容模块 -->
          <div class="glass-card">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
              color:var(--text-muted);margin-bottom:var(--space-3);padding-bottom:var(--space-2);
              border-bottom:1px solid var(--border-default)">📋 内容模块</div>
            ${rwCompareLong('rw-faq',    '❓', 'FAQ 5条（Q: A: 格式）',      esc(mkFaq()),    8)}
            ${rwCompareLong('rw-schema', '🗂️', 'Schema JSON-LD（手动触发）', esc(mkSchema()), 7)}
          </div>
        </div>

        <!-- ── RIGHT: Code Panel ── -->
        <div style="position:sticky;top:80px">
          <div class="glass-card" style="padding:0;overflow:hidden">

            <div style="display:flex;justify-content:space-between;align-items:center;
              padding:var(--space-3) var(--space-4);background:rgba(0,0,0,0.25);
              border-bottom:1px solid var(--border-default)">
              <div class="flex items-center gap-2">
                <span>💻</span>
                <span class="text-sm font-bold">完整 HTML 代码（实时同步）</span>
              </div>
              <button id="rw-copy-btn" class="btn btn-ghost text-[11px]" style="padding:3px 10px">📋 复制全部</button>
            </div>

            <!-- Tabs -->
            <div style="display:flex;border-bottom:1px solid var(--border-default)">
              <button class="rw-tab-btn text-[11px] text-accent-blue cursor-pointer font-semibold" data-tab="head"
                style="flex:1; padding:8px; background:rgba(77,159,255,0.1); border:none">
                &lt;head&gt; 标签
              </button>
              <button class="rw-tab-btn text-[11px] text-muted cursor-pointer" data-tab="body"
                style="flex:1; padding:8px; background:transparent; border:none">
                &lt;body&gt; 结构
              </button>
            </div>

            <div id="rw-tab-head">
              <pre style="margin:0;padding:var(--space-4);font-size:12px;line-height:1.7;color:#a5d6ff;
                font-family:'Fira Code','Consolas',monospace;white-space:pre;overflow-x:auto;
                min-height:360px;background:#0d0e12"><code id="rw-head-code">${esc(buildHeadCode(curTitle, curDesc, url, schemas))}</code></pre>
            </div>
            <div id="rw-tab-body" style="display:none">
              <pre style="margin:0;padding:var(--space-4);font-size:12px;line-height:1.7;color:#a5d6ff;
                font-family:'Fira Code','Consolas',monospace;white-space:pre;overflow-x:auto;
                min-height:360px;background:#0d0e12"><code id="rw-body-code">${esc(buildBodyCode(curH1, '', '', '', schemas))}</code></pre>
            </div>

            <!-- Stats bar -->
            <div class="text-[10px] text-muted gap-4" style="padding:var(--space-2) var(--space-4); background:rgba(0,0,0,0.15); border-top:1px solid var(--border-default); display:flex">
              <span>Title: <strong id="rw-stat-title" class="text-primary">0</strong>/60</span>
              <span>Desc: <strong id="rw-stat-desc" class="text-primary">0</strong>/150</span>
              <span>H1: <strong id="rw-stat-h1" class="text-primary">0</strong>/55</span>
              <span style="margin-left:auto">← 左侧内容实时同步</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Studio init ──────────────────────────────────────────────────────────────

function initPageRewriteStudio(container) {
  const root = container.querySelector('#rw-studio-root');
  if (!root) return;

  const fields = {};
  const defaultValues = {};

  // Seed with current page values from textareas
  ['rw-title', 'rw-desc', 'rw-h1', 'rw-intro', 'rw-faq', 'rw-schema'].forEach(id => {
    const ta = root.querySelector(`#${id}-ta`);
    const val = ta ? ta.value || '' : '';
    fields[id] = val;
    defaultValues[id] = val;
  });

  // ── Code refresh ──────────────────────────────────────────────────────────
  function refreshCode() {
    const title  = fields['rw-title'];
    const desc   = fields['rw-desc'];
    const h1     = fields['rw-h1'];
    const intro  = fields['rw-intro'];
    const faq    = fields['rw-faq'];
    const schema = fields['rw-schema'];

    // Read URL from head code canonical href
    const urlMatch = root.querySelector('#rw-head-code')?.textContent?.match(/href="([^"]+)"/);
    const url = urlMatch ? urlMatch[1] : '';

    const headEl = root.querySelector('#rw-head-code');
    const bodyEl = root.querySelector('#rw-body-code');
    if (headEl) headEl.textContent = buildHeadCode(title, desc, url, []);
    if (bodyEl) bodyEl.textContent = buildBodyCode(h1, intro, faq, schema, []);

    // Stats
    const setS = (id, val, max) => {
      const el = root.querySelector(`#${id}`);
      if (!el) return;
      el.textContent = val.length;
      el.style.color = val.length > max ? 'var(--accent-red)' : val.length > 0 ? 'var(--accent-green)' : 'inherit';
    };
    setS('rw-stat-title', title, 60);
    setS('rw-stat-desc',  desc,  150);
    setS('rw-stat-h1',    h1,    55);

    // AI badge in short fields
    const setAiBadge = (id, val, maxLen) => {
      const el = root.querySelector(`#${id}-ai-badge`);
      if (!el || !val) return;
      const ok = val.length <= maxLen && val.length >= Math.round(maxLen * 0.45);
      const clr = ok ? 'var(--accent-green)' : val.length > maxLen ? 'var(--accent-red)' : 'var(--accent-gold)';
      el.innerHTML = `<span style="font-size:9px;background:${clr}22;color:${clr};padding:1px 6px;border-radius:8px">${val.length}字符 ${ok ? '✅' : '⚠️'}</span>`;
    };
    setAiBadge('rw-title', title, 60);
    setAiBadge('rw-desc',  desc,  150);
    setAiBadge('rw-h1',    h1,    55);
  }

  // ── Textarea sync ─────────────────────────────────────────────────────────
  root.querySelectorAll('[data-rw-sync]').forEach(ta => {
    const id = ta.dataset.rwId;
    ta.addEventListener('input', () => { fields[id] = ta.value; refreshCode(); });
  });

  // ── Tab switching ─────────────────────────────────────────────────────────
  root.querySelectorAll('.rw-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.rw-tab-btn').forEach(b => {
        b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; b.style.fontWeight = '400';
      });
      btn.style.background = 'rgba(77,159,255,0.1)'; btn.style.color = 'var(--accent-blue)'; btn.style.fontWeight = '600';
      root.querySelectorAll('[id^="rw-tab-"]').forEach(el => el.style.display = 'none');
      
      const p = root.querySelector(`#rw-tab-${btn.dataset.tab}`);
      if (p) p.style.display = 'block';
    });
  });

  // ── Copy all ──────────────────────────────────────────────────────────────
  const copyBtn = root.querySelector('#rw-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const h = root.querySelector('#rw-head-code')?.textContent || '';
      const b = root.querySelector('#rw-body-code')?.textContent || '';
      navigator.clipboard.writeText(h + '\n\n\n' + b).then(() => {
        copyBtn.textContent = '✅ 已复制！';
        setTimeout(() => { copyBtn.textContent = '📋 复制全部'; }, 2000);
      });
    });
  }

  // ── Progress UI ───────────────────────────────────────────────────────────
  const progressBar   = root.querySelector('#rw-progress-bar');
  const progressFill  = root.querySelector('#rw-progress-fill');
  const progressLabel = root.querySelector('#rw-progress-label');
  const doneMsg       = root.querySelector('#rw-done-msg');
  const FIELDS_COUNT  = 5; // title, desc, h1, intro, faq

  function showProgress(label, pct) {
    if (progressBar)  { progressBar.style.display = 'flex'; }
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressLabel) progressLabel.textContent = label;
    if (doneMsg) doneMsg.style.display = 'none';
  }
  function hideProgress() {
    if (progressBar)  progressBar.style.display = 'none';
    if (doneMsg) doneMsg.style.display = 'inline';
  }

  // ── Core streaming function ───────────────────────────────────────────────
  async function streamToField(id, prompt, progressPct, progressText) {
    const ta = root.querySelector(`#${id}-ta`);
    if (!ta) return;

    showProgress(progressText, progressPct);
    ta.value = '';
    ta.style.borderColor = 'rgba(77,159,255,0.4)';
    ta.placeholder = '⏳ 生成中...';

    let buffer = '';
    try {
      await streamContent(prompt, chunk => {
        buffer += chunk;
        ta.value = buffer;
        fields[id] = buffer;
        refreshCode();
      });
      
      const cleanBuffer = buffer.trim();
      const badge = document.getElementById(`${id}-ai-badge`);
      
      if (cleanBuffer === '{无需修改}' || cleanBuffer === '"{无需修改}"') {
        buffer = defaultValues[id] || '';
        ta.value = buffer;
        fields[id] = buffer;
        refreshCode();
        ta.style.borderColor = 'rgba(255,255,255,0.1)';
        if (badge) badge.innerHTML = `<span class="text-muted" style="font-weight:normal; text-transform:none">（当前已最优，保留原版）</span>`;
      } else {
        ta.style.borderColor = 'rgba(34,197,94,0.4)';
        if (badge) badge.innerText = '';
      }
      
    } catch (err) {
      ta.value = '';
      ta.style.borderColor = 'rgba(239,68,68,0.3)';
      ta.placeholder = `[生成失败: ${err.message}]`;
      throw err;  // propagate so auto-gen can stop
    }
  }

  // ── Auto-generate all on load ─────────────────────────────────────────────
  async function autoGenerateAll() {
    if (!isLlmConfigured()) {
      if (progressLabel) progressLabel.textContent = '⚙️ 请先在首页配置 AI 设置（API Key）';
      if (progressBar) progressBar.style.display = 'flex';
      if (progressFill) progressFill.style.width = '0%';
      return;
    }

    const allBtn = root.querySelector('#rw-ai-all-btn');
    if (allBtn) { allBtn.disabled = true; allBtn.textContent = '🌊 生成中...'; }

    const tasks = [
      { id: 'rw-title',  pct: 10, label: '生成 Title...' },
      { id: 'rw-desc',   pct: 25, label: '生成 Meta Description...' },
      { id: 'rw-h1',     pct: 40, label: '生成 H1...' },
      { id: 'rw-intro',  pct: 60, label: '生成引言段落...' },
      { id: 'rw-faq',    pct: 80, label: '生成 FAQ（5条）...' },
      { id: 'rw-schema', pct: 95, label: '生成 Schema JSON-LD...' },
    ];

    try {
      for (const t of tasks) {
        const ta = root.querySelector(`#${t.id}-ta`);
        const prompt = root.querySelector(`.rw-regen-btn[data-target="${t.id}-ta"]`)?.dataset.prompt || '';
        if (prompt) {
          try {
            await streamToField(t.id, prompt, t.pct, t.label);
          } catch (err) {
            console.error(`Error generating ${t.id}:`, err);
            // If it's a missing API key or auth error, abort the entire process
            if (err.message && (err.message.includes('API Key') || err.message.includes('401') || err.message.includes('Unauthorized'))) {
              throw err;
            }
            // Otherwise (e.g. timeout, parse error), error is already shown in the textarea, just continue to next field
          }
        }
      }
      showProgress('全部生成完成', 100);
      setTimeout(hideProgress, 1200);
    } catch (err) {
      showProgress(`⚠️ 出错: ${err.message}`, 0);
      // Open LLM config if API key missing
      const modal = container.querySelector('#llm-config-modal');
      if (modal && err.message?.includes('API Key')) modal.style.display = 'flex';
    } finally {
      if (allBtn) { allBtn.disabled = false; allBtn.textContent = '🔁 重新全页优化'; }
    }
  }

  // ── Regen buttons (per-field) ─────────────────────────────────────────────
  root.querySelectorAll('.rw-regen-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target?.replace('-ta', '');
      const prompt   = btn.dataset.prompt;
      if (!targetId || !prompt) return;

      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = '生成中...';
      try {
        await streamToField(targetId, prompt, 50, `重新生成 ${targetId}...`);
        hideProgress();
      } catch (err) {
        showProgress(`⚠️ ${err.message}`, 0);
        const modal = container.querySelector('#llm-config-modal');
        if (modal && err.message?.includes('API Key')) modal.style.display = 'flex';
      } finally {
        btn.disabled = false; btn.textContent = orig;
      }
    });
  });

  // ── Global regen all ─────────────────────────────────────────────────────
  const allBtn = root.querySelector('#rw-ai-all-btn');
  if (allBtn) {
    allBtn.addEventListener('click', () => autoGenerateAll());
  }

  // ── Initial render + auto-start ───────────────────────────────────────────
  refreshCode();
  // Small delay so the page finishes painting before we start streaming
  setTimeout(() => autoGenerateAll(), 600);
}

