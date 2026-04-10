// ===== SEOGEO4YMYL — Strategy Template Library =====
// Maps detected gaps to executable strategies for Competitive GEO mode

export const MAX_VISIBLE_STRATEGIES = 7;

/**
 * Strategy priority levels with execution priority mapping
 * P0 = Must do now (directly impacts ranking / AI citation)
 * P1 = High ROI (clearly improves competitiveness)
 * P2 = Optimization (marginal returns)
 */
export const PRIORITY = {
  CRITICAL: { level: 1, label: '🔴 Critical', cssClass: 'strategy-card--critical', execPriority: 'P0' },
  HIGH:     { level: 2, label: '🟠 High',     cssClass: 'strategy-card--high',     execPriority: 'P1' },
  MEDIUM:   { level: 3, label: '🟡 Medium',   cssClass: 'strategy-card--medium',   execPriority: 'P2' },
  LOW:      { level: 4, label: '🔵 Low',      cssClass: 'strategy-card--low',      execPriority: 'P2' },
};

export const EXEC_PRIORITY_META = {
  P0: { label: 'P0 必须立即做', color: 'var(--accent-red)', desc: '直接影响排名 / AI 引用' },
  P1: { label: 'P1 高收益', color: 'var(--accent-orange)', desc: '明显提升竞争力' },
  P2: { label: 'P2 优化项', color: 'var(--accent-gold)', desc: '边际收益较低' },
};

/**
 * Gap detection IDs — used as keys to match strategy templates
 */
export const GAP_IDS = {
  MISSING_TLDR:          'missing_tldr',
  MISSING_FAQ:           'missing_faq',
  MISSING_STATS:         'missing_stats',
  MISSING_ATOMIC:        'missing_atomic',
  MISSING_TABLE:         'missing_table',
  MISSING_DEFINITION:    'missing_definition',
  MISSING_STEPS:         'missing_steps',
  MISSING_AUTHOR:        'missing_author',
  MISSING_SOURCE_CITE:   'missing_source_cite',
  FEW_H2:               'few_h2',
  KEYWORD_NOT_IN_TITLE:  'keyword_not_in_title',
  MISSING_SCHEMA:        'missing_schema',
  MISSING_PROS_CONS:     'missing_pros_cons',
  LOW_WORD_COUNT:        'low_word_count',
  MISSING_EEAT:          'missing_eeat',
  MISSING_FRESHNESS:     'missing_freshness',
};

/**
 * Strategy Templates
 * Each template generates an executable strategy based on gap analysis
 * Now includes importance/riskOfNotDoing/benefitOfDoing for priority framework
 */
export const STRATEGY_TEMPLATES = {
  [GAP_IDS.MISSING_TLDR]: {
    priority: PRIORITY.CRITICAL,
    title: '添加 TL;DR / Key Takeaways 摘要区',
    category: 'structure',
    importance: 'AI Overview 从页面前 200 词提取摘要。没有 TL;DR 意味着 AI 必须自行总结，降低引用意愿。',
    riskOfNotDoing: '竞品有 TL;DR 而你没有时，AI 直接引用竞品摘要而跳过你的页面。排名不变但 AI 引用为零。',
    benefitOfDoing: '匹配 AI 的"摘要提取"模式，引用概率预计提升 30-50%。Featured Snippet 命中率同步提升。',
    action: `在页面 H1 标题下方，正文之前，添加摘要区块。要求：
• 3-5 条要点，每条 ≤20 词
• 第一条必须直接回答核心问题
• 使用 <ul> 列表呈现`,
    codeTemplate: `<div class="key-takeaways">
  <h3>Key Takeaways</h3>
  <ul>
    <li>[直接回答核心问题，≤20词]</li>
    <li>[关键数据点或结论]</li>
    <li>[用户最该注意的事项]</li>
  </ul>
</div>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品有此结构。AI Overview 优先提取页面前 200 词中的摘要内容，添加后可匹配 AI 的"摘要提取"模式。`,
  },

  [GAP_IDS.MISSING_FAQ]: {
    priority: PRIORITY.CRITICAL,
    title: '添加 FAQ 区块 + FAQPage Schema',
    category: 'structure',
    importance: 'FAQ 是 Google Featured Snippet 和 AI Overview 的高频引用源。FAQPage Schema 可直接触发搜索结果中的 FAQ 富片段。',
    riskOfNotDoing: '失去 "People Also Ask" 展示机会。竞品 FAQ 被优先引用，你的页面在问答类查询中完全不可见。',
    benefitOfDoing: '获得 FAQ 富片段展示 + AI Overview 问答引用。每个 FAQ 项都是独立的排名/引用入口。',
    action: `在页面底部添加 FAQ 区块，覆盖 3-5 个用户常见问题。同时添加 FAQPage JSON-LD Schema 以激活搜索结果中的 FAQ 富片段。`,
    codeTemplate: `<!-- FAQ 内容 -->
<section id="faq">
  <h2>常见问题</h2>
  <details>
    <summary>[问题1：用户最常搜索的问题]</summary>
    <p>[答案，40-80词，直接回答不绕弯]</p>
  </details>
  <details>
    <summary>[问题2]</summary>
    <p>[答案]</p>
  </details>
  <details>
    <summary>[问题3]</summary>
    <p>[答案]</p>
  </details>
</section>

<!-- FAQPage Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[问题1]",
      "acceptedAnswer": { "@type": "Answer", "text": "[答案1]" }
    },
    {
      "@type": "Question",
      "name": "[问题2]",
      "acceptedAnswer": { "@type": "Answer", "text": "[答案2]" }
    }
  ]
}
</script>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品有 FAQ 结构。FAQ 是 Google Featured Snippet 和 AI Overview 的高频引用源，也是 "People Also Ask" 的直接数据来源。`,
  },

  [GAP_IDS.MISSING_STATS]: {
    priority: PRIORITY.CRITICAL,
    title: '补充权威统计数据 + 来源标注',
    category: 'content',
    importance: 'AI 引擎通过"data-backed claims"评估内容可信度。没有具体数据的内容被视为纯观点，引用优先级显著低于有数据支撑的竞品。',
    riskOfNotDoing: '内容停留在"观点层面"，AI 和用户都无法验证准确性。YMYL 领域缺乏数据 = 缺乏可信度。',
    benefitOfDoing: '数据密度提升后，AI 引用概率和用户信任度同时提高。每个数据点都是独立的可引用单元。',
    action: `在正文中添加 3-5 个具体数据点（数字/百分比/金额），每个数据点必须标注来源。数据应来自权威机构（世界银行、央行、行业报告等）。`,
    codeTemplate: `<p>根据 [权威来源] [年份] 的数据，[指标] 已达到 [具体数字]，
同比增长 [百分比]。
<sup><a href="[来源链接]">[来源名称]</a></sup></p>

<!-- 或使用数据列表 -->
<ul>
  <li><strong>[指标1]</strong>: [数字]（来源: <a href="[URL]">[机构名]</a>, [年份]）</li>
  <li><strong>[指标2]</strong>: [数字]（来源: <a href="[URL]">[机构名]</a>）</li>
</ul>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品包含统计数据。AI 引擎更信任包含具体数据和来源标注的内容，"data-backed claims"的引用优先级显著高于纯观点。`,
  },

  [GAP_IDS.MISSING_ATOMIC]: {
    priority: PRIORITY.HIGH,
    title: '在每个 H2 后添加 30-60 词原子答案段',
    category: 'structure',
    importance: '原子答案段是 AI Overview 引用的最小可提取单元。30-150 词段落是被引用概率最高的长度区间。',
    riskOfNotDoing: 'AI 无法从你的页面中提取独立引用，即使内容质量高也会被跳过。',
    benefitOfDoing: '每个原子答案段都是潜在引用锚点，增加 3-5 个可将 AI 引用概率提升 20-40%。',
    action: `检查每个 H2 子标题，确保其后的第一个段落是一个 30-60 词的"自包含答案"。这个段落应能脱离上下文独立理解，直接回答 H2 标题提出的问题。`,
    codeTemplate: `<h2>[子主题标题/问题]</h2>
<p>[30-60词的直接回答。这段话应能被AI直接引用，
无需读者阅读前后文即可理解。包含核心结论和一个关键数据点。]</p>
<!-- 之后再展开详细说明 -->`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品有充足的原子答案段(≥3个)。这是 AI Overview 引用的最小可提取单元，30-150 词段落是被引用概率最高的长度区间。`,
  },

  [GAP_IDS.MISSING_TABLE]: {
    priority: PRIORITY.HIGH,
    title: '创建结构化对比表格',
    category: 'structure',
    importance: '表格是 AI Overview 和 Featured Snippet 最偏好的结构化格式。比较型查询中表格的引用率远超纯文本。',
    riskOfNotDoing: '比较型查询中完全不可见。竞品表格会被优先展示和引用。',
    benefitOfDoing: '获得 Featured Snippet 表格展示 + AI Overview 结构化引用。用户停留时间提升。',
    action: `将关键对比信息用 HTML 表格呈现。表格需要清晰的表头、≥3 列对比维度、≥2 行对比对象。`,
    codeTemplate: `<h2>[对比主题] 对比一览</h2>
<table>
  <thead>
    <tr>
      <th>对比维度</th>
      <th>[选项/产品 A]</th>
      <th>[选项/产品 B]</th>
      <th>[选项/产品 C]</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>[维度1，如费用]</td><td>[值]</td><td>[值]</td><td>[值]</td></tr>
    <tr><td>[维度2，如速度]</td><td>[值]</td><td>[值]</td><td>[值]</td></tr>
    <tr><td>[维度3，如安全性]</td><td>[值]</td><td>[值]</td><td>[值]</td></tr>
  </tbody>
</table>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品使用对比表格。表格是 AI Overview 和 Featured Snippet 最喜欢引用的结构化格式之一。`,
  },

  [GAP_IDS.MISSING_DEFINITION]: {
    priority: PRIORITY.HIGH,
    title: '在首段添加核心定义句',
    category: 'content',
    importance: '信息型查询中，AI Overview 的首句引用几乎总是一个定义。缺少定义 = 失去首句引用位。',
    riskOfNotDoing: 'AI 从竞品提取定义后不再需要你的内容。定义位是最高曝光位。',
    benefitOfDoing: '获得 AI Overview 首句引用位。定义类内容的引用持续时间最长。',
    action: `在页面正文首段使用"X is/refers to..."或"X 是指..."句式，在前 50 词内给出核心概念的直接定义。`,
    codeTemplate: `<h2>[关键词] 是什么？</h2>
<p><strong>[关键词]</strong> 是指 [清晰的一句话定义，20-40词]。
[补充一句话说明其重要性或适用场景]。</p>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品包含定义句式。对于信息型查询，AI Overview 的首句引用几乎总是一个定义。`,
  },

  [GAP_IDS.MISSING_STEPS]: {
    priority: PRIORITY.MEDIUM,
    title: '将操作内容重组为有序步骤',
    category: 'structure',
    importance: '有序列表是 Featured Snippet "步骤型"展示的必要条件。操作型查询中步骤列表几乎必被引用。',
    riskOfNotDoing: '如果内容含操作指南但未用 <ol> 格式化，搜索引擎无法识别为步骤型内容。',
    benefitOfDoing: '可能触发 "How to" 步骤型 Featured Snippet。对操作型查询效果显著。',
    action: `将操作指南、教程、流程类内容用有序列表 (<ol>) 重新组织。每步一行，≤80 词，带步骤编号和加粗标题。`,
    codeTemplate: `<h2>如何 [完成操作]</h2>
<ol>
  <li><strong>[步骤标题]</strong> — [具体操作说明，≤80词]</li>
  <li><strong>[步骤标题]</strong> — [说明]</li>
  <li><strong>[步骤标题]</strong> — [说明]</li>
</ol>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品使用步骤列表。有序列表是 Featured Snippet "步骤型"展示的必要条件。`,
  },

  [GAP_IDS.MISSING_AUTHOR]: {
    priority: PRIORITY.HIGH,
    title: '添加作者署名 + Person Schema',
    category: 'trust',
    importance: 'Google 对 YMYL 站点要求明确的内容创作者身份。AI 系统也优先引用有专家背书的内容。',
    riskOfNotDoing: 'YMYL/Fintech 站点缺乏作者归属被视为"来源不明"，可能触发 E-E-A-T 降权信号。',
    benefitOfDoing: '建立内容专家身份，提升 E-E-A-T 评分。AI 对有人格化来源的内容信任度更高。',
    action: `在文章区域添加作者信息区块，包含作者姓名、职位、专业资质。同时添加 Person Schema。对 YMYL/Fintech 站点，缺乏作者归属会严重影响 E-E-A-T 信号。`,
    codeTemplate: `<!-- 文章作者区块 -->
<div class="author-info">
  <img src="[作者头像URL]" alt="[作者姓名]" width="48" height="48" />
  <div>
    <p><strong>[作者姓名]</strong>, [职位]</p>
    <p>[资质，如 CFA / CFP / 10年行业经验]</p>
    <p>最后更新: [日期]</p>
  </div>
</div>

<!-- Person Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "[作者姓名]",
  "jobTitle": "[职位]",
  "url": "[作者介绍页URL]",
  "sameAs": ["[LinkedIn URL]"]
}
</script>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品有作者归属信息。Google 对 YMYL 站点要求明确的内容创作者身份，AI 系统也优先引用有专家背书的内容。`,
  },

  [GAP_IDS.MISSING_SOURCE_CITE]: {
    priority: PRIORITY.MEDIUM,
    title: '添加外部权威来源引用',
    category: 'trust',
    importance: 'AI 引擎通过交叉验证评估可信度。引用权威来源 = 增加内容被交叉验证通过的概率。',
    riskOfNotDoing: '无来源标注的声明在 AI 评估中被视为不可验证，引用优先级低于有来源的竞品。',
    benefitOfDoing: '提升内容可信度。AI 系统更倾向引用"可溯源"的信息。',
    action: `在正文中添加 2-3 个外部权威来源的引用，使用 "according to [来源]" 句式，链接到原始来源。`,
    codeTemplate: `<p>According to <a href="[来源URL]" rel="nofollow">[权威机构名]</a>,
[具体信息/数据]。</p>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品引用了外部权威来源。AI 引擎通过交叉验证来评估内容可信度，有来源标注的声明更容易被采信和引用。`,
  },

  [GAP_IDS.FEW_H2]: {
    priority: PRIORITY.MEDIUM,
    title: '增加 H2 子主题覆盖深度',
    category: 'structure',
    importance: '话题深度是内容排名的关键因素。更多 H2 = 更多被 AI 提取引用的潜在锚点。',
    riskOfNotDoing: '话题覆盖不全面，长尾查询排名缺失。竞品覆盖更多子主题时你的页面综合排名下降。',
    benefitOfDoing: '覆盖更多子主题，捕获更多长尾流量。每个新 H2 是新的 AI 引用锚点。',
    action: `当前 H2 数量不足。基于竞品分析，建议增加 H2 子标题以覆盖更多话题维度。每个 H2 下应有 100-200 词的深入讨论。`,
    codeTemplate: `<!-- 建议新增的 H2 子主题 -->
<h2>[竞品覆盖但你缺少的子主题 1]</h2>
<p>[100-200词深入讨论]</p>

<h2>[竞品覆盖但你缺少的子主题 2]</h2>
<p>[100-200词深入讨论]</p>`,
    generateImpact: (coverage, total) =>
      `竞品平均有更多 H2 子主题。话题深度是内容排名的关键因素，更多 H2 = 更多被 AI 提取引用的潜在锚点。`,
  },

  [GAP_IDS.KEYWORD_NOT_IN_TITLE]: {
    priority: PRIORITY.CRITICAL,
    title: '将目标关键词写入 Title 和 H1',
    category: 'content',
    importance: 'Title 和 H1 中的关键词是搜索引擎理解页面主题的第一信号。这是所有 on-page SEO 中最基础的要求。',
    riskOfNotDoing: '搜索引擎无法确定页面主题与目标关键词的相关性。排名基本无望。',
    benefitOfDoing: '建立最基本的主题相关性信号。修复后排名立即可见改善。',
    action: `当前页面的 Title 和/或 H1 不包含目标关键词。这是最基础的 on-page SEO 信号，必须修复。`,
    codeTemplate: `<title>[包含目标关键词的标题，控制在 15-70 字符]</title>
<h1>[包含目标关键词的页面主标题]</h1>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品在 Title/H1 中包含目标关键词。Title 和 H1 中的关键词是搜索引擎理解页面主题的第一信号。`,
  },

  [GAP_IDS.MISSING_SCHEMA]: {
    priority: PRIORITY.MEDIUM,
    title: '添加结构化数据 Schema',
    category: 'trust',
    importance: 'Schema 帮助 AI 系统建立实体关系图谱，提升内容在知识图谱中的可发现性。',
    riskOfNotDoing: 'AI 系统理解页面结构的效率降低。不影响排名但影响 AI 引用的精准度。',
    benefitOfDoing: '增强 AI 对页面实体和关系的理解。可能触发富型搜索结果。',
    action: `添加与页面内容匹配的 JSON-LD Schema（如 Article, Organization, FAQPage）。Schema 帮助 AI 系统理解页面结构和实体关系。`,
    codeTemplate: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[文章标题]",
  "author": { "@type": "Person", "name": "[作者名]" },
  "datePublished": "[发布日期]",
  "dateModified": "[更新日期]",
  "publisher": {
    "@type": "Organization",
    "name": "[站点名]",
    "logo": { "@type": "ImageObject", "url": "[Logo URL]" }
  }
}
</script>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品有 Schema 结构化数据。Schema 帮助 AI 系统建立实体关系图谱，提升内容在知识图谱中的可发现性。`,
  },

  [GAP_IDS.MISSING_PROS_CONS]: {
    priority: PRIORITY.MEDIUM,
    title: '添加优缺点对比列表',
    category: 'content',
    importance: '比较型查询中，AI Overview 经常直接提取优缺点列表。结构化优缺点是高频引用格式。',
    riskOfNotDoing: '比较型查询中缺少结构化对比信息。对非比较型查询影响很小。',
    benefitOfDoing: '比较型查询中获得 AI 引用。用户满意度提升。',
    action: `添加结构化的优缺点列表。使用 ✅/❌ 标记，每点 ≤30 词。`,
    codeTemplate: `<h2>[主题] 优缺点</h2>
<h3>✅ 优点</h3>
<ul>
  <li>[优点1，≤30词]</li>
  <li>[优点2]</li>
  <li>[优点3]</li>
</ul>
<h3>❌ 缺点</h3>
<ul>
  <li>[缺点1，≤30词]</li>
  <li>[缺点2]</li>
</ul>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品包含优缺点分析。比较型查询中，AI Overview 经常直接提取优缺点列表。`,
  },

  [GAP_IDS.LOW_WORD_COUNT]: {
    priority: PRIORITY.HIGH,
    title: '增加内容深度和字数',
    category: 'content',
    importance: '内容深度不足的页面在竞争性关键词下很难排名靠前。AI 也倾向引用更全面的信息源。',
    riskOfNotDoing: '内容被视为"浅层覆盖"，无法与深度竞品竞争。排名逐步下滑。',
    benefitOfDoing: '达到或超越竞品内容深度。话题覆盖度提升直接影响排名。',
    action: `当前页面内容字数明显低于竞品。针对目标关键词，扩展内容以覆盖更多子主题。建议目标字数: 与竞品平均字数持平或超出 20%。`,
    codeTemplate: null,
    generateImpact: (coverage, total) =>
      `竞品平均内容更长。内容深度不足的页面在竞争性关键词下很难排名靠前，AI 也倾向引用更全面的信息源。`,
  },

  [GAP_IDS.MISSING_EEAT]: {
    priority: PRIORITY.HIGH,
    title: '强化 E-E-A-T 信号',
    category: 'trust',
    importance: 'Google 2025-2026 持续强化 YMYL 站点的 E-E-A-T 要求。缺乏编辑监督标记是 YMYL 降权的直接触发因素。',
    riskOfNotDoing: 'YMYL 站点缺乏 E-E-A-T 将导致排名持续下降。AI 引用信任度也随之降低。',
    benefitOfDoing: '建立内容质量背书体系。E-E-A-T 改善后排名和 AI 引用双重提升。',
    action: `添加以下任一或多个 E-E-A-T 信号:
• "Reviewed by [专家姓名], [资质]" 审核标记
• "Fact-checked by [人名]" 事实核查标记
• 编辑标准声明链接
• 内容最后更新日期`,
    codeTemplate: `<div class="editorial-info">
  <p>Reviewed by <a href="/about/[reviewer]">[审核专家姓名]</a>, [职位/资质]</p>
  <p>Fact-checked by <a href="/about/[checker]">[事实核查人]</a></p>
  <p>Last updated: [YYYY-MM-DD]</p>
  <p><a href="/editorial-standards">Our Editorial Standards</a></p>
</div>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品有 E-E-A-T 信号。Google 2025-2026 持续强化 YMYL 站点的 E-E-A-T 要求，缺乏编辑监督标记将导致排名持续下降。`,
  },

  [GAP_IDS.MISSING_FRESHNESS]: {
    priority: PRIORITY.LOW,
    title: '添加内容时效性标记',
    category: 'trust',
    importance: 'AI 系统对内容新鲜度敏感。过时内容的引用优先级会被降低。',
    riskOfNotDoing: '低风险。仅在内容确实过时的情况下影响排名和引用。',
    benefitOfDoing: '用户信任度微提升。AI 系统对标注了更新日期的内容给予少量奖励。',
    action: `在页面中添加明确的内容更新日期，并确保日期为最近 6 个月内。`,
    codeTemplate: `<p>Last updated: <time datetime="[YYYY-MM-DD]">[可读日期]</time></p>`,
    generateImpact: (coverage, total) =>
      `${coverage}/${total} 竞品有时效性标记。AI 系统对内容新鲜度敏感，过时内容的引用优先级会被降低。`,
  },
};

/**
 * Generate strategies from detected gaps
 * @param {Array<{gapId: string, competitorCoverage: number, totalCompetitors: number, details?: string}>} gaps
 * @returns {Array} Sorted strategy list (max MAX_VISIBLE_STRATEGIES initially visible)
 */
export function generateStrategies(gaps) {
  const strategies = [];

  for (const gap of gaps) {
    const template = STRATEGY_TEMPLATES[gap.gapId];
    if (!template) continue;

    strategies.push({
      gapId: gap.gapId,
      priority: template.priority,
      execPriority: template.priority.execPriority,
      title: template.title,
      category: template.category,
      importance: template.importance,
      riskOfNotDoing: template.riskOfNotDoing,
      benefitOfDoing: template.benefitOfDoing,
      action: template.action,
      codeTemplate: template.codeTemplate,
      aiPrompt: AI_PROMPTS[gap.gapId] || null,
      impact: template.generateImpact(gap.competitorCoverage, gap.totalCompetitors),
      details: gap.details || null,
    });
  }

  // Sort by priority level (1=critical first), then by competitor coverage (higher = more urgent)
  strategies.sort((a, b) => {
    if (a.priority.level !== b.priority.level) return a.priority.level - b.priority.level;
    return 0;
  });

  return strategies;
}

/**
 * Generate Top 5 must-do summary from strategies
 * Forces trade-offs: only keeps the 5 most critical items
 */
export function generateTop5Summary(strategies) {
  return strategies.slice(0, 5).map((s, i) => ({
    rank: i + 1,
    title: s.title,
    execPriority: s.execPriority,
    importance: s.importance,
    riskOfNotDoing: s.riskOfNotDoing,
    benefitOfDoing: s.benefitOfDoing,
  }));
}

/**
 * Get category label
 */
export function getCategoryLabel(category) {
  const labels = {
    structure: { label: '结构缺失', icon: '🏗️' },
    content:   { label: '内容缺失', icon: '📝' },
    trust:     { label: '信任缺失', icon: '🛡️' },
  };
  return labels[category] || { label: category, icon: '📌' };
}

/**
 * AI Prompt Templates
 * Maps each gap to a ready-to-use AI prompt for content generation
 */
export const AI_PROMPTS = {
  [GAP_IDS.MISSING_TLDR]: '请基于以下页面内容，生成一个 Key Takeaways 摘要区。要求：3-5 条要点，每条不超过 20 词，第一条必须直接回答用户的核心问题。使用无序列表格式。\n\n页面内容：\n{{content}}',

  [GAP_IDS.MISSING_FAQ]: '请基于以下页面主题，生成 5 个用户最可能搜索的常见问题及答案。每个答案 40-80 词，必须直接回答不绕弯。同时生成对应的 FAQPage JSON-LD Schema。\n\n页面主题：{{keyword}}\n页面内容摘要：\n{{content}}',

  [GAP_IDS.MISSING_STATS]: '请为以下内容补充 3-5 个权威统计数据。每个数据点必须包含：具体数字、来源机构名称、数据年份。优先使用世界银行、央行、行业报告等权威来源。\n\n内容主题：{{keyword}}\n当前内容：\n{{content}}',

  [GAP_IDS.MISSING_ATOMIC]: '请将以下内容中每个 H2 子标题后的首段改写为 30-60 词的"原子答案"。要求：每段可独立理解、能被 AI 直接引用、包含一个核心结论和关键数据点。\n\n当前内容：\n{{content}}',

  [GAP_IDS.MISSING_TABLE]: '请基于以下内容，创建一个结构化对比表格。要求：至少 3 列对比维度、至少 3 行对比对象、表头清晰、数据具体。\n\n对比主题：{{keyword}}\n参考信息：\n{{content}}',

  [GAP_IDS.MISSING_DEFINITION]: '请为"{{keyword}}"生成一个核心定义段落。要求：使用"X 是指..."句式，20-40 词的清晰一句话定义，再补充一句说明其重要性。\n\n参考内容：\n{{content}}',

  [GAP_IDS.MISSING_STEPS]: '请将以下操作指南内容重组为有序步骤列表。每步一行，包含加粗的步骤标题和不超过 80 词的操作说明。\n\n原始内容：\n{{content}}',

  [GAP_IDS.MISSING_AUTHOR]: '请为以下页面生成一个作者署名区块，包含：作者姓名、职位、专业资质、最后更新日期。同时生成对应的 Person Schema JSON-LD。\n\n页面主题：{{keyword}}',

  [GAP_IDS.MISSING_SOURCE_CITE]: '请为以下内容中的关键声明补充 2-3 个外部权威来源引用。使用"According to [来源名]"句式，标注来源机构和年份。\n\n内容：\n{{content}}',

  [GAP_IDS.FEW_H2]: '请基于以下主题和竞品覆盖的子主题，建议 3-5 个新的 H2 子标题。每个 H2 后需包含 100-200 词的深入讨论内容。\n\n主题：{{keyword}}\n当前 H2 列表：{{current_h2s}}',

  [GAP_IDS.KEYWORD_NOT_IN_TITLE]: '请为目标关键词"{{keyword}}"重写页面 Title 和 H1。Title 控制在 15-70 字符，必须自然地包含关键词。\n\n当前 Title：{{current_title}}',

  [GAP_IDS.MISSING_SCHEMA]: '请为以下页面生成完整的 JSON-LD Schema。根据内容类型选择 Article/FAQPage/HowTo，包含 headline、author、datePublished、publisher 等必要字段。\n\n页面信息：\n标题：{{title}}\n作者：{{author}}\n发布日期：{{date}}',

  [GAP_IDS.MISSING_PROS_CONS]: '请基于以下内容，生成结构化的优缺点列表。优点用 ✅ 标记，缺点用 ❌ 标记，每点不超过 30 词。\n\n主题：{{keyword}}\n参考内容：\n{{content}}',

  [GAP_IDS.LOW_WORD_COUNT]: '请基于以下主题和竞品覆盖的内容维度，扩展当前页面内容。目标字数：增加至少 500 词。新增内容应覆盖竞品已覆盖但你缺少的子主题。\n\n主题：{{keyword}}\n当前内容：\n{{content}}\n竞品覆盖的子主题：{{competitor_topics}}',

  [GAP_IDS.MISSING_EEAT]: '请为以下页面添加 E-E-A-T 信号。生成：1) "Reviewed by [专家]" 审核标记 2) "Fact-checked by [人名]" 核查标记 3) 编辑标准声明链接模板 4) 带有 <time> 标签的更新日期。\n\n页面主题：{{keyword}}',

  [GAP_IDS.MISSING_FRESHNESS]: '请为以下内容添加时效性标记。格式：Last updated: <time datetime="YYYY-MM-DD">可读日期</time>。并建议 3 项可以更新的内容点以保持时效性。\n\n当前内容：\n{{content}}',
};

