import { fetchUrl } from './fetcher.js';

/**
 * Lightweight frontend BFS spider to gather internal link topology
 * @param {string} rootUrl - Starting URL
 * @param {number} maxDepth - Max click depth
 * @param {number} maxPages - Max pages to crawl (prevent browser crash)
 * @param {Function} onProgress - Callback for UI updates
 * @returns {Promise<{nodes, edges, stats}>}
 */
export async function crawlLightweightSite(rootUrl, maxDepth = 1, maxPages = 40, onProgress = () => {}) {
  const visited = new Set();
  const queue = [{ url: normalizeUrl(rootUrl), depth: 0 }];
  
  const nodes = [];
  const edges = [];
  const parsedMap = new Map(); // url -> { title, inlinks, outlinks, status }

  let baseHost;
  try {
    baseHost = new URL(rootUrl).hostname;
  } catch(e) {
    throw new Error('Invalid Root URL');
  }

  // Pre-seed the root node
  visited.add(queue[0].url);

  while (queue.length > 0 && parsedMap.size < maxPages) {
    const current = queue.shift();
    
    onProgress(`Crawling: ${current.url} (${parsedMap.size + 1}/${maxPages})`);
    
    try {
      const htmlText = await fetchUrl(current.url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      const title = doc.querySelector('title')?.textContent || 'No Title';
      
      const outgoingLinks = new Set();
      doc.querySelectorAll('a[href]').forEach(a => {
        let href = a.getAttribute('href');
        if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        
        try {
          const absoluteUrl = new URL(href, current.url);
          // Only crawl internal links (same hostname logic, simplistic)
          if (absoluteUrl.hostname.includes(baseHost) || baseHost.includes(absoluteUrl.hostname)) {
            const cleanUrl = normalizeUrl(absoluteUrl.href);
            outgoingLinks.add(cleanUrl);
            
            // Add to edges
            edges.push({ from: current.url, to: cleanUrl });
          }
        } catch(e) { /* ignore malformed href */}
      });

      parsedMap.set(current.url, { 
        id: current.url,
        title, 
        depth: current.url === rootUrl ? 0 : current.depth,
        outgoing: Array.from(outgoingLinks)
      });

      // Add to queue if depth limit not reached
      if (current.depth < maxDepth) {
        for (const outUrl of outgoingLinks) {
          if (!visited.has(outUrl)) {
            visited.add(outUrl);
            queue.push({ url: outUrl, depth: current.depth + 1 });
          }
        }
      }

    } catch (error) {
      console.warn(`Failed to crawl ${current.url}:`, error);
      parsedMap.set(current.url, {
        id: current.url,
        title: 'Error / Timeout',
        depth: current.depth,
        status: 500,
        outgoing: []
      });
    }
  }

  // Build final nodes formatting for vis-network
  parsedMap.forEach((data, url) => {
    nodes.push({
      id: url,
      label: new URL(url).pathname || '/',
      title: `${data.title}\n(${url})`,
      group: data.depth === 0 ? 'root' : data.status === 500 ? 'error' : 'page',
      value: data.depth === 0 ? 30 : 10 // size based on depth
    });
  });

  // Calculate Inlinks per node to identify orphans or hubs
  const inlinkCounts = {};
  edges.forEach(e => {
    inlinkCounts[e.to] = (inlinkCounts[e.to] || 0) + 1;
  });

  nodes.forEach(n => {
    n.inlinks = inlinkCounts[n.id] || 0;
    // Boost size for hubs
    if (n.inlinks > 5 && n.group !== 'root') n.value += (n.inlinks * 2);
  });

  return { 
    nodes, 
    edges,
    stats: {
      crawled: parsedMap.size,
      discovered: visited.size
    }
  };
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = ''; // Remove fragment
    return u.href.replace(/\/$/, ''); // Remove trailing slash
  } catch(e) {
    return url;
  }
}
