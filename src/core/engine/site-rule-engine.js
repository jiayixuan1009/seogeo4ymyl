// ===== SEOGEO4YMYL — Site-Level Rule Engine (v2) =====
// Covers: Orphan/Broken/Depth (original) + 15+ new On-Page & Technical SEO rules

/**
 * @param {Object[]} nodes  - Normalized nodes from csv-parser / spider
 * @param {Object[]} edges  - Edge list (may be empty for CSV mode)
 * @param {Object}   insights - Pre-computed aggregate stats from csv-parser
 * @returns {Object[]} actions - Prioritized action list
 */
export function analyzeSiteData(nodes, edges, insights) {
  const actions = [];

  // ─── 0. Guard ───────────────────────────────────────────────────────────────
  if (!nodes || nodes.length === 0) return actions;

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function urlList(arr, max = 15) {
    return arr.slice(0, max).map(n => (typeof n === 'string' ? n : n.url || n.id));
  }

  function action(priority, category, title, importance, riskOfNotDoing, benefitOfDoing, actionText, list = []) {
    return { execPriority: priority, category, title, importance, riskOfNotDoing, benefitOfDoing, action: actionText, list };
  }

  // ─── P0 CRITICAL ──────────────────────────────────────────────────────────────

  // R01: Orphan pages
  const orphans = nodes.filter(n => n.group === 'orphan' || (n.inlinks === 0 && n.statusCode === 200));
  if (orphans.length > 0) {
    actions.push(action(
      'P0', 'structure',
      `🔴 发现 ${orphans.length} 个孤岛页面 (Orphan Pages)`,
      '没有任何内部链接的页面，爬虫无法发现，PageRank 无法传入。',
      '这些页面几乎不会出现在搜索结果中，即使内容很好。',
      '建立内部链接后可快速提升收录率和权重分配效率。',
      '前往高权重分类页 / 首页，添加指向这些页面的锚文本链接。',
      urlList(orphans),
    ));
  }

  // R02: Broken internal links (404 with inlinks)
  const broken = nodes.filter(n => n.group === 'error' || (n.statusCode === 404 && n.inlinks > 0));
  if (broken.length > 0) {
    actions.push(action(
      'P0', 'structure',
      `🔴 发现 ${broken.length} 个内部死链 (404 with Inlinks)`,
      '含有 404 响应的内部链接会直接消耗爬虫配额并损害用户体验。',
      '影响爬虫抓取效率，流失用户，搜索引擎可能降低信任度。',
      '修复后可立即释放爬虫配额，恢复页面权重传导。',
      '批量替换或删除指向 404 URL 的 <a> 标签，或设置 301 重定向到对应页面。',
      urlList(broken),
    ));
  }

  // R03: Missing Title
  if (insights.missingTitle > 0) {
    const missing = nodes.filter(n => !n.title && n.statusCode === 200);
    actions.push(action(
      'P0', 'onpage',
      `🔴 ${insights.missingTitle} 个页面缺少 <title> 标签`,
      'Title 是搜索引擎最重要的 on-page 信号，缺失会导致 Google 自动生成一个往往不准确的标题。',
      '点击率低，搜索排名受损，品牌一致性差。',
      '设置精准 title 可直接提升 CTR 和关键词覆盖。',
      '为每个没有 title 的页面添加唯一的、含核心关键词的 <title>（推荐 50-60 字符）。',
      urlList(missing),
    ));
  }

  // R04: Duplicate Title
  if (insights.dupTitleCount > 0) {
    const dupUrls = insights.dupTitleGroups.flatMap(([, urls]) => urls);
    actions.push(action(
      'P0', 'onpage',
      `🔴 ${insights.dupTitleCount} 个页面存在重复 Title（${insights.dupTitleGroups.length} 组）`,
      '重复 title 使搜索引擎无法区分页面主题，导致关键词自相竞争（Keyword Cannibalization）。',
      '多个页面争抢同一关键词排名，整体流量下降。',
      '每个页面的 title 唯一化后，可精准控制各页面的目标关键词。',
      '为每个重复组内的页面分别撰写包含各自核心关键词的唯一 title。',
      urlList(dupUrls),
    ));
  }

  // R05: Missing H1
  if (insights.missingH1 > 0) {
    const missing = nodes.filter(n => (!n.h1 || n.h1Count === 0) && n.statusCode === 200);
    actions.push(action(
      'P0', 'onpage',
      `🔴 ${insights.missingH1} 个页面缺少 H1 标签`,
      'H1 是页面最核心的主题声明，缺失会降低内容结构得分。',
      '搜索引擎无法准确理解页面主题，排名受损。',
      '添加 H1 可增强关键词关联度和 EEAT 内容结构分。',
      '为每个页面添加包含核心关键词的唯一 <h1> 标签（每页只保留一个）。',
      urlList(missing),
    ));
  }

  // R06: Non-self Canonical (canonical 指向不同 URL)
  if (insights.nonCanonical > 0) {
    const ncPages = nodes.filter(n => n.canonical && n.canonical !== n.url);
    actions.push(action(
      'P0', 'technical',
      `🔴 ${insights.nonCanonical} 个页面 Canonical 指向其他 URL`,
      'Canonical 声明告诉 Google 这些页面不是"正版"，页面权重将全部转移到目标 URL，当前页面不会被收录排名。',
      '页面实际上不会获得搜索流量，内容投入被浪费。',
      '确认后若为有意为之（如 URL 参数页）可保留；若错误指向则立即修复。',
      '审查这些页面的 <link rel="canonical"> 标签，确认指向是否符合意图。',
      urlList(ncPages),
    ));
  }

  // ─── P1 HIGH ─────────────────────────────────────────────────────────────────

  // R07: Long Title (> 60 chars)
  if (insights.longTitle > 0) {
    const longT = nodes.filter(n => n.titleLen !== null && n.titleLen > 60);
    actions.push(action(
      'P1', 'onpage',
      `🟠 ${insights.longTitle} 个页面的 Title 超过 60 字符（截断风险）`,
      'Google 搜索结果中 Title 超过约 600px（约 60 英文字符 / 30 中文字符）会被截断显示，影响 CTR。',
      '搜索结果中 Title 显示不完整，关键信息被隐藏，点击率降低。',
      '控制 title 长度可提高展示完整度，改善点击率。',
      '将超长 title 精简到 50-60 字符内，核心关键词放在前面。',
      urlList(longT),
    ));
  }

  // R08: Missing Meta Description
  if (insights.missingDesc > 0) {
    const missing = nodes.filter(n => !n.description && n.statusCode === 200);
    actions.push(action(
      'P1', 'onpage',
      `🟠 ${insights.missingDesc} 个页面缺少 Meta Description`,
      'Meta Description 虽不直接影响排名，但影响搜索摘要展示和点击率。缺失时 Google 会自动抓取正文片段，往往质量很差。',
      '自动生成的摘要吸引力低，点击率下降。',
      '好的 Description 可将 CTR 提升 5-20%。',
      '为每个关键页面写 120-160 字符、包含主关键词和 CTA 的 description。',
      urlList(missing),
    ));
  }

  // R09: Duplicate Meta Description
  if (insights.dupDescCount > 0) {
    const dupUrls = insights.dupDescGroups.flatMap(([, urls]) => urls);
    actions.push(action(
      'P1', 'onpage',
      `🟠 ${insights.dupDescCount} 个页面存在重复 Meta Description（${insights.dupDescGroups.length} 组）`,
      '描述重复意味着所有页面在 SERP 展示的摘要相同，无法差异化吸引用户。',
      '用户无法根据摘要区分页面价值，点击率整体偏低。',
      '每页定制 description 可分别针对不同搜索意图吸引目标用户。',
      '为每组重复 description 的页面，分别撰写体现独特内容价值的摘要。',
      urlList(dupUrls),
    ));
  }

  // R10: Duplicate H1
  if (insights.dupH1Count > 0) {
    const dupUrls = insights.dupH1Groups.flatMap(([, urls]) => urls);
    actions.push(action(
      'P1', 'onpage',
      `🟠 ${insights.dupH1Count} 个页面存在重复 H1（${insights.dupH1Groups.length} 组）`,
      '不同页面使用相同 H1 会加剧关键词竞争，搜索引擎难以区分这些页面的差异化价值。',
      '排名分散，单页权重不集中。',
      '差异化 H1 后，各页面可更好地聚焦各自的长尾关键词。',
      '为每组重复 H1 的页面，分别改写体现独特主题的 H1。',
      urlList(dupUrls),
    ));
  }

  // R11: Thin content (< 300 words)
  if (insights.thinContent > 0) {
    const thin = nodes.filter(n => n.wordCount !== null && n.wordCount < 300 && n.statusCode === 200);
    actions.push(action(
      'P1', 'content',
      `🟠 ${insights.thinContent} 个页面内容过薄（< 300 词）`,
      'Google Helpful Content 更新明确降权"内容量少、价值低"的页面。300 词以下的页面很难覆盖完整的搜索意图。',
      '页面被判定为"低价值"，排名被抑制或被驱逐出索引。',
      '扩充内容后，页面可覆盖更多 NLP/语义信号，提升相关性得分。',
      '对关键转化页面，将内容扩充至 500 词以上，并加入 FAQ / 详细说明 / 数据。',
      urlList(thin),
    ));
  }

  // R12: Noindex pages that have inlinks (wasted crawl budget)
  if (insights.noindexWithInlinks > 0) {
    const noindexLinked = nodes.filter(n => !n.isIndexable && n.inlinks > 0);
    actions.push(action(
      'P1', 'technical',
      `🟠 ${insights.noindexWithInlinks} 个 Noindex 页面仍有内部链接指向`,
      '其他页面链接到 Noindex 页面，浪费爬虫配额，且这些链接传导的权重"消失"了。',
      '爬虫配额被无效消耗，内部链接图结构不健康。',
      '移除指向 Noindex 页面的链接，将链接权重引导至可索引的重要页面。',
      '在 Noindex 页面的上游页面中删除或替换指向它们的 <a> 链接。',
      urlList(noindexLinked),
    ));
  }

  // R13: Deep pages (Crawl Depth >= 4)
  if (insights.deepPages > 0) {
    const deepPageList = nodes.filter(n => n.crawlDepth !== null && n.crawlDepth >= 4);
    actions.push(action(
      'P1', 'structure',
      `🟠 ${insights.deepPages} 个页面层级过深（点击深度 ≥ 4）`,
      '距首页超过 3 次点击的页面很难获得 PageRank 传导，爬虫抓取频率也更低。',
      '核心转化页因层级深而排名受阻。',
      '扁平化架构后，权重可快速流向重要页面。',
      '在首页或二级分类页增加直接指向这些深层页面的聚合链接 / 导航入口。',
      urlList(deepPageList),
    ));
  }

  // ─── P2 MEDIUM ────────────────────────────────────────────────────────────────

  // R14: Slow pages (Response Time > 3000ms)
  if (insights.slowPages > 0) {
    const slow = nodes.filter(n => n.responseTime !== null && n.responseTime > 3000);
    actions.push(action(
      'P2', 'technical',
      `🟡 ${insights.slowPages} 个页面响应时间 > 3000ms`,
      '慢速响应影响 Core Web Vitals（TTFB），Google 将页面速度作为排名因子之一。',
      '用户跳出率升高，排名缓慢下滑。',
      '优化后可改善 CWV 指标，提升搜索排名和用户体验。',
      '检查服务器响应时间、启用缓存、使用 CDN、压缩资源。',
      urlList(slow),
    ));
  }

  // R15: Heavy pages (Size > 1MB)
  if (insights.heavyPages > 0) {
    const heavy = nodes.filter(n => n.size !== null && n.size > 1024 * 1024);
    actions.push(action(
      'P2', 'technical',
      `🟡 ${insights.heavyPages} 个页面体积超过 1MB`,
      '过大的页面体积增加加载时间，影响移动端体验和 Core Web Vitals。',
      '移动端加载时间延长，用户放弃率升高。',
      '减少页面体积可直接提升 LCP 指标。',
      '压缩图片（WebP）、移除未使用的 CSS/JS、审查内联资源。',
      urlList(heavy),
    ));
  }

  // R16: Long Meta Description (> 160 chars)
  if (insights.longDesc > 0) {
    const longD = nodes.filter(n => n.descLen !== null && n.descLen > 160);
    actions.push(action(
      'P2', 'onpage',
      `🟡 ${insights.longDesc} 个页面 Meta Description 超过 160 字符`,
      '过长的 description 会被搜索引擎截断，让用户看不到完整摘要信息。',
      'SERP 展示不完整，最后的 CTA 文案被截掉。',
      '控制长度后，摘要在各设备上均可完整展示，提升 CTR。',
      '将 Meta Description 精简到 120-160 字符，核心信息放在前面。',
      urlList(longD),
    ));
  }

  // R17: Pages with missing image alt text
  if (insights.missingImgAlt > 0) {
    const altMissing = nodes.filter(n => n.imgMissingAlt > 0);
    actions.push(action(
      'P2', 'onpage',
      `🟡 ${insights.missingImgAlt > 1 ? insights.missingImgAlt + ' 个' : ''}页面含无 Alt 文本的图片`,
      '图片缺少 alt 属性，搜索引擎无法理解图片内容，也影响无障碍访问（Accessibility）得分。',
      '错失图片搜索流量，Lighthouse 无障碍评分下降。',
      '添加 alt 文本后可获得额外的图片搜索流量入口。',
      '为所有 <img> 标签添加描述性 alt 属性，包含相关关键词（避免堆砌）。',
      urlList(altMissing),
    ));
  }

  // ─── Fallback ─────────────────────────────────────────────────────────────────
  if (actions.length === 0 && nodes.length > 0) {
    actions.push({
      execPriority: 'P2',
      category: 'general',
      title: '✅ 网站 SEO 基础健康，未发现重大问题',
      action: '当前批次数据未发现 Critical 或 High 级别的 SEO 问题。建议继续追踪内容质量和 Core Web Vitals 指标。',
      importance: '', riskOfNotDoing: '', benefitOfDoing: '',
      list: [],
    });
  }

  // Sort: P0 → P1 → P2
  const priority = { P0: 0, P1: 1, P2: 2 };
  actions.sort((a, b) => (priority[a.execPriority] ?? 9) - (priority[b.execPriority] ?? 9));

  return actions;
}
