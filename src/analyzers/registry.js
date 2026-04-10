// ===== SEOGEO4YMYL — Analyzer Registry =====

import { TechnicalAnalyzer } from './technical.js';
import { OnpageAnalyzer } from './onpage.js';
import { ContentAnalyzer } from './content.js';
import { GeoAnalyzer } from './geo.js';
import { StructuredDataAnalyzer } from './structured-data.js';
import { PerformanceAnalyzer } from './performance.js';
import { OffpageAnalyzer } from './offpage.js';
import { DomainAuthorityAnalyzer } from './domain-authority.js';
import { FintechComplianceAnalyzer } from './fintech-compliance.js';
import { AiCitationAnalyzer } from './ai-citation.js';

/**
 * All analyzers in execution order
 * Each analyzer implements: { id, name, icon, weight, requiredResources, sfCompatible, analyze(data) }
 */
export const ANALYZERS = [
  TechnicalAnalyzer,
  OnpageAnalyzer,
  ContentAnalyzer,
  GeoAnalyzer,
  StructuredDataAnalyzer,
  PerformanceAnalyzer,
  OffpageAnalyzer,
  DomainAuthorityAnalyzer,
  FintechComplianceAnalyzer,
  AiCitationAnalyzer,
];

/**
 * Get analyzer by ID
 */
export function getAnalyzerById(id) {
  return ANALYZERS.find(a => a.id === id) || null;
}

/**
 * Run all analyzers against a NormalizedPageData
 * @param {NormalizedPageData} data
 * @returns {Map<string, ModuleResult>}
 */
export function runAllAnalyzers(data) {
  const results = new Map();
  for (const analyzer of ANALYZERS) {
    try {
      const result = analyzer.analyze(data);
      results.set(analyzer.id, result);
    } catch (err) {
      console.error(`[Analyzer] ${analyzer.id} failed:`, err);
      results.set(analyzer.id, {
        moduleId: analyzer.id,
        rawScore: 0,
        items: [{
          finding: `分析器错误: ${err.message}`,
          evidence: err.stack?.split('\n')[0] || '',
          impact: 'Critical',
          fix: null,
          fixCode: null,
          confidence: 'Confirmed',
          prompt: null,
        }],
        tags: ['error'],
        timestamp: Date.now(),
      });
    }
  }
  return results;
}
