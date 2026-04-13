// ===== SEOGEO4YMYL — Site-Level Results Page & Topology Graph (v2) =====

import { Network } from 'vis-network';
import { esc } from '../utils/html-escape.js';

// ── Shared state ─────────────────────────────────────────────────────────────
let _actions = [];
let _insights = {};
let _nodes = [];

// ── Main render ──────────────────────────────────────────────────────────────
export function renderSiteResults(containerId) {
  return `
    <div class="container animate-slide-up" style="padding-top:var(--space-4);padding-bottom:var(--space-10)">

      <!-- KPI Row -->
      <div id="sr-kpi-row" class="grid gap-3 mb-5" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
        ${kpi('sr-nodes-count',    '抓取页面数',                  'var(--accent-blue)')}
        ${kpi('sr-broken-count',   '死链 (404+Inlinks)',          'var(--accent-red)')}
        ${kpi('sr-orphan-count',   '孤岛页 (0 Inlinks)',          'var(--accent-orange)')}
        ${kpi('sr-missing-title',  'Title 缺失',                  'var(--accent-red)')}
        ${kpi('sr-dup-title',      'Title 重复页面',              'var(--accent-red)')}
        ${kpi('sr-missing-h1',     'H1 缺失',                     'var(--accent-orange)')}
        ${kpi('sr-missing-desc',   'Meta Desc 缺失',              'var(--accent-orange)')}
        ${kpi('sr-thin-content',   '内容薄页 (<300词)',            'var(--accent-gold)')}
        ${kpi('sr-deep-pages',     '深层级页 (≥4)',                'var(--accent-gold)')}
      </div>

      <!-- Network Graph -->
      <div class="glass-card mb-5" style="padding:0; overflow:hidden; border-color:var(--border-strong)">
        <div class="flex justify-between" style="padding:var(--space-3) var(--space-4); background:rgba(0,0,0,0.2); border-bottom:1px solid var(--border-default); align-items:center">
          <h3 class="m-0 text-base">🕸️ 网站内链拓扑 (Silo Topology)</h3>
          <div class="gap-3 text-[11px] text-muted" style="display:flex; align-items:center">
            <span>🟢 根页 / 普通页</span><span>🟡 孤岛页</span><span>🔴 死链</span>
            <span>支持缩放 / 拖拽</span>
          </div>
        </div>
        <div id="${containerId}" class="w-full" style="height:420px; background:#0d0e12"></div>
      </div>

      <!-- SEO Issue Panels -->
      <div id="sr-issue-panels" class="mb-6">
        <div class="flex justify-between mb-3" style="align-items:center">
          <h3 class="text-base font-bold m-0">📋 SEO 问题清单</h3>
          <button id="sr-export-btn" class="btn btn-secondary text-xs">
            📥 导出问题 CSV
          </button>
        </div>
        <div id="sr-actions-container"></div>
      </div>

    </div>
  `;
}

function kpi(id, label, color) {
  return `
    <div class="glass-card text-center" style="padding:var(--space-3)">
      <div class="text-[10px] text-muted" style="margin-bottom:4px">${label}</div>
      <div id="${id}" style="font-size:var(--font-size-xl);font-weight:900;color:${color}">—</div>
    </div>
  `;
}

// ── KPI fill ─────────────────────────────────────────────────────────────────
export function fillSiteKpis(nodes, insights) {
  _nodes    = nodes    || [];
  _insights = insights || {};
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
  };
  // totalParsed fallback: use nodes.length if not set
  set('sr-nodes-count',   insights.totalParsed  ?? _nodes.length);
  set('sr-broken-count',  insights.brokenCount   ?? 0);
  set('sr-orphan-count',  insights.orphanCount   ?? 0);
  set('sr-missing-title', insights.missingTitle  ?? 0);
  set('sr-dup-title',     insights.dupTitleCount ?? 0);
  set('sr-missing-h1',    insights.missingH1     ?? 0);
  set('sr-missing-desc',  insights.missingDesc   ?? 0);
  set('sr-thin-content',  insights.thinContent   ?? 0);
  set('sr-deep-pages',    insights.deepPages     ?? 0);
}

// ── Network graph ─────────────────────────────────────────────────────────────
export function drawNetworkGraph(containerId, nodesArray, edgesArray) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = { nodes: nodesArray, edges: edgesArray };
  const options = {
    nodes: {
      shape: 'dot',
      font: { color: '#ffffff', size: 11, face: 'Inter' },
      borderWidth: 2,
    },
    edges: {
      color: { color: 'rgba(77,159,255,0.35)', highlight: '#4d9fff' },
      arrows: { to: { enabled: true, scaleFactor: 0.4 } },
    },
    groups: {
      root:   { color: { background: '#22c55e', border: '#16a34a' } },
      page:   { color: { background: '#3b82f6', border: '#2563eb' } },
      orphan: { color: { background: '#f59e0b', border: '#d97706' } },
      error:  { color: { background: '#ef4444', border: '#dc2626' } },
    },
    physics: {
      forceAtlas2Based: { gravitationalConstant: -26, centralGravity: 0.005, springLength: 100, springConstant: 0.18 },
      maxVelocity: 100,
      solver: 'forceAtlas2Based',
      timestep: 0.35,
      stabilization: { iterations: 150 },
    },
  };
  new Network(container, data, options);
}

// ── Action cards ──────────────────────────────────────────────────────────────
const PRIORITY_META = {
  P0: { label: '🔴 Critical', color: 'var(--accent-red)',    bg: 'var(--accent-red)' },
  P1: { label: '🟠 High',     color: 'var(--accent-orange)', bg: 'var(--accent-orange)' },
  P2: { label: '🟡 Medium',   color: 'var(--accent-gold)',   bg: 'var(--accent-gold)' },
};

export function renderSiteActions(actions) {
  _actions = actions;
  const container = document.getElementById('sr-actions-container');
  if (!container) return;

  if (actions.length === 0) {
    container.innerHTML = '<div class="glass-card text-center text-accent-green">✅ 全站 SEO 基础健康，暂无需要修复的问题。</div>';
    return;
  }

  const catLabels = { onpage: '📄 On-Page', technical: '🔧 技术 SEO', structure: '🏗️ 结构', content: '📝 内容', general: '📊 总览' };

  const html = actions.map((act, i) => {
    const pm = PRIORITY_META[act.execPriority] || PRIORITY_META.P2;
    const catLabelRaw = catLabels[act.category] || act.category || '';
    const catLabel = catLabelRaw ? esc(catLabelRaw) : '';
    const hasURLs = act.list && act.list.length > 0;
    return `
      <div class="glass-card mb-3" style="border-left:3px solid ${pm.color}">
        <div class="flex items-center gap-2 mb-2" style="flex-wrap:wrap">
          <span class="badge" style="background:${pm.bg}22;color:${pm.color}">${pm.label}</span>
          ${catLabel ? `<span class="badge badge-info">${catLabel}</span>` : ''}
          <h4 class="m-0 text-sm" style="flex:1">${esc(act.title)}</h4>
        </div>
        ${act.importance ? `<div class="text-xs text-secondary" style="margin-bottom:8px; line-height:1.5">${esc(act.importance)}</div>` : ''}
        ${(act.riskOfNotDoing || act.benefitOfDoing) ? `
          <div class="grid gap-2 mb-2" style="grid-template-columns:1fr 1fr">
            ${act.riskOfNotDoing ? `<div style="background:rgba(255,77,106,0.05);padding:6px 8px;border-radius:4px"><div class="text-accent-red" style="font-size:9px">不修复的风险</div><div class="text-[11px] text-secondary">${esc(act.riskOfNotDoing)}</div></div>` : ''}
            ${act.benefitOfDoing ? `<div style="background:rgba(0,255,136,0.05);padding:6px 8px;border-radius:4px"><div class="text-accent-green" style="font-size:9px">修复后收益</div><div class="text-[11px] text-secondary">${esc(act.benefitOfDoing)}</div></div>` : ''}
          </div>
        ` : ''}
        <div class="text-[13px]" style="background:rgba(0,0,0,0.2); padding:10px; border-radius:4px">
          <strong>👉 建议行动：</strong> ${esc(act.action)}
        </div>
        ${hasURLs ? `
          <details class="cursor-pointer" style="margin-top:8px">
            <summary class="text-[11px] text-muted">查看受影响的 URL（${act.list.length} 个）</summary>
            <div class="text-[11px] text-muted" style="padding:8px 0; max-height:200px; overflow-y:auto">
              ${act.list.map((u) => `<div style="padding:2px 0;word-break:break-all">${esc(u)}</div>`).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // Bind export button
  const exportBtn = document.getElementById('sr-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportIssuesCsv);
  }
}

// ── Export CSV ─────────────────────────────────────────────────────────────────
function exportIssuesCsv() {
  const rows = [['优先级', '类别', '问题标题', '行动建议', '受影响URL数', '受影响URL列表']];
  for (const act of _actions) {
    rows.push([
      act.execPriority || '',
      act.category || '',
      (act.title || '').replace(/[🔴🟠🟡✅]/g, '').trim(),
      (act.action || '').replace(/\n/g, ' '),
      act.list ? act.list.length : 0,
      act.list ? act.list.join(' | ') : '',
    ]);
  }
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seo-issues-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Backward compat shims (used by home.js) ───────────────────────────────────
/** @deprecated use fillSiteKpis instead */
export function drawNetworkGraph_compat(containerId, nodes, edges) {
  return drawNetworkGraph(containerId, nodes, edges);
}
