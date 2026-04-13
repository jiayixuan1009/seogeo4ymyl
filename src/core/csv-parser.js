import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Screaming Frog field mapping
 * Maps SF column names → normalized node property names
 */
const SF_FIELD_MAP = {
  url:             ['Address', 'URL'],
  statusCode:      ['Status Code'],
  indexability:    ['Indexability'],
  indexabilityStatus: ['Indexability Status'],
  title:           ['Title 1'],
  titleLen:        ['Title 1 Length'],
  titlePx:         ['Title 1 Pixel Width'],
  description:     ['Meta Description 1'],
  descLen:         ['Meta Description 1 Length'],
  descPx:          ['Meta Description 1 Pixel Width'],
  h1:              ['H1-1'],
  h1Count:         ['H1-1 Count', 'H1 Count'],
  h2:              ['H2-1'],
  h2Count:         ['H2-1 Count', 'H2 Count'],
  wordCount:       ['Word Count'],
  inlinks:         ['Inlinks'],
  outlinks:        ['Unique Outlinks', 'Outlinks'],
  crawlDepth:      ['Crawl Depth'],
  responseTime:    ['Response Time'],
  size:            ['Size'],
  canonical:       ['Canonical Link Element 1'],
  selfCanonical:   ['Self Canonical'],
  hreflang:        ['Hreflang 1', 'HREFLang'],
  imgMissingAlt:   ['Images Missing Alt Text', 'Missing Alt', 'Images Missing Alt'],
  contentType:     ['Content Type'],
  mimeType:        ['MIME Type'],
};

function getField(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
      return row[alias];
    }
  }
  return null;
}

function normalizeRow(row) {
  const url = getField(row, SF_FIELD_MAP.url);
  if (!url) return null;

  const statusCode   = parseInt(getField(row, SF_FIELD_MAP.statusCode))   || 200;
  const inlinks      = parseInt(getField(row, SF_FIELD_MAP.inlinks))       || 0;
  const crawlDepth   = parseInt(getField(row, SF_FIELD_MAP.crawlDepth));
  const wordCount    = parseInt(getField(row, SF_FIELD_MAP.wordCount));
  const responseTime = parseInt(getField(row, SF_FIELD_MAP.responseTime));
  const size         = parseInt(getField(row, SF_FIELD_MAP.size));
  const h1Count      = parseInt(getField(row, SF_FIELD_MAP.h1Count))       || 0;
  const h2Count      = parseInt(getField(row, SF_FIELD_MAP.h2Count))       || 0;
  const titleLen     = parseInt(getField(row, SF_FIELD_MAP.titleLen));
  const descLen      = parseInt(getField(row, SF_FIELD_MAP.descLen));
  const imgMissingAlt = parseInt(getField(row, SF_FIELD_MAP.imgMissingAlt)) || 0;
  const title        = getField(row, SF_FIELD_MAP.title) || '';
  const description  = getField(row, SF_FIELD_MAP.description) || '';
  const h1           = getField(row, SF_FIELD_MAP.h1) || '';
  const canonical    = getField(row, SF_FIELD_MAP.canonical) || '';
  const indexability = getField(row, SF_FIELD_MAP.indexability) || '';
  const selfCanonical = getField(row, SF_FIELD_MAP.selfCanonical);

  return {
    id: url,
    url,
    statusCode,
    inlinks,
    crawlDepth: isNaN(crawlDepth) ? null : crawlDepth,
    wordCount: isNaN(wordCount) ? null : wordCount,
    responseTime: isNaN(responseTime) ? null : responseTime,
    size: isNaN(size) ? null : size,
    h1Count,
    h2Count,
    titleLen: isNaN(titleLen) ? (title ? title.length : null) : titleLen,
    descLen: isNaN(descLen) ? (description ? description.length : null) : descLen,
    imgMissingAlt,
    title,
    description,
    h1,
    canonical,
    indexability,
    selfCanonical,
    isIndexable: indexability.toLowerCase().includes('indexable') && !indexability.toLowerCase().includes('non'),
    // For vis-network
    label: (() => { try { return new URL(url).pathname || '/'; } catch { return url; } })(),
    tooltip: `${title || 'No Title'}\n${url}\nInlinks: ${inlinks}`,
    group: statusCode === 404 ? 'error' : inlinks === 0 ? 'orphan' : 'page',
    value: inlinks > 0 ? (inlinks * 2) + 10 : 10,
    raw: row,
  };
}

/**
 * Compute dataset-wide insights from normalized nodes
 */
function computeInsights(nodes) {
  const titleMap   = new Map(); // title → [urls]
  const descMap    = new Map(); // desc  → [urls]
  const h1Map      = new Map(); // h1    → [urls]

  let orphanCount   = 0;
  let brokenCount   = 0;
  let missingTitle  = 0;
  let longTitle     = 0;
  let missingDesc   = 0;
  let longDesc      = 0;
  let missingH1     = 0;
  let thinContent   = 0;
  let deepPages     = 0;
  let slowPages     = 0;
  let heavyPages    = 0;
  let nonCanonical  = 0;  // canonical points to another URL
  let noindexWithInlinks = 0;
  let missingImgAlt = 0;

  for (const n of nodes) {
    // Orphan / Broken
    if (n.statusCode === 404 && n.inlinks > 0) brokenCount++;
    if (n.inlinks === 0 && n.statusCode === 200 && n.isIndexable !== false) orphanCount++;

    // Title
    if (!n.title) {
      missingTitle++;
    } else {
      if (n.titleLen !== null && n.titleLen > 60) longTitle++;
      const key = n.title.toLowerCase().trim();
      if (!titleMap.has(key)) titleMap.set(key, []);
      titleMap.get(key).push(n.url);
    }

    // Description
    if (!n.description) {
      missingDesc++;
    } else {
      if (n.descLen !== null && n.descLen > 160) longDesc++;
      const key = n.description.toLowerCase().trim();
      if (!descMap.has(key)) descMap.set(key, []);
      descMap.get(key).push(n.url);
    }

    // H1
    if (!n.h1 || n.h1Count === 0) {
      missingH1++;
    } else {
      const key = n.h1.toLowerCase().trim();
      if (!h1Map.has(key)) h1Map.set(key, []);
      h1Map.get(key).push(n.url);
    }

    // Content
    if (n.wordCount !== null && n.wordCount < 300 && n.statusCode === 200) thinContent++;

    // Structure
    if (n.crawlDepth !== null && n.crawlDepth >= 4) deepPages++;

    // Performance
    if (n.responseTime !== null && n.responseTime > 3000) slowPages++;
    if (n.size !== null && n.size > 1024 * 1024) heavyPages++;

    // Canonical
    if (n.canonical && n.canonical !== n.url) nonCanonical++;

    // Indexability
    if (!n.isIndexable && n.inlinks > 0) noindexWithInlinks++;

    // Images
    if (n.imgMissingAlt > 0) missingImgAlt++;
  }

  // Duplicate detection
  const dupTitles = [...titleMap.entries()].filter(([, urls]) => urls.length > 1);
  const dupDescs  = [...descMap.entries()].filter(([, urls]) => urls.length > 1);
  const dupH1s    = [...h1Map.entries()].filter(([, urls]) => urls.length > 1);

  return {
    totalParsed: nodes.length,
    orphanCount,
    brokenCount,
    missingTitle,
    longTitle,
    dupTitleCount: dupTitles.reduce((s, [, urls]) => s + urls.length, 0),
    dupTitleGroups: dupTitles,
    missingDesc,
    longDesc,
    dupDescCount: dupDescs.reduce((s, [, urls]) => s + urls.length, 0),
    dupDescGroups: dupDescs,
    missingH1,
    dupH1Count: dupH1s.reduce((s, [, urls]) => s + urls.length, 0),
    dupH1Groups: dupH1s,
    thinContent,
    deepPages,
    slowPages,
    heavyPages,
    nonCanonical,
    noindexWithInlinks,
    missingImgAlt,
  };
}

/**
 * Parse rows (array of plain objects) into nodes + insights
 */
function processRows(rows) {
  const nodes = rows.map(normalizeRow).filter(Boolean);
  const edges = []; // SF Internal HTML export doesn't contain edge data
  const insights = computeInsights(nodes);
  return { nodes, edges, insights };
}

/**
 * Parse a Screaming Frog CSV or XLSX file.
 * @param {File} file
 * @returns {Promise<{nodes, edges, insights}>}
 */
export function parseScreamingFrogCSV(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsx(file);
  }
  return parseCsv(file);
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          resolve(processRows(results.data));
        } catch (e) {
          reject(new Error('CSV 解析失败：' + e.message));
        }
      },
      error: (err) => reject(err),
    });
  });
}

function parseXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve(processRows(rows));
      } catch (err) {
        reject(new Error('XLSX 解析失败：' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}
