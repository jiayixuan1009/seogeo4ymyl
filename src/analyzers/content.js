// ===== SEOGEO4YMYL — Content SEO Analyzer =====
// v5: Information Gain + AI Supervision Signals + E-E-A-T

import { createAuditItem, createModuleResult, scoreFromChecks } from '../core/audit-formatter.js';
import { AI_SUPERVISION_POSITIVE, AI_TRANSPARENCY, YMYL_MISLEADING_EN, YMYL_MISLEADING_ZH } from '../utils/constants.js';

export const ContentAnalyzer = {
  id: 'content',
  name: '内容 SEO',
  icon: '📝',
  weight: 0.14,
  requiredResources: ['html'],
  sfCompatible: false, // Requires textContent

  analyze(data) {
    const items = [];
    const checks = [];
    const text = (data.content?.textContent || '').toLowerCase();
    const wordCount = data.content?.wordCount || 0;

    // 1. Word Count
    const wcOk = wordCount >= 300;
    const wcGood = wordCount >= 800;
    items.push(createAuditItem({
      finding: `内容字数: ${wordCount}`,
      evidence: wcGood ? '内容长度充足，适合深度话题' : wcOk ? '内容长度基本达标' : '内容过短，不利于排名',
      impact: wcGood ? 'Pass' : wcOk ? 'Info' : 'Warning',
      confidence: 'Confirmed',
    }));
    checks.push({ check: wcOk, points: 8 });
    checks.push({ check: wcGood, points: 5 });

    // 2. 🔥 Information Gain Score (v5 key metric)
    const entities = data.content?.entities || [];
    const uniqueEntities = entities.filter(e => e.count === 1).length;
    const entityDensity = wordCount > 0 ? (entities.length / wordCount) * 1000 : 0;
    const h2s = data.headings?.h2 || [];
    const h3s = data.headings?.h3 || [];
    const hasDataClaims = /\d+%|\$\d|data\s+show|research\s+(show|find|indicate)|study|survey|according\s+to|根据|数据显示|研究表明/.test(text);
    const hasOriginalElements = /our\s+(analysis|research|data|findings)|we\s+(found|discovered|analyzed)|独家|原创|本站研究/.test(text);

    let igScore = 0;
    if (uniqueEntities > 5) igScore += 20;
    if (entityDensity > 3) igScore += 15;
    if (hasDataClaims) igScore += 25;
    if (hasOriginalElements) igScore += 25;
    if (h2s.length >= 4 && h3s.length >= 2) igScore += 15;

    items.push(createAuditItem({
      finding: `🔥 Information Gain Score: ${igScore}/100`,
      evidence: `独有实体: ${uniqueEntities}, 实体密度: ${entityDensity.toFixed(1)}/千词, 数据声明: ${hasDataClaims ? '✅' : '❌'}, 原创标记: ${hasOriginalElements ? '✅' : '❌'}`,
      impact: igScore >= 60 ? 'Pass' : igScore >= 30 ? 'Warning' : 'Critical',
      fix: igScore < 60 ? '增加原创数据、独家分析和独特观点。"摩天大楼法"已过时，Google 现在优先奖励新信息。' : null,
      prompt: igScore < 60 ? `分析 ${data.url} 的内容，找出可以添加原创数据、独家分析或独特视角的机会。当前 Information Gain Score 仅为 ${igScore}/100。重点关注: 1) 独有实体和数据点 2) 原创研究或分析 3) 独特案例研究` : null,
      confidence: 'Likely',
    }));
    checks.push({ check: igScore >= 40, points: 15 });

    // 3. 🔥 AI Content Supervision Signals (v5)
    const supervisorFound = AI_SUPERVISION_POSITIVE.filter(kw => text.includes(kw.toLowerCase()));
    const transparencyFound = AI_TRANSPARENCY.filter(kw => text.includes(kw.toLowerCase()));
    const hasSupervision = supervisorFound.length > 0;

    items.push(createAuditItem({
      finding: hasSupervision ? `编辑监督信号: ${supervisorFound.length} 个已检测到` : '⚠️ 未检测到编辑监督信号',
      evidence: `检测到: ${supervisorFound.join(', ') || '无'}\nAI透明度: ${transparencyFound.join(', ') || '无'}`,
      impact: hasSupervision ? 'Pass' : 'Critical',
      fix: hasSupervision ? null : '在页面中添加编辑审核标记，如 "Reviewed by [专家姓名]"。对 YMYL/Fintech 站点至关重要。',
      fixCode: hasSupervision ? null : `<!-- 添加到文章区域 -->
<div class="editorial-info">
  <p>Reviewed by <a href="/about/[reviewer]">[审核专家姓名]</a>, [职位]</p>
  <p>Last updated: ${new Date().toISOString().split('T')[0]}</p>
  <p>Fact-checked by <a href="/about/[checker]">[事实核查人]</a></p>
</div>`,
      confidence: 'Confirmed',
      prompt: hasSupervision ? null : `为 ${data.url} 生成编辑标准声明和审核标记 HTML，包括审核人、资质和最后更新日期。这是 Fintech YMYL 站点的必需信号。`,
    }));
    checks.push({ check: hasSupervision, points: 12 });

    // 4. E-E-A-T Signals
    const authorPatterns = /author|作者|written\s+by|撰写|by\s+[A-Z]/.test(text);
    const expertisePatterns = /years?\s+of\s+experience|certified|licensed|expert|专家|认证|资深|CFA|CFP/.test(text);

    items.push(createAuditItem({
      finding: `E-E-A-T 信号: 作者标识 ${authorPatterns ? '✅' : '❌'}, 专业凭证 ${expertisePatterns ? '✅' : '❌'}`,
      evidence: `作者归属: ${authorPatterns ? '已检测到' : '未检测到'}, 专业资质: ${expertisePatterns ? '已检测到' : '未检测到'}`,
      impact: (authorPatterns && expertisePatterns) ? 'Pass' : 'Warning',
      fix: (!authorPatterns || !expertisePatterns) ? '添加作者署名和专业凭证声明。YMYL Fintech 站点缺乏专家背书的 AI 内容排名已大幅下降。' : null,
      confidence: 'Likely',
    }));
    checks.push({ check: authorPatterns, points: 8 });
    checks.push({ check: expertisePatterns, points: 8 });

    // 5. Atomic Answers (for AI citation)
    const atomicAnswers = data.content?.atomicAnswers || [];
    const aaOk = atomicAnswers.length >= 2;
    items.push(createAuditItem({
      finding: `Atomic Answer 块: ${atomicAnswers.length} 个`,
      evidence: aaOk ? `检测到 ${atomicAnswers.length} 个自包含答案段落(30-150词)` : '缺少适合 AI 提取的简洁答案块',
      impact: aaOk ? 'Pass' : 'Warning',
      fix: aaOk ? null : '在每个 H2 下添加 30-150 词的直接答案段落，便于 AI Overview 引用',
      confidence: 'Likely',
    }));
    checks.push({ check: aaOk, points: 10 });

    // 6. Content Freshness
    const hasDates = /202[4-6]|last\s+updated|最后更新|更新于/.test(text);
    items.push(createAuditItem({
      finding: hasDates ? '内容时效性信号已检测到' : '未检测到内容更新日期',
      evidence: hasDates ? '页面包含近期日期或更新标记' : '缺少时间戳或更新标记',
      impact: hasDates ? 'Pass' : 'Info',
      confidence: 'Likely',
    }));
    checks.push({ check: hasDates, points: 5 });

    // 7. YMYL Misleading Language Check
    const misleadingEN = YMYL_MISLEADING_EN.filter(kw => text.includes(kw));
    const misleadingZH = YMYL_MISLEADING_ZH.filter(kw => text.includes(kw));
    const allMisleading = [...misleadingEN, ...misleadingZH];
    const noMisleading = allMisleading.length === 0;

    if (!noMisleading) {
      items.push(createAuditItem({
        finding: `⚠️ 检测到 ${allMisleading.length} 个 YMYL 误导性词汇`,
        evidence: `误导用语: ${allMisleading.join(', ')}`,
        impact: 'Critical',
        fix: '移除或修改这些误导性表述。SpamBrain 会重点打击 YMYL 站点的夸大承诺。',
        confidence: 'Confirmed',
      }));
    }
    checks.push({ check: noMisleading, points: 10 });

    // 8. Reading Level / Structure
    const hasList = /<(ul|ol)[\s>]/i.test(data.content?.textContent || '');
    const hasTable = /<table[\s>]/i.test(data.content?.textContent || '');
    items.push(createAuditItem({
      finding: `内容结构: 列表 ${hasList ? '✅' : '❌'}, 表格 ${hasTable ? '✅' : '❌'}`,
      evidence: '列表和表格提高内容可扫描性和 AI 提取友好度',
      impact: (hasList || hasTable) ? 'Pass' : 'Info',
      confidence: 'Likely',
    }));
    checks.push({ check: hasList || hasTable, points: 5 });

    const rawScore = scoreFromChecks(checks, 86);
    return createModuleResult('content', rawScore, items, ['2026-critical', 'information-gain', 'eeat']);
  },
};
