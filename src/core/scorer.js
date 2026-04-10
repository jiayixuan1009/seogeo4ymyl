// ===== SEOGEO4YMYL — v5 Weighted Scorer =====

import { MODULES, PERSONAS, READINESS_LABELS } from '../utils/constants.js';

/**
 * Calculate weighted total score from module results
 * @param {Map<string, {rawScore: number}>} moduleResults - moduleId → result
 * @param {string} personaId - Selected persona ID
 * @returns {Object} - { totalScore, moduleScores, readinessLabel, breakdown }
 */
export function calculateScores(moduleResults, personaId = 'balanced') {
  const persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
  const overrides = persona.weightOverrides;

  let totalWeightedScore = 0;
  let totalWeight = 0;
  const moduleScores = {};

  for (const mod of MODULES) {
    const result = moduleResults.get(mod.id);
    const rawScore = result?.rawScore ?? 0;

    // Apply persona weight override
    let weight = mod.weight;
    if (overrides[mod.id]) {
      weight *= overrides[mod.id];
    }

    moduleScores[mod.id] = {
      rawScore,
      weight,
      weightedScore: rawScore * weight,
      name: mod.name,
      icon: mod.icon,
    };

    totalWeightedScore += rawScore * weight;
    totalWeight += weight;
  }

  // Normalize to 0-100
  const totalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

  // Readiness label
  const geoScore = moduleScores.geo?.rawScore || 0;
  const aiCitationScore = moduleScores['ai-citation']?.rawScore || 0;
  const structuredDataScore = moduleScores['structured-data']?.rawScore || 0;
  const technicalScore = moduleScores.technical?.rawScore || 0;
  const onpageScore = moduleScores.onpage?.rawScore || 0;
  const contentScore = moduleScores.content?.rawScore || 0;

  let readinessLabel;
  if (geoScore >= 70 && aiCitationScore >= 65 && structuredDataScore >= 60) {
    readinessLabel = READINESS_LABELS.AI_FIRST;
  } else if (technicalScore >= 75 && onpageScore >= 70 && contentScore >= 65) {
    readinessLabel = READINESS_LABELS.TRADITIONAL;
  } else {
    readinessLabel = READINESS_LABELS.NEEDS_WORK;
  }

  return {
    totalScore,
    moduleScores,
    readinessLabel,
    persona: persona.name,
  };
}

/**
 * Get score color class
 */
export function getScoreColorClass(score) {
  if (score >= 70) return 'module-card__score--high';
  if (score >= 40) return 'module-card__score--mid';
  return 'module-card__score--low';
}

/**
 * Get score bar color
 */
export function getScoreBarColor(score) {
  if (score >= 70) return 'var(--accent-green)';
  if (score >= 40) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}
