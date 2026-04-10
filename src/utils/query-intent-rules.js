// ===== SEOGEO4YMYL — Query Intent Rules & AI Citation Knowledge Base =====

// === Query Intent Classification ===
export const INTENT_TYPES = {
  informational: {
    id: 'informational',
    label: '信息型',
    labelEn: 'Informational',
    icon: 'ℹ️',
    description: '用户想了解某个概念、流程或知识',
    patterns: [
      /^what\s/i, /^how\s/i, /^why\s/i, /^when\s/i, /^where\s/i, /^who\s/i,
      /^is\s/i, /^are\s/i, /^does\s/i, /^do\s/i, /^can\s/i,
      /是什么/, /怎么/, /如何/, /为什么/, /什么是/, /教程/, /指南/, /入门/,
      /meaning/i, /definition/i, /explain/i, /guide/i, /tutorial/i, /introduction/i,
      /了解/, /学习/, /知识/, /原理/, /概念/,
    ],
    serpFeatures: {
      aiOverview: 'high',
      featuredSnippet: 'high',
      faq: 'medium',
      video: 'medium',
      knowledgePanel: 'medium',
    },
    aiCitationPreference: ['definition', 'steps', 'data'],
    topPageTypes: [
      { type: 'blog', label: '博客/文章', probability: 'high' },
      { type: 'guide', label: '指南/教程', probability: 'high' },
      { type: 'wiki', label: '百科/知识库', probability: 'medium' },
    ],
    userRealQuestion: (kw) => `用户想全面理解"${kw}"的定义、背景和运作方式`,
  },

  comparative: {
    id: 'comparative',
    label: '比较型',
    labelEn: 'Comparative',
    icon: '⚖️',
    description: '用户想在多个选项中做出选择',
    patterns: [
      /\bvs\.?\b/i, /\bversus\b/i, /comparison/i, /compare/i,
      /\bbest\b/i, /\btop\s*\d+/i, /\breview/i, /\brating/i,
      /比较/, /哪个好/, /推荐/, /对比/, /排名/, /选择/, /区别/, /差异/,
      /alternative/i, /替代/, /竞品/,
    ],
    serpFeatures: {
      aiOverview: 'high',
      featuredSnippet: 'medium',
      faq: 'low',
      video: 'low',
      knowledgePanel: 'low',
    },
    aiCitationPreference: ['comparison_table', 'data', 'pros_cons'],
    topPageTypes: [
      { type: 'comparison', label: '对比评测页', probability: 'high' },
      { type: 'review', label: '评测/测评', probability: 'high' },
      { type: 'aggregator', label: '聚合/排名页', probability: 'medium' },
    ],
    userRealQuestion: (kw) => `用户想知道"${kw}"中哪个选项最适合自己的需求`,
  },

  transactional: {
    id: 'transactional',
    label: '交易型',
    labelEn: 'Transactional',
    icon: '💳',
    description: '用户想完成购买、注册或下载等行动',
    patterns: [
      /\bbuy\b/i, /\bprice\b/i, /\bpurchase\b/i, /\border\b/i,
      /\bsubscribe\b/i, /\bsign\s*up\b/i, /\bregister\b/i,
      /\bcost\b/i, /\bfee\b/i, /\bcheap\b/i, /\bdiscount\b/i, /\bdeal\b/i,
      /开户/, /注册/, /购买/, /下载/, /下单/, /充值/, /入金/,
      /价格/, /费用/, /多少钱/, /怎么买/, /优惠/, /折扣/,
    ],
    serpFeatures: {
      aiOverview: 'low',
      featuredSnippet: 'low',
      faq: 'low',
      video: 'very_low',
      knowledgePanel: 'low',
    },
    aiCitationPreference: ['pricing_data', 'product_specs', 'reviews'],
    topPageTypes: [
      { type: 'product', label: '产品页', probability: 'high' },
      { type: 'landing', label: '落地页', probability: 'high' },
      { type: 'ecommerce', label: '电商/交易页', probability: 'medium' },
    ],
    userRealQuestion: (kw) => `用户已有购买/行动意向，想找到"${kw}"的最佳交易路径`,
  },

  navigational: {
    id: 'navigational',
    label: '操作型',
    labelEn: 'Navigational',
    icon: '🧭',
    description: '用户想找到特定页面或完成特定操作',
    patterns: [
      /\blogin\b/i, /\bsign\s*in\b/i, /\blog\s*in\b/i,
      /\bapp\b/i, /\bdownload\b/i, /\bsettings?\b/i, /\baccount\b/i,
      /官网/, /登录/, /客服/, /联系/, /电话/, /地址/,
      /\bofficial\b/i, /\bcontact\b/i, /\bsupport\b/i, /\bhelp\b/i,
    ],
    serpFeatures: {
      aiOverview: 'very_low',
      featuredSnippet: 'low',
      faq: 'very_low',
      video: 'very_low',
      knowledgePanel: 'high',
    },
    aiCitationPreference: ['steps', 'screenshots'],
    topPageTypes: [
      { type: 'official', label: '官方页面', probability: 'high' },
      { type: 'support', label: '帮助/支持页', probability: 'high' },
      { type: 'help', label: '教程/FAQ', probability: 'medium' },
    ],
    userRealQuestion: (kw) => `用户想直接到达"${kw}"的目标页面或完成特定操作步骤`,
  },
};

// === Classify a keyword into intent type ===
export function classifyIntent(keyword) {
  const kw = keyword.trim().toLowerCase();
  const scores = {};

  for (const [intentId, intent] of Object.entries(INTENT_TYPES)) {
    let matchCount = 0;
    for (const pattern of intent.patterns) {
      if (pattern.test(kw)) matchCount++;
    }
    scores[intentId] = matchCount;
  }

  // Find best match
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const bestId = sorted[0][1] > 0 ? sorted[0][0] : 'informational'; // Default to informational
  const intent = INTENT_TYPES[bestId];

  return {
    type: bestId,
    label: intent.label,
    labelEn: intent.labelEn,
    icon: intent.icon,
    confidence: sorted[0][1] > 1 ? 'high' : sorted[0][1] === 1 ? 'medium' : 'low',
    description: intent.description,
    userRealQuestion: intent.userRealQuestion(keyword),
    serpFeatures: intent.serpFeatures,
    aiCitationPreference: intent.aiCitationPreference,
    topPageTypes: intent.topPageTypes,
  };
}

// === AI Citation Content Structure Requirements ===
export const AI_CITATION_STRUCTURES = {
  definition: {
    id: 'definition',
    label: '定义类内容',
    icon: '📖',
    description: 'AI 优先提取"X is/refers to..."格式的简洁定义',
    requires: [
      'H2 后紧跟 30-60 词直接定义段落',
      '使用 "X is..." / "X refers to..." / "X 是指..." 句式',
      '首段即给出核心定义，不绕弯',
    ],
    detectPatterns: [
      /\bis\s+(defined?\s+as|a|an|the)\b/i,
      /\brefers?\s+to\b/i,
      /\bmeans?\s+that\b/i,
      /是指/, /定义为/, /指的是/, /简单来说/,
    ],
    htmlTemplate: `<h2>[关键词] 是什么？</h2>
<p>[关键词] 是 [30-60词的直接定义，包含核心概念、作用和适用场景]。</p>`,
  },

  steps: {
    id: 'steps',
    label: '步骤类内容',
    icon: '📝',
    description: 'AI 优先提取带编号的操作步骤',
    requires: [
      '有序列表 (ol) 或 H3 子步骤',
      '每步 ≤80 词，聚焦单一操作',
      '步骤间有逻辑递进关系',
    ],
    detectPatterns: [
      /step\s*\d/i, /第[一二三四五六七八九十\d]步/,
      /\b(first|second|third|next|then|finally)\b/i,
      /步骤/, /流程/, /操作指南/,
    ],
    htmlTemplate: `<h2>如何 [操作]（分步指南）</h2>
<ol>
  <li><strong>步骤 1：[标题]</strong> — [具体操作说明，≤80词]</li>
  <li><strong>步骤 2：[标题]</strong> — [具体操作说明]</li>
  <li><strong>步骤 3：[标题]</strong> — [具体操作说明]</li>
</ol>`,
  },

  data: {
    id: 'data',
    label: '数据类内容',
    icon: '📊',
    description: 'AI 优先引用包含统计数字和来源标注的内容',
    requires: [
      '具体数字、百分比或金额',
      '标注数据来源（如 "according to..."）',
      '用表格或列表呈现数据集',
    ],
    detectPatterns: [
      /\d+%/, /\$\d/, /\d+\.\d+/,
      /according\s+to/i, /source:/i, /data\s+show/i,
      /billion/i, /million/i, /亿/, /万/,
      /根据/, /数据显示/, /统计/, /报告/,
    ],
    htmlTemplate: `<h2>[主题] 关键数据</h2>
<ul>
  <li><strong>[指标 1]</strong>: [具体数字]（来源: [权威机构], [年份]）</li>
  <li><strong>[指标 2]</strong>: [具体数字]（来源: [权威机构]）</li>
</ul>`,
  },

  comparison_table: {
    id: 'comparison_table',
    label: '对比表格内容',
    icon: '📋',
    description: 'AI 优先提取结构化对比表格',
    requires: [
      'HTML <table> 标签',
      '≥3 列对比维度',
      '≥2 行对比对象',
      '清晰的表头',
    ],
    detectPatterns: [
      /<table/i, /\|.*\|.*\|/,
    ],
    htmlTemplate: `<h2>[对比主题] 对比</h2>
<table>
  <thead>
    <tr><th>特性</th><th>[选项A]</th><th>[选项B]</th><th>[选项C]</th></tr>
  </thead>
  <tbody>
    <tr><td>[维度1]</td><td>[值]</td><td>[值]</td><td>[值]</td></tr>
    <tr><td>[维度2]</td><td>[值]</td><td>[值]</td><td>[值]</td></tr>
    <tr><td>[维度3]</td><td>[值]</td><td>[值]</td><td>[值]</td></tr>
  </tbody>
</table>`,
  },

  pros_cons: {
    id: 'pros_cons',
    label: '优缺点列表',
    icon: '✅',
    description: 'AI 优先提取结构化的优缺点对比',
    requires: [
      '并列无序列表 (ul)',
      '使用 ✅/❌ 或 优点/缺点 标记',
      '每点 ≤30 词',
    ],
    detectPatterns: [
      /pros?\s*(and|&)\s*cons?/i, /advantage/i, /disadvantage/i,
      /优点/, /缺点/, /优势/, /劣势/, /好处/, /坏处/,
    ],
    htmlTemplate: `<h2>[主题] 优缺点</h2>
<div class="pros-cons">
  <div class="pros">
    <h3>✅ 优点</h3>
    <ul>
      <li>[优点1，≤30词]</li>
      <li>[优点2]</li>
    </ul>
  </div>
  <div class="cons">
    <h3>❌ 缺点</h3>
    <ul>
      <li>[缺点1，≤30词]</li>
      <li>[缺点2]</li>
    </ul>
  </div>
</div>`,
  },

  pricing_data: {
    id: 'pricing_data',
    label: '价格/费用数据',
    icon: '💰',
    description: 'AI 提取结构化的价格表和费率信息',
    requires: [
      '结构化价格表或费率列表',
      '标注货币单位',
      '包含 FinancialProduct Schema（YMYL 增强）',
    ],
    detectPatterns: [
      /price/i, /cost/i, /fee/i, /rate/i, /pricing/i,
      /\$\d/, /€\d/, /¥\d/,
      /价格/, /费用/, /汇率/, /手续费/, /月费/,
    ],
    htmlTemplate: `<h2>[产品/服务] 费用</h2>
<table>
  <thead><tr><th>项目</th><th>费用</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td>[项目1]</td><td>[金额 + 货币]</td><td>[条件说明]</td></tr>
    <tr><td>[项目2]</td><td>[金额]</td><td>[说明]</td></tr>
  </tbody>
</table>`,
  },

  product_specs: {
    id: 'product_specs',
    label: '产品规格',
    icon: '🏷️',
    description: 'AI 提取产品关键参数和规格',
    requires: [
      '规格表格或定义列表',
      'Product/FinancialProduct Schema',
      '关键参数高亮',
    ],
    detectPatterns: [
      /specification/i, /feature/i, /parameter/i,
      /规格/, /参数/, /功能/, /配置/,
    ],
    htmlTemplate: `<h2>[产品名] 核心功能</h2>
<table>
  <tbody>
    <tr><th>[参数1]</th><td>[值]</td></tr>
    <tr><th>[参数2]</th><td>[值]</td></tr>
  </tbody>
</table>`,
  },
};

// === SERP Feature Probability Labels ===
export const SERP_PROBABILITY_LABELS = {
  high: { label: '高概率', color: 'var(--accent-green)', icon: '🟢' },
  medium: { label: '中等概率', color: 'var(--accent-gold)', icon: '🟡' },
  low: { label: '低概率', color: 'var(--accent-orange)', icon: '🟠' },
  very_low: { label: '极低概率', color: 'var(--text-muted)', icon: '⚪' },
};

// === Fintech-specific YMYL enhancement rules ===
export const FINTECH_INTENT_ENHANCEMENTS = {
  triggerKeywords: [
    /invest/i, /trading/i, /stock/i, /crypto/i, /bitcoin/i, /forex/i,
    /remittance/i, /transfer/i, /payment/i, /bank/i, /loan/i, /credit/i,
    /投资/, /理财/, /股票/, /基金/, /加密/, /比特币/, /外汇/,
    /汇款/, /转账/, /支付/, /贷款/, /信用/, /保险/, /开户/,
  ],
  additionalChecks: [
    { id: 'risk_disclosure', label: '风险提示', pattern: /risk\s*(warning|disclosure)|风险提示|投资有风险/i },
    { id: 'regulatory', label: '监管信息', pattern: /FCA|SEC|CFTC|SFC|MAS|ASIC|regulated|licensed|持牌|监管/i },
    { id: 'disclaimer', label: '免责声明', pattern: /disclaimer|免责声明|not\s+financial\s+advice/i },
  ],
};
