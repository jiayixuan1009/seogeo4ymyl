// ===== SEOGEO4YMYL — Constants & Configuration =====

// === AI Crawler List (2026) ===
export const AI_CRAWLERS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'Google-Extended', 'Googlebot-News',
  'anthropic-ai', 'ClaudeBot',
  'CCBot', 'Bytespider',
  'Applebot-Extended', 'PerplexityBot',
  'YouBot', 'Cohere-ai',
  'Meta-ExternalAgent', 'Meta-ExternalFetcher',
];

// === Module Registry (13 modules + optimization engine) ===
export const MODULES = [
  { id: 'technical',          name: '技术 SEO',        nameEn: 'Technical SEO',        icon: '🔧', weight: 0.12, requiredResources: ['html', 'robots', 'sitemap', 'llms'] },
  { id: 'onpage',             name: '页面 SEO',        nameEn: 'On-Page SEO',          icon: '📄', weight: 0.11, requiredResources: ['html'] },
  { id: 'content',            name: '内容 SEO',        nameEn: 'Content SEO',          icon: '📝', weight: 0.14, requiredResources: ['html'] },
  { id: 'geo',                name: 'GEO 优化',        nameEn: 'GEO Optimization',     icon: '🤖', weight: 0.18, requiredResources: ['html', 'llms'] },
  { id: 'structured-data',    name: '结构化数据',      nameEn: 'Structured Data',      icon: '📋', weight: 0.10, requiredResources: ['html'] },
  { id: 'performance',        name: '性能',            nameEn: 'Performance',          icon: '⚡', weight: 0.06, requiredResources: ['html'] },
  { id: 'offpage',            name: '站外信号',        nameEn: 'Off-Page Signals',     icon: '🌐', weight: 0.05, requiredResources: ['html'] },
  { id: 'domain-authority',   name: '域名权威',        nameEn: 'Domain Authority',     icon: '🏛️', weight: 0.05, requiredResources: ['html', 'robots'] },
  { id: 'fintech-compliance', name: 'Fintech 合规',    nameEn: 'Fintech Compliance',   icon: '💰', weight: 0.11, requiredResources: ['html'] },
  { id: 'ai-citation',        name: 'AI 引用就绪度',   nameEn: 'AI Citation Readiness', icon: '🎯', weight: 0.08, requiredResources: ['html'] },
];

// === Persona Definitions ===
export const PERSONAS = [
  { id: 'balanced',       name: '⚖️ 均衡模式',        nameEn: 'Balanced',           weightOverrides: {} },
  { id: 'fintech-officer', name: '🏦 Fintech 合规官',  nameEn: 'Fintech Compliance', weightOverrides: { 'fintech-compliance': 1.25, content: 1.15 } },
  { id: 'geo-optimizer',  name: '🤖 GEO 优化师',       nameEn: 'GEO Optimizer',      weightOverrides: { geo: 1.20, 'ai-citation': 1.20 } },
  { id: 'tech-engineer',  name: '🔧 技术 SEO 工程师',  nameEn: 'Tech Engineer',      weightOverrides: { technical: 1.25, performance: 1.15 } },
  { id: 'content-strategist', name: '📝 内容策略师',    nameEn: 'Content Strategist', weightOverrides: { content: 1.25, geo: 1.15 } },
  { id: 'ai-strategist',  name: '🔥 AI Overview 策略师', nameEn: 'AI Strategist',    weightOverrides: { 'ai-citation': 1.30, geo: 1.20 } },
];

// === YMYL Sensitive Terms ===
export const YMYL_MISLEADING_EN = [
  'guaranteed returns', 'risk-free', 'no risk', 'get rich', 'easy money',
  'guaranteed profit', 'zero risk', '100% safe', 'guaranteed income',
  'never lose', 'always win', 'free money', 'instant wealth',
];

export const YMYL_MISLEADING_ZH = [
  '保证收益', '零风险', '稳赚不赔', '保本保息', '无风险投资',
  '躺赚', '稳定盈利', '保底收益', '必赚', '零损失',
];

// === AI Content Supervision Keywords ===
export const AI_SUPERVISION_POSITIVE = [
  'editorial standards', 'reviewed by', 'fact-checked by', 'verified by',
  'edited by', 'medically reviewed', 'financially reviewed',
  '编辑审核', '经审核', '事实核查',
];

export const AI_TRANSPARENCY = [
  'AI-assisted', 'written with AI', 'AI-generated content disclosure',
  'AI辅助', 'AI参与创作',
];

// === Fintech Compliance Keywords ===
export const FINTECH_REGULATION = [
  'FCA', 'SEC', 'CFTC', 'SFC', 'MAS', 'ASIC',
  'license', 'licensed', 'regulated', 'registration number',
];

export const FINTECH_RISK_DISCLOSURE = [
  'risk warning', 'capital at risk', '风险提示', '投资有风险',
  'risk disclosure', 'may lose', 'past performance',
];

// === Readiness Labels ===
export const READINESS_LABELS = {
  AI_FIRST:    { label: '🟢 AI-First Ready',          color: 'var(--accent-green)' },
  TRADITIONAL: { label: '🔵 Traditional SEO Strong',   color: 'var(--accent-blue)' },
  NEEDS_WORK:  { label: '🟡 Needs Modernization',      color: 'var(--accent-gold)' },
};


// === CORS Proxy Configuration ===
// NOTE: 后续接阿里云服务器时，在此数组最前面插入私有代理地址即可切换，无需改其他代码。
// 示例: { name: 'private', url: (u) => `https://YOUR_ALIYUN_PROXY/fetch?url=${encodeURIComponent(u)}` }
export const CORS_PROXIES = [
  { name: 'private-node', url: (u) => `/api/proxy?url=${encodeURIComponent(u)}` }, // 本地与阿里云专属私有后端代理
];

export const FETCH_TIMEOUT_MS = 10000;
export const MAX_CONCURRENT_REQUESTS = 4;
