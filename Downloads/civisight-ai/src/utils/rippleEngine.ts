import type {
  ImpactAnalysis,
  IssueCategory,
  RippleRuleBreakdown,
  SeverityLevel,
} from '../types/civic.ts';

export interface RippleInputs {
  category: IssueCategory;
  severityLevel: SeverityLevel;
  severityScore: number;
  location: string;
  nearbyLandmarks: string;
  detectedProblem: string;
  visualObservations: string[];
  possibleConsequences: string[];
  confidenceExplanation: string;
  aiDimensionBases: {
    infrastructureBase: number;
    publicSafetyBase: number;
    environmentalBase: number;
    communityDisruptionBase: number;
    rationale: string;
  };
}

const clampScore = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const SENSITIVE_KEYWORDS = {
  safety: [
    'school', 'college', 'university', 'hospital', 'clinic', 'medical',
    'emergency', 'fire station', 'pedestrian', 'crosswalk', 'playground',
    'elderly', 'senior', 'daycare', 'intersection', 'highway', 'junction',
  ],
  environment: [
    'river', 'lake', 'canal', 'park', 'garden', 'reservoir', 'drain',
    'waterway', 'market', 'food', 'residential', 'apartment', 'well',
  ],
  community: [
    'station', 'metro', 'bus', 'transit', 'market', 'commercial',
    'downtown', 'office', 'plaza', 'bridge', 'arterial', 'main road',
  ],
};

function findMatchedTerms(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term));
}

/**
 * Transparent, deterministic Civic Ripple Intelligence scoring engine.
 * Combines Gemini Vision severity signals with explicit weighted rules and
 * user-provided sensitive proximity context. Never fabricates unverified facts.
 */
export function computeCivicRippleScore(input: RippleInputs): {
  civicRippleScore: number;
  impactAnalysis: ImpactAnalysis;
} {
  const landmarkText = (input.nearbyLandmarks || '').trim();
  const combinedContext = `${input.location} ${landmarkText}`.trim();
  const limitedContextWarning = landmarkText.length < 4;

  const safetyMatches = findMatchedTerms(combinedContext, SENSITIVE_KEYWORDS.safety);
  const envMatches = findMatchedTerms(combinedContext, SENSITIVE_KEYWORDS.environment);
  const commMatches = findMatchedTerms(combinedContext, SENSITIVE_KEYWORDS.community);

  const categoryInfraBonus: Record<IssueCategory, number> = {
    'Water Leakage': 10,
    'Open Drainage': 8,
    'Flooding & Blocked Drain': 10,
    'Road & Pothole': 7,
    'Streetlight Failure': 4,
    'Garbage & Sanitation': 3,
    'Other Infrastructure': 4,
  };

  const categoryEnvBonus: Record<IssueCategory, number> = {
    'Water Leakage': 8,
    'Open Drainage': 12,
    'Flooding & Blocked Drain': 10,
    'Garbage & Sanitation': 12,
    'Road & Pothole': 2,
    'Streetlight Failure': 1,
    'Other Infrastructure': 3,
  };

  const infraBase = clampScore(input.aiDimensionBases.infrastructureBase);
  const safetyBase = clampScore(input.aiDimensionBases.publicSafetyBase);
  const envBase = clampScore(input.aiDimensionBases.environmentalBase);
  const commBase = clampScore(input.aiDimensionBases.communityDisruptionBase);

  const infraAdj = categoryInfraBonus[input.category] ?? 4;
  const safetyAdj = Math.min(18, safetyMatches.length * 6);
  const envAdj = Math.min(16, (categoryEnvBonus[input.category] ?? 3) + envMatches.length * 4);
  const commAdj = Math.min(16, commMatches.length * 5 + (limitedContextWarning ? 0 : 4));

  const infrastructureImpact = clampScore(infraBase + infraAdj);
  const publicSafetyImpact = clampScore(safetyBase + safetyAdj);
  const environmentalImpact = clampScore(envBase + envAdj);
  const communityDisruption = clampScore(commBase + commAdj);

  // Weighted sum: Infrastructure 30%, Public Safety 30%, Environment 20%, Community Disruption 20%
  const weightedScore =
    infrastructureImpact * 0.3 +
    publicSafetyImpact * 0.3 +
    environmentalImpact * 0.2 +
    communityDisruption * 0.2;

  const civicRippleScore = clampScore(weightedScore);

  let recommendedPriority: ImpactAnalysis['recommendedPriority'] = 'Routine';
  if (civicRippleScore >= 80 || input.severityLevel === 'Critical') {
    recommendedPriority = 'Immediate Dispatch';
  } else if (civicRippleScore >= 62 || input.severityLevel === 'High') {
    recommendedPriority = 'Urgent';
  } else if (civicRippleScore >= 38) {
    recommendedPriority = 'Elevated';
  }

  const ruleBreakdown: RippleRuleBreakdown[] = [
    {
      dimension: 'Infrastructure Impact',
      weight: 0.3,
      baseScore: infraBase,
      contextAdjustment: infraAdj,
      finalScore: infrastructureImpact,
      reason: `Visual structural estimate (${infraBase}) + ${input.category} systemic load factor (+${infraAdj}).`,
    },
    {
      dimension: 'Public Safety Impact',
      weight: 0.3,
      baseScore: safetyBase,
      contextAdjustment: safetyAdj,
      finalScore: publicSafetyImpact,
      reason:
        safetyMatches.length > 0
          ? `Visual hazard estimate (${safetyBase}) + sensitive safety proximity cues (${safetyMatches.slice(0, 3).join(', ')}, +${safetyAdj}).`
          : `Visual hazard estimate (${safetyBase}); no sensitive pedestrian/emergency landmarks detected in input.`,
    },
    {
      dimension: 'Environmental Impact',
      weight: 0.2,
      baseScore: envBase,
      contextAdjustment: envAdj,
      finalScore: environmentalImpact,
      reason:
        envMatches.length > 0
          ? `Visual contamination/resource risk (${envBase}) + category & ecological cues (${envMatches.slice(0, 3).join(', ')}, +${envAdj}).`
          : `Visual environmental risk (${envBase}) + category exposure factor (+${categoryEnvBonus[input.category] ?? 3}).`,
    },
    {
      dimension: 'Community Disruption',
      weight: 0.2,
      baseScore: commBase,
      contextAdjustment: commAdj,
      finalScore: communityDisruption,
      reason:
        commMatches.length > 0
          ? `Visual corridor impact (${commBase}) + high-footfall/transit cues (${commMatches.slice(0, 3).join(', ')}, +${commAdj}).`
          : limitedContextWarning
            ? `Visual corridor impact (${commBase}); nearby landmark details not provided so disruption estimate is conservative.`
            : `Visual corridor impact (${commBase}) + local neighborhood context (+4).`,
    },
  ];

  const contextNote = limitedContextWarning
    ? 'Impact assessment is limited because nearby sensitive landmark information was not provided; score relies on visual evidence and location label only.'
    : `Evaluated alongside user-supplied nearby context ("${landmarkText}").`;

  const rippleExplanation = `${input.aiDimensionBases.rationale} Composite Civic Ripple Score (${civicRippleScore}/100) is computed transparently using weighted dimensions: 30% Infrastructure (${infrastructureImpact}), 30% Public Safety (${publicSafetyImpact}), 20% Environmental (${environmentalImpact}), and 20% Community Disruption (${communityDisruption}). ${contextNote} These figures are AI-assisted prioritization estimates, not verified field engineering measurements.`;

  return {
    civicRippleScore,
    impactAnalysis: {
      detectedProblem: input.detectedProblem,
      problemCategory: input.category,
      visualObservations: input.visualObservations,
      possibleConsequences: input.possibleConsequences,
      confidenceExplanation: input.confidenceExplanation,
      infrastructureImpact,
      publicSafetyImpact,
      environmentalImpact,
      communityDisruption,
      rippleExplanation,
      limitedContextWarning,
      recommendedPriority,
      ruleBreakdown,
    },
  };
}
