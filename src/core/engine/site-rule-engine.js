// ===== SEOGEO4YMYL — Site-Level Rule Engine =====

export function analyzeSiteData(nodes, edges, insights) {
  const actions = [];
  
  const orphans = nodes.filter(n => n.group === 'orphan' || n.inlinks === 0);
  const broken = nodes.filter(n => n.group === 'error');
  
  // Rule 1: Orphan Pages
  if (orphans.length > 0) {
    actions.push({
      execPriority: 'P0',
      title: \`发现 \${orphans.length} 个孤岛页面 (Orphan Pages)\`,
      importance: '页面没有任何同站链接导入，搜索引擎爬虫无法发现，且无法传递权重。由于是单页抓取限制或是真正的孤岛。',
      riskOfNotDoing: '这些页面将几乎无法获得搜索流量',
      benefitOfDoing: '建立全站链接网可迅速提升这些隐藏页面的收录率',
      action: '前往这些页面并从相关的高权重分类页添加指向它的锚文本链接。',
      list: orphans.slice(0, 10).map(o => o.id) // Sample up to 10
    });
  }

  // Rule 2: Broken Internal Links
  if (broken.length > 0) {
    actions.push({
      execPriority: 'P0',
      title: \`发现 \${broken.length} 个内部死链 (Broken Inlinks)\`,
      importance: '含有 404 返回码的链接会严重伤害爬虫预算和用户的浏览体验。',
      riskOfNotDoing: '浪费爬虫抓取配额，流失用户',
      benefitOfDoing: '阻断“漏水”，引导向正确着陆页',
      action: '批量替换或移除指向 404 页面的 `<a>` 标签。',
      list: broken.slice(0, 10).map(o => o.id)
    });
  }

  // Rule 3: Depth / Crawlability
  const deepPages = nodes.filter(n => n.raw && parseInt(n.raw['Crawl Depth']) >= 4);
  if (deepPages.length > 0) {
    actions.push({
      execPriority: 'P1',
      title: \`发现 \${deepPages.length} 个过深层级页面 (Click Depth >= 4)\`,
      importance: '距离首页超过 3 次点击的页面很难被搜索引擎赋予高权重。',
      riskOfNotDoing: '核心转化页排名受阻',
      benefitOfDoing: '架构扁平化有助于权重迅速传导',
      action: '在首页增加侧边栏推荐，或者在二级分类页增加聚合链接。',
      list: deepPages.slice(0, 10).map(o => o.id)
    });
  }

  // Fallback Rule: Site Healthy
  if (actions.length === 0 && nodes.length > 0) {
    actions.push({
      execPriority: 'P2',
      title: '网站初级拓扑结构健康',
      action: '目前在此批数据内未发现重大孤岛或死链问题。',
      importance: '', riskOfNotDoing: '', benefitOfDoing: ''
    });
  }

  return actions;
}
