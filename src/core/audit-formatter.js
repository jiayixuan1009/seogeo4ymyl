// ===== SEOGEO4YMYL — Audit Result Formatter (7-element) =====

/**
 * Create a standardized 7-element audit item
 * @param {Object} params
 * @returns {AuditItem}
 */
export function createAuditItem({
  finding,
  evidence,
  impact = 'Info',       // 'Critical' | 'Warning' | 'Pass' | 'Info'
  fix = null,
  fixCode = null,
  confidence = 'Confirmed', // 'Confirmed' | 'Likely' | 'Hypothesis'
  prompt = null,
  llmReviewRequired = false, // Layer 2 flag
}) {
  return Object.freeze({
    finding,
    evidence,
    impact,
    fix,
    fixCode,
    confidence,
    prompt,
    llmReviewRequired,
  });
}

/**
 * Create a standard ModuleResult
 * @param {string} moduleId
 * @param {number} rawScore - 0-100
 * @param {AuditItem[]} items
 * @param {string[]} tags
 * @returns {ModuleResult}
 */
export function createModuleResult(moduleId, rawScore, items = [], tags = []) {
  return Object.freeze({
    moduleId,
    rawScore: Math.max(0, Math.min(100, Math.round(rawScore))),
    items,
    tags,
    timestamp: Date.now(),
  });
}

/**
 * Calculate raw score from audit items
 * @param {Array<{check: boolean, points: number}>} checks
 * @param {number} maxPoints
 * @returns {number} - 0-100
 */
export function scoreFromChecks(checks, maxPoints = 100) {
  const earned = checks.reduce((sum, c) => sum + (c.check ? c.points : 0), 0);
  return Math.round((earned / maxPoints) * 100);
}

/**
 * Get impact badge HTML
 */
export function impactBadgeHtml(impact) {
  const cls = {
    Critical: 'badge-critical',
    Warning: 'badge-warning',
    Pass: 'badge-pass',
    Info: 'badge-info',
  }[impact] || 'badge-info';
  return `<span class="badge ${cls}">${impact}</span>`;
}

/**
 * Get confidence badge HTML
 */
export function confidenceBadgeHtml(confidence) {
  const icons = { Confirmed: '✅', Likely: '🔶', Hypothesis: '🔷' };
  return `<span class="badge badge-info">${icons[confidence] || ''} ${confidence}</span>`;
}
