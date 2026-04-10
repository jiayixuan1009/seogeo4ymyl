// ===== SEOGEO4YMYL — Unified Results Page =====
// 4-Layer output: Summary → Decision → Insights → Actions

import { DIMENSION_MAP, VERDICTS } from '../analyzers/unified-engine.js';
import { EXEC_PRIORITY_META, getCategoryLabel, MAX_VISIBLE_STRATEGIES } from '../utils/strategy-templates.js';
import { getLlmConfig, saveLlmConfig, streamContent } from '../core/engine/llm-orchestrator.js';

/**
 * Render the unified results page
 */
export function renderUnifiedResults(result) {
  const { summary, decision, insights, actions, meta } = result;

  return `
    <div class="container" style="padding-top:var(--space-4);padding-bottom:var(--space-10)">
      <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-3)">
        <button id="open-llm-settings" class="btn btn-ghost" style="font-size:var(--font-size-xs);background:rgba(255,255,255,0.05)">⚙️ LLM 设置</button>
      </div>
      ${renderSummaryLayer(summary, meta)}
      ${renderDecisionCard(decision)}
      ${renderInsightsLayer(insights, meta)}
      ${renderActionsLayer(actions)}
      ${renderLlmModal()}
    </div>
  `;
}

// ============================================================
// Layer 1: SUMMARY
// ============================================================

function renderSummaryLayer(summary, meta) {
  const metricsHtml = summary.metrics.map(m => `
    <div style="text-align:center">
      <div style="font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:4px">${m.label}</div>
      <div style="font-size:var(--font-size-lg);font-weight:800;color:${m.color}">${m.value}</div>
    </div>
  `).join('');

  const dimBars = ['structure', 'content', 'trust'].map(dimId => {
    const dim = DIMENSION_MAP[dimId];
    const score = summary.dimensionScores[dimId] || 0;
    const level = score >= 70 ? '高' : score >= 40 ? '中' : '低';
    const levelColor = score >= 70 ? 'var(--accent-green)' : score >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)';
    return `
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
        <span style="font-size:var(--font-size-xs);color:var(--text-muted);width:70px;flex-shrink:0">${dim.icon} ${dim.label}</span>
        <div style="flex:1;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${score}%;background:${levelColor};border-radius:3px;transition:width 1s ease"></div>
        </div>
        <span style="font-size:var(--font-size-sm);font-weight:700;color:${levelColor};width:24px;text-align:right">${level}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="glass-card animate-fade-in" style="margin-bottom:var(--space-4);border-color:${summary.ratingColor}33">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-4)">
        <div>
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
            <div style="font-size:var(--font-size-4xl);font-weight:900;color:${summary.ratingColor}">${summary.overallScore}</div>
            <div>
              <div style="font-size:var(--font-size-lg);font-weight:700">${summary.ratingEmoji} ${summary.rating}</div>
              <div style="font-size:var(--font-size-xs);color:${summary.readinessLabel.color}">${summary.readinessLabel.label}</div>
            </div>
          </div>
          <div style="font-size:var(--font-size-xs);color:var(--text-muted)">
            ${safeHost(meta.url)}${meta.keyword ? ` · ${meta.keyword}` : ''}${meta.hasCompetitors ? ` · ${meta.competitorUrls.length} 竞品` : ''}
          </div>
        </div>
        ${summary.metrics.length > 0 ? `<div style="display:flex;gap:var(--space-5);flex-wrap:wrap">${metricsHtml}</div>` : ''}
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
    `<div style="display:flex;gap:var(--space-2);padding:2px 0"><span>•</span><span style="font-size:var(--font-size-xs)">${r}</span></div>`
  ).join('');

  const actionsHtml = decision.nextActions.map((a, i) =>
    `<div style="display:flex;gap:var(--space-2);padding:3px 0"><span style="font-size:var(--font-size-xs);font-weight:700;color:var(--text-muted);width:16px">${i + 1}.</span><span style="font-size:var(--font-size-sm)">${a}</span></div>`
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
    `<span style="font-size:10px;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px">${s}</span>`
  ).join(' ') : '';

  return `
    <div class="glass-card animate-slide-up" style="margin-bottom:var(--space-5);border-left:4px solid ${v.color}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-3)">
        <div>
          <div style="font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:var(--space-1)">决策引擎判定</div>
          <div style="font-size:var(--font-size-xl);font-weight:800;color:${v.color}">${v.emoji} ${v.label}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:var(--font-size-xs);color:var(--text-muted)">置信度</div>
          <div style="font-size:var(--font-size-lg);font-weight:800;color:${conf >= 70 ? 'var(--accent-green)' : 'var(--accent-gold)'}">${conf}%</div>
        </div>
      </div>
      <div style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--space-3)">${v.template}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
        <div style="background:rgba(0,0,0,0.12);padding:var(--space-3);border-radius:8px">
          <div style="font-size:var(--font-size-xs);color:var(--text-muted);font-weight:600;margin-bottom:var(--space-2)">判定依据</div>
          ${reasonsHtml}
        </div>
        <div style="background:rgba(0,0,0,0.12);padding:var(--space-3);border-radius:8px">
          <div style="font-size:var(--font-size-xs);color:var(--accent-green);font-weight:600;margin-bottom:var(--space-2)">下一步行动</div>
          ${actionsHtml}
        </div>
      </div>
      ${signalBadges ? `<div style="margin-top:var(--space-3);display:flex;gap:4px;flex-wrap:wrap"><span style="font-size:10px;color:var(--text-muted)">信号:</span>${signalBadges}</div>` : ''}
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
    <div style="margin-bottom:var(--space-6)">
      <h2 style="font-size:var(--font-size-lg);font-weight:700;margin-bottom:var(--space-4)">📊 诊断详情</h2>
      <div style="display:grid;gap:var(--space-4)">${cards.join('')}</div>
    </div>
  `;
}

function renderDimensionCard(dimId, dim) {
  const score = dim.score;
  const level = score >= 70 ? '高' : score >= 40 ? '中' : '低';
  const clr = score >= 70 ? 'var(--accent-green)' : score >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)';

  const issuesHtml = dim.issues.slice(0, 5).map(item => `
    <div style="display:flex;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="flex-shrink:0">${item.impact === 'Critical' ? '🔴' : '🟡'}</span>
      <div style="flex:1">
        <div style="font-size:var(--font-size-sm)">${item.finding}</div>
        ${item.fix ? `<div style="font-size:var(--font-size-xs);color:var(--accent-blue);margin-top:2px">💡 ${item.fix}</div>` : ''}
      </div>
    </div>
  `).join('');

  const more = dim.issues.length > 5 ? `<div style="font-size:var(--font-size-xs);color:var(--text-muted);padding:var(--space-2) 0">还有 ${dim.issues.length - 5} 项...</div>` : '';

  let queryExtra = '';
  if (dim.queryAnalysis) {
    const intent = dim.queryAnalysis.panels?.intent;
    const verdict = dim.queryAnalysis.panels?.verdict;
    if (intent && verdict) {
      const ml = verdict.matchScore >= 70 ? '高' : verdict.matchScore >= 40 ? '中' : '低';
      const mc = verdict.matchScore >= 70 ? 'var(--accent-green)' : verdict.matchScore >= 40 ? 'var(--accent-gold)' : 'var(--accent-red)';
      queryExtra = `
        <div style="background:rgba(77,159,255,0.05);padding:var(--space-3);border-radius:8px;border:1px solid rgba(77,159,255,0.15);margin-top:var(--space-3)">
          <div style="font-size:var(--font-size-xs);font-weight:600;color:var(--accent-blue);margin-bottom:var(--space-2)">🎯 关键词匹配</div>
          <div style="display:flex;gap:var(--space-4);flex-wrap:wrap">
            <span style="font-size:var(--font-size-sm)">Intent: <strong>${intent.label}</strong></span>
            <span style="font-size:var(--font-size-sm)">匹配度: <strong style="color:${mc}">${ml}</strong></span>
            <span style="font-size:var(--font-size-sm)">判定: <strong>${verdict.title}</strong></span>
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="glass-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <span style="font-size:var(--font-size-xl)">${dim.icon}</span>
          <h3 style="font-size:var(--font-size-base);font-weight:700;margin:0">${dim.label}</h3>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-3)">
          ${dim.issueCount > 0 ? `<span class="badge" style="background:var(--accent-red)22;color:var(--accent-red)">${dim.issueCount} 问题</span>` : ''}
          ${dim.passCount > 0 ? `<span class="badge" style="background:var(--accent-green)22;color:var(--accent-green)">${dim.passCount} 通过</span>` : ''}
          <span style="font-size:var(--font-size-lg);font-weight:800;color:${clr}">${level}</span>
        </div>
      </div>
      ${dim.issueCount > 0 ? `<div style="background:rgba(0,0,0,0.15);padding:var(--space-3);border-radius:8px">${issuesHtml}${more}</div>` : `<div style="text-align:center;padding:var(--space-3);color:var(--accent-green);font-size:var(--font-size-sm)">✅ 全部通过</div>`}
      ${queryExtra}
      ${dim.passCount > 0 && dim.issueCount > 0 ? `<details style="margin-top:var(--space-3);cursor:pointer"><summary style="font-size:var(--font-size-xs);color:var(--text-muted)">查看 ${dim.passCount} 项通过项</summary><div style="padding:var(--space-2) 0;font-size:var(--font-size-xs);color:var(--text-muted)">${dim.passes.map(p => `<div style="padding:2px 0">✅ ${p.finding}</div>`).join('')}</div></details>` : ''}
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
    return `<div style="display:flex;align-items:center;gap:var(--space-2);padding:4px 0"><span style="font-size:var(--font-size-xs);font-weight:700;width:20px;color:${i === 0 ? 'var(--accent-green)' : 'var(--text-muted)'}">#${i+1}</span><div style="flex:1;font-size:var(--font-size-xs);font-weight:${r.isMe?'700':'400'};color:${r.isMe?'var(--accent-green)':'var(--text-primary)'}">${r.isMe?'🏠 ':''}${safeHost(r.url)}</div><div style="width:60px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden"><div style="height:100%;width:${r.probability}%;background:${bc};border-radius:2px"></div></div><span style="font-size:var(--font-size-xs);font-weight:700;color:${bc};width:32px;text-align:right">${r.probability}%</span></div>`;
  }).join('') : '';

  return `
    <div class="glass-card" style="border-color:rgba(255,159,67,0.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <div style="display:flex;align-items:center;gap:var(--space-2)"><span style="font-size:var(--font-size-xl)">⚔️</span><h3 style="font-size:var(--font-size-base);font-weight:700;margin:0">竞品对标</h3></div>
        ${gaps.length > 0 ? `<span class="badge" style="background:var(--accent-red)22;color:var(--accent-red)">${gaps.length} 差距</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
        ${cs ? `<div style="background:rgba(0,0,0,0.15);padding:var(--space-3);border-radius:8px"><div style="font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:var(--space-2)">AI 引用概率排名</div>${rankingHtml}</div>` : ''}
        ${ig ? `<div style="background:rgba(0,0,0,0.15);padding:var(--space-3);border-radius:8px"><div style="font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:var(--space-2)">信息增益</div><div style="font-size:var(--font-size-base);font-weight:700;color:${ig.igColor};margin-bottom:var(--space-2)">${ig.igLabel}</div><div style="font-size:var(--font-size-xs);color:var(--text-muted)">原创: ${ig.hasOriginalContent?'✅':'❌'} · 可引用: ${ig.hasCitableValue?'✅':'❌'}</div></div>` : ''}
      </div>
      ${gaps.length > 0 ? `<details style="margin-top:var(--space-3);cursor:pointer"><summary style="font-size:var(--font-size-xs);color:var(--accent-orange);font-weight:600">查看 ${gaps.length} 个差距</summary><div style="background:rgba(0,0,0,0.1);padding:var(--space-2);border-radius:6px;margin-top:var(--space-2)">${gaps.map(g => `<div style="font-size:var(--font-size-xs);padding:2px 0">${g.severity==='critical'?'🔴':g.severity==='warning'?'🟡':'🔵'} ${g.label}</div>`).join('')}</div></details>` : ''}
    </div>
  `;
}

// ============================================================
// Layer 3: ACTIONS
// ============================================================

function renderActionsLayer(actions) {
  const { strategies, top5, counts, total } = actions;
  if (total === 0) {
    return `<div class="glass-card" style="border-color:var(--accent-green);text-align:center;padding:var(--space-8)"><div style="font-size:var(--font-size-4xl);margin-bottom:var(--space-3)">🎉</div><h2 style="font-size:var(--font-size-lg);font-weight:700;color:var(--accent-green)">无需优化操作</h2></div>`;
  }

  const top5Html = top5.map(item => {
    const m = EXEC_PRIORITY_META[item.execPriority] || EXEC_PRIORITY_META.P2;
    return `<div style="display:flex;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="font-size:var(--font-size-base);font-weight:800;color:var(--text-muted);width:20px">${item.rank}</span><div style="flex:1"><div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:2px"><span class="badge" style="background:${m.color}22;color:${m.color};font-size:10px;padding:1px 6px">${item.execPriority}</span><span style="font-size:var(--font-size-sm);font-weight:600">${item.title}</span></div>${item.importance ? `<div style="font-size:var(--font-size-xs);color:var(--text-muted)">${item.importance}</div>` : ''}</div></div>`;
  }).join('');

  const top5Copy = top5.map(i => `${i.rank}. [${i.execPriority}] ${i.title}`).join('\n');

  const cardsHtml = strategies.map((s, i) => {
    const hidden = i >= MAX_VISIBLE_STRATEGIES;
    const ep = s.execPriority || s.priority?.execPriority || 'P2';
    const epm = EXEC_PRIORITY_META[ep] || EXEC_PRIORITY_META.P2;
    const bc = ep === 'P0' ? 'var(--accent-red)' : ep === 'P1' ? 'var(--accent-orange)' : 'var(--accent-gold)';
    return `
      <div class="glass-card strategy-card" style="margin-bottom:var(--space-3);border-left:3px solid ${bc};${hidden?'display:none':''}" ${hidden?'data-hidden-strategy':''}>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
            <span class="badge" style="background:${epm.color}22;color:${epm.color}">${epm.label}</span>
            ${s.category ? `<span class="badge badge-info">${getCategoryLabel(s.category).icon} ${getCategoryLabel(s.category).label}</span>` : ''}
          </div>
          <div style="display:flex;gap:4px">
            ${s.aiPrompt ? `
              <button class="btn btn-secondary llm-gen-btn" data-prompt="${s.aiPrompt.replace(/"/g,'&quot;')}" data-id="llm-out-${i}" style="font-size:var(--font-size-xs);padding:2px 8px;background:var(--accent-blue);color:white;border:none;">✨ AI 自动生成</button>
              <button class="btn btn-ghost" style="font-size:var(--font-size-xs)" onclick="navigator.clipboard.writeText(this.dataset.text);this.textContent='已复制!';setTimeout(()=>this.textContent='📋 Prompt',2000)" data-text="${s.aiPrompt.replace(/"/g,'&quot;')}">📋 Prompt</button>
            ` : ''}
            <button class="btn btn-ghost" style="font-size:var(--font-size-xs)" onclick="navigator.clipboard.writeText(this.dataset.text);this.textContent='已复制!';setTimeout(()=>this.textContent='📋 动作',2000)" data-text="${(s.action||s.title).replace(/"/g,'&quot;')}">📋 动作</button>
          </div>
        </div>
        ${s.aiPrompt ? `<div id="llm-out-${i}" class="llm-output-container" style="display:none;margin-bottom:var(--space-2);padding:var(--space-3);background:rgba(0,0,0,0.3);border:1px solid rgba(77,159,255,0.2);border-radius:6px;font-size:13px;line-height:1.6;color:var(--text-primary);white-space:pre-wrap;box-shadow:inset 0 2px 10px rgba(0,0,0,0.2);"></div>` : ''}
        <h4 style="font-size:var(--font-size-sm);font-weight:700;margin-bottom:var(--space-2)">${s.title}</h4>
        ${s.importance && s.riskOfNotDoing && s.benefitOfDoing ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);margin-bottom:var(--space-2)"><div style="background:rgba(0,0,0,0.12);padding:6px;border-radius:4px"><div style="font-size:9px;color:var(--text-muted)">为什么重要</div><div style="font-size:var(--font-size-xs);color:var(--text-secondary)">${s.importance}</div></div><div style="background:rgba(255,77,106,0.04);padding:6px;border-radius:4px"><div style="font-size:9px;color:var(--accent-red)">不做的风险</div><div style="font-size:var(--font-size-xs);color:var(--text-secondary)">${s.riskOfNotDoing}</div></div><div style="background:rgba(0,255,136,0.04);padding:6px;border-radius:4px"><div style="font-size:9px;color:var(--accent-green)">做了的收益</div><div style="font-size:var(--font-size-xs);color:var(--text-secondary)">${s.benefitOfDoing}</div></div></div>` : ''}
        ${s.action && s.action !== s.title ? `<div style="font-size:var(--font-size-xs);color:var(--text-primary);white-space:pre-line;margin-bottom:var(--space-2)">${s.action}</div>` : ''}
        ${s.codeTemplate ? `<details style="cursor:pointer"><summary style="font-size:var(--font-size-xs);color:var(--accent-blue)">📝 代码模板</summary><div style="background:#1a1c23;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:var(--space-2);margin-top:var(--space-1)"><pre style="margin:0;overflow-x:auto;font-size:var(--font-size-xs);color:#a5d6ff"><code>${s.codeTemplate.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre></div></details>` : ''}
      </div>
    `;
  }).join('');

  const hasMore = strategies.length > MAX_VISIBLE_STRATEGIES;

  return `
    <div>
      <div class="glass-card animate-slide-up" style="margin-bottom:var(--space-5);border-color:var(--accent-green)33">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
          <div><h2 style="font-size:var(--font-size-lg);font-weight:700;margin:0">👉 Top 5 必做事项</h2><div style="font-size:var(--font-size-xs);color:var(--text-muted)">已做取舍，只保留最关键的</div></div>
          <div style="display:flex;gap:var(--space-2)">
            ${counts.p0 > 0 ? `<span class="badge" style="background:var(--accent-red)22;color:var(--accent-red)">P0 ×${counts.p0}</span>` : ''}
            ${counts.p1 > 0 ? `<span class="badge" style="background:var(--accent-orange)22;color:var(--accent-orange)">P1 ×${counts.p1}</span>` : ''}
            ${counts.p2 > 0 ? `<span class="badge" style="background:var(--accent-gold)22;color:var(--accent-gold)">P2 ×${counts.p2}</span>` : ''}
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.15);padding:var(--space-3);border-radius:8px;margin-bottom:var(--space-3)">${top5Html}</div>
        <button class="btn btn-ghost" style="font-size:var(--font-size-xs);width:100%" onclick="navigator.clipboard.writeText(this.dataset.text);this.textContent='已复制! ✅';setTimeout(()=>this.textContent='📋 复制 Top 5 清单',2000)" data-text="${top5Copy.replace(/"/g,'&quot;')}">📋 复制 Top 5 清单</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <h3 style="font-size:var(--font-size-base);font-weight:700;margin:0">全部优化操作</h3>
          <span class="badge badge-info">${total} 条</span>
        </div>
      </div>
      ${cardsHtml}
      ${hasMore ? `<div style="text-align:center;margin-top:var(--space-3)"><button class="btn btn-secondary" id="expand-all-strategies">📂 查看全部 ${total} 条 (已显示 ${MAX_VISIBLE_STRATEGIES} 条)</button></div>` : ''}
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
        <h3 style="margin-top:0;margin-bottom:var(--space-3);color:var(--text-primary);display:flex;align-items:center;justify-content:space-between;">
          <span>⚙️ LLM 设置</span>
        </h3>
        <p style="font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:var(--space-4);line-height:1.4;">
          配置兼容 OpenAI 格式的大模型 API，以启用页面自动生成功能。您的密钥安全保存在本地。
        </p>
        
        <div style="margin-bottom:var(--space-3)">
          <label style="display:block;font-size:12px;margin-bottom:4px;color:var(--text-secondary);">Base URL <span style="color:var(--accent-red)">*</span></label>
          <input type="text" id="llm-base-url" value="${config.baseUrl}" placeholder="https://api.openai.com/v1" style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary);padding:8px 12px;border-radius:4px;font-size:14px;" />
        </div>
        
        <div style="margin-bottom:var(--space-3)">
          <label style="display:block;font-size:12px;margin-bottom:4px;color:var(--text-secondary);">API Key <span style="color:var(--accent-red)">*</span></label>
          <input type="password" id="llm-api-key" value="${config.apiKey}" placeholder="sk-..." style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary);padding:8px 12px;border-radius:4px;font-size:14px;" />
        </div>
        
        <div style="margin-bottom:var(--space-4)">
          <label style="display:block;font-size:12px;margin-bottom:4px;color:var(--text-secondary);">模型名称 (Model) <span style="color:var(--accent-red)">*</span></label>
          <input type="text" id="llm-model" value="${config.model}" placeholder="gpt-4o-mini" style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary);padding:8px 12px;border-radius:4px;font-size:14px;" />
        </div>
        
        <div style="display:flex;justify-content:flex-end;gap:var(--space-2);">
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
      outContainer.innerHTML = '<span style="color:var(--text-muted);">正在呼叫 AI 加载配置，准备开始生成... ⏳</span>';
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
        outContainer.innerHTML = `<span style="color:var(--accent-red)">⚠️ 生成出错: ${errMsg}</span>`;
        e.target.textContent = '🔁 重试生成';
        e.target.disabled = false;
        
        // If error looks like unconfigured API key, open modal
        if (errMsg.includes('未配置 API Key')) {
          if (modal) modal.style.display = 'flex';
        }
      }
    });
  });
}

function formatChunkToHtml(chunk) {
  // basic sanitize
  return chunk
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
