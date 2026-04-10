import Papa from 'papaparse';

/**
 * Parses a Screaming Frog Internal HTML Export CSV
 * Extracs core architectural signals
 * @param {File} file 
 * @returns {Promise<{nodes, edges, insights}>}
 */
export function parseScreamingFrogCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data;
          const nodes = [];
          const edges = [];
          let orphanCount = 0;
          let brokenCount = 0;

          data.forEach(row => {
            const url = row['Address'] || row['URL'];
            if (!url) return;

            const statusCode = parseInt(row['Status Code']) || 200;
            const inlinks = parseInt(row['Inlinks']) || 0;
            const title = row['Title 1'] || 'No Title';

            if (statusCode === 404 && inlinks > 0) brokenCount++;
            if (inlinks === 0 && statusCode === 200) orphanCount++;

            nodes.push({
              id: url,
              label: new URL(url).pathname || '/',
              title: `${title}\n(${url})\nInlinks: ${inlinks}`,
              group: statusCode === 404 ? 'error' : inlinks === 0 ? 'orphan' : 'page',
              value: inlinks > 0 ? (inlinks * 2) + 10 : 10,
              // Keep raw row data for rule engine
              raw: row 
            });
          });

          // Screaming Frog "Internal HTML" CSV doesn't provide edges directly (that's in "All Inlinks.csv").
          // Since we are interpreting just the core list here, we rely purely on Nodes for the Rule Engine in CSV mode,
          // or we simulate links to root if we want it to look connected but it isn't real topology.
          // For real topology from SF, the user would need to upload the inlinks export, but here we just process nodes.

          resolve({
            nodes,
            edges: [], // CSV mode doesn't plot edges unless we parse "All Inlinks.csv", we just provide node stats.
            insights: {
              totalParsed: nodes.length,
              orphanCount,
              brokenCount
            }
          });
        } catch (e) {
          reject(new Error('CSV 格式解析失败，请确保您上传的是 Screaming Frog 导出的 Internal HTML CSV。'));
        }
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}
