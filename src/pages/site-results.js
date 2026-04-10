// ===== SEOGEO4YMYL — Site-Level Results Page & Topology Graph =====

import { Network } from 'vis-network';

export function renderSiteResults(containerId) {
  return `
    <div class="container animate-slide-up" style="padding-top:var(--space-4);padding-bottom:var(--space-10)">
      
      <!-- Top Metrics -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-5)">
        <div class="glass-card" style="text-align:center">
          <div style="font-size:var(--font-size-xs);color:var(--text-muted)">抓取/解析节点数</div>
          <div id="sr-nodes-count" style="font-size:var(--font-size-2xl);font-weight:900;color:var(--accent-blue)">-</div>
        </div>
        <div class="glass-card" style="text-align:center">
          <div style="font-size:var(--font-size-xs);color:var(--text-muted)">探测到的死链 (404)</div>
          <div id="sr-broken-count" style="font-size:var(--font-size-2xl);font-weight:900;color:var(--accent-red)">-</div>
        </div>
        <div class="glass-card" style="text-align:center">
          <div style="font-size:var(--font-size-xs);color:var(--text-muted)">潜在孤岛页面 (0 Inlinks)</div>
          <div id="sr-orphan-count" style="font-size:var(--font-size-2xl);font-weight:900;color:var(--accent-orange)">-</div>
        </div>
      </div>

      <!-- Network Graph Container -->
      <div class="glass-card" style="padding:0;overflow:hidden;border-color:var(--border-strong);margin-bottom:var(--space-5)">
        <div style="padding:var(--space-3) var(--space-4);background:rgba(0,0,0,0.2);border-bottom:1px solid var(--border-default);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:var(--font-size-base)">🕸️ 网站内链拓扑 (Silo Topology)</h3>
          <span style="font-size:10px;color:var(--text-muted)">支持滚轮缩放与节点拖拽</span>
        </div>
        <div id="${containerId}" style="width:100%;height:450px;background:#0d0e12"></div>
      </div>

      <!-- Action Layer -->
      <div>
        <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3)">全站重构行动建议 (Macro Actions)</h3>
        <div id="sr-actions-container"></div>
      </div>
    </div>
  `;
}

export function drawNetworkGraph(containerId, nodesArray, edgesArray) {
  const container = document.getElementById(containerId);
  const data = {
    nodes: nodesArray,
    edges: edgesArray
  };
  
  const options = {
    nodes: {
      shape: 'dot',
      font: { color: '#ffffff', size: 12, face: 'Inter' },
      borderWidth: 2,
    },
    edges: {
      color: { color: 'rgba(77, 159, 255, 0.4)', highlight: '#4d9fff' },
      arrows: { to: { enabled: true, scaleFactor: 0.5 } }
    },
    groups: {
      root: { color: { background: '#22c55e', border: '#16a34a' } }, // Green
      page: { color: { background: '#3b82f6', border: '#2563eb' } }, // Blue
      orphan: { color: { background: '#f59e0b', border: '#d97706' } }, // Orange
      error: { color: { background: '#ef4444', border: '#dc2626' } } // Red
    },
    physics: {
      forceAtlas2Based: {
        gravitationalConstant: -26,
        centralGravity: 0.005,
        springLength: 100,
        springConstant: 0.18
      },
      maxVelocity: 100,
      solver: 'forceAtlas2Based',
      timestep: 0.35,
      stabilization: { iterations: 150 }
    }
  };

  new Network(container, data, options);
}

export function renderSiteActions(actions) {
  const container = document.getElementById('sr-actions-container');
  if (!container) return;

  if (actions.length === 0) {
    container.innerHTML = '<div class="glass-card" style="text-align:center;color:var(--accent-green)">全站健康指标良好，暂无重构动作。</div>';
    return;
  }

  const html = actions.map(act => {
    const isP0 = act.execPriority === 'P0';
    return \`
      <div class="glass-card" style="margin-bottom:var(--space-3);border-left:3px solid \${isP0 ? 'var(--accent-red)' : 'var(--accent-orange)'}">
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
          <span class="badge" style="background:\${isP0 ? 'var(--accent-red)' : 'var(--accent-orange)'}22;color:\${isP0 ? 'var(--accent-red)' : 'var(--accent-orange)'}">\${act.execPriority}</span>
          <h4 style="margin:0;font-size:var(--font-size-base)">\${act.title}</h4>
        </div>
        \${act.importance ? \`<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">\${act.importance}</div>\` : ''}
        <div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:4px;font-size:13px;color:var(--text-primary);">
          <strong>👉 建议行动：</strong> \${act.action}
        </div>
        \${act.list && act.list.length > 0 ? \`
          <details style="margin-top:8px;font-size:11px;color:var(--text-muted);cursor:pointer">
            <summary>查看受影响的 URL (\${act.list.length})</summary>
            <div style="padding-top:4px;white-space:pre-wrap;word-break:break-all">\${act.list.join('\\n')}</div>
          </details>
        \` : ''}
      </div>
    \`;
  }).join('');

  container.innerHTML = html;
}
