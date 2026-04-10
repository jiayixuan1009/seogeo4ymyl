// ===== SEOGEO4YMYL — AI Citation Readiness Analyzer =====
// v5 NEW: Measures how likely a page is to be cited by AI systems

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';

export const AiCitationAnalyzer = {
  id: 'ai-citation',
  name: 'AI 引用就绪度',
  icon: '🎯',
  weight: 0.08,
  requiredResources: ['html'],
  sfCompatible: false,

  analyze(data) {
    const items = [];
    const checks = [];
    const text = (data.content?.textContent || '').toLowerCase();

    // 1. Atomic Answer Density
    const atomicAnswers = data.content?.atomicAnswers || [];
    const aaCount = atomicAnswers.length;
    const aaOk = aaCount >= 3;
    items.push(createAuditItem({
      finding: `Atomic Answer 块: ${aaCount} 个`,
      evidence: aaOk
        ? `检测到 ${aaCount} 个自包含答案段落 (30-150词)，AI 可直接提取`
        : '缺少适合 AI 直接提取引用的简洁答案区块',
      impact: aaOk ? 'Pass' : 'Warning',
      fix: aaOk ? null : '在每个 H2/H3 子标题后，用 30-150 词直接回答核心问题。这是被 AI Overview 引用的关键格式。',
      fixCode: aaOk ? null : `<!-- Atomic Answer 结构示例 -->
<h2>What is international remittance?</h2>
<p>International remittance is the transfer of money from a foreign worker
to their home country. In 2025, global remittance flows exceeded $800 billion,
with digital channels accounting for over 40% of transactions. Key factors
affecting cost include exchange rates, transfer fees, and processing time.</p>
<!-- 上述段落: 50词, 自包含, 有数据, AI 可直接引用 -->`,
      confidence: 'Likely',
    }));
    checks.push({ check: aaOk, points: 20 });

    // 2. TL;DR / Summary Block
    const hasSummary = /tl;dr|summary|key\s*(take\s*aways?|points?|highlights?)|摘要|要点|核心观点/.test(text);
    items.push(createAuditItem({
      finding: hasSummary ? 'TL;DR / 摘要区 ✅' : 'TL;DR / 摘要区缺失',
      evidence: hasSummary ? '页面有可被 AI 快速提取的摘要内容' : '缺少摘要区域',
      impact: hasSummary ? 'Pass' : 'Warning',
      fix: hasSummary ? null : '在文章开头添加 Key Takeaways / 要点摘要 区块',
      fixCode: hasSummary ? null : `<div class="key-takeaways">
  <h3>Key Takeaways</h3>
  <ul>
    <li>[核心观点 1]</li>
    <li>[核心观点 2]</li>
    <li>[核心观点 3]</li>
  </ul>
</div>`,
      confidence: 'Likely',
    }));
    checks.push({ check: hasSummary, points: 15 });

    // 3. Table/List Extraction Friendliness
    const hasTable = /<table/i.test(text) || /\|.*\|.*\|/.test(text);
    const hasList = data.headings?.h2?.length >= 3;
    const structureOk = hasTable || hasList;
    items.push(createAuditItem({
      finding: `表格/列表: 表格 ${hasTable ? '✅' : '❌'}, 结构化列表 ${hasList ? '✅' : '❌'}`,
      evidence: structureOk ? '内容以 AI 友好的结构化格式呈现' : '缺少比较表格或步骤列表',
      impact: structureOk ? 'Pass' : 'Warning',
      fix: structureOk ? null : '将对比信息用表格呈现，将步骤用有序列表呈现',
      confidence: 'Likely',
    }));
    checks.push({ check: structureOk, points: 15 });

    // 4. First-Paragraph Direct Answer
    const h2s = data.headings?.h2 || [];
    const firstParaOk = atomicAnswers.length > 0 && atomicAnswers[0]?.wordCount >= 30;
    items.push(createAuditItem({
      finding: firstParaOk ? '首段即答 ✅' : '首段未直接回应核心问题',
      evidence: firstParaOk
        ? `首个答案块 ${atomicAnswers[0]?.wordCount} 词`
        : 'H2 后的首段应在 30-60 词内直接回答问题',
      impact: firstParaOk ? 'Pass' : 'Warning',
      confidence: 'Likely',
    }));
    checks.push({ check: firstParaOk, points: 20 });

    // 5. Follow-up Question Coverage
    const hasFollowUp = /related|also\s+ask|frequently|FAQ|常见问题|相关问题|you\s+might\s+also/.test(text);
    const h3Count = data.headings?.h3?.length || 0;
    const followUpOk = hasFollowUp || h3Count >= 3;
    items.push(createAuditItem({
      finding: followUpOk ? '跟进问题覆盖 ✅' : '跟进问题覆盖不足',
      evidence: `H3 子标题: ${h3Count} 个, FAQ区: ${hasFollowUp ? '✅' : '❌'}`,
      impact: followUpOk ? 'Pass' : 'Info',
      fix: followUpOk ? null : '预判用户可能的跟进问题，以 H3 或 FAQ 形式覆盖',
      confidence: 'Likely',
    }));
    checks.push({ check: followUpOk, points: 15 });

    // 6. Schema ↔ Content Consistency
    const schemas = data.schemas || [];
    const schemaContentMatch = schemas.length > 0 && data.content?.wordCount > 100;
    items.push(createAuditItem({
      finding: schemaContentMatch ? 'Schema↔内容一致性: 可验证' : 'Schema↔内容一致性: 无法验证',
      evidence: schemaContentMatch
        ? `${schemas.length} 个 Schema + ${data.content.wordCount} 词正文`
        : 'AI 系统会交叉验证 Schema 数据与页面可见文本',
      impact: schemaContentMatch ? 'Pass' : 'Warning',
      confidence: 'Hypothesis',
    }));
    checks.push({ check: schemaContentMatch, points: 15 });

    const rawScore = scoreFromChecks(checks, 100);
    return createModuleResult('ai-citation', rawScore, items, ['2026-critical', 'ai-first']);
  },
};
