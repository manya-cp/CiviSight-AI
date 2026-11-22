export type UserRole = 'citizen' | 'admin';

export type IssueCategory =
  | 'Road & Pothole'
  | 'Water Leakage'
  | 'Garbage & Sanitation'
  | 'Open Drainage'
  | 'Streetlight Failure'
  | 'Flooding & Blocked Drain'
  | 'Other Infrastructure';

export type SeverityLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type ComplaintStatus =
  | 'Submitted'
  | 'AI Analysed'
  | 'Under Review'
  | 'In Progress'
  | 'Resolved'
  | 'Verified';

export type VerificationResult =
  | 'Appears Resolved'
  | 'Partially Resolved'
  | 'Appears Unresolved'
  | 'Unable to Determine';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RippleRuleBreakdown {
  dimension: string;
  weight: number;
  baseScore: number;
  contextAdjustment: number;
  finalScore: number;
  reason: string;
}

export interface ImpactAnalysis {
  detectedProblem: string;
  problemCategory: IssueCategory;
  visualObservations: string[];
  possibleConsequences: string[];
  confidenceExplanation: string;
  infrastructureImpact: number;
  publicSafetyImpact: number;
  environmentalImpact: number;
  communityDisruption: number;
  rippleExplanation: string;
  limitedContextWarning: boolean;
  recommendedPriority: 'Routine' | 'Elevated' | 'Urgent' | 'Immediate Dispatch';
  ruleBreakdown: RippleRuleBreakdown[];
}

export interface CivicComplaint {
  complaintId: string;
  userId: string;
  reporterName: string;
  category: IssueCategory;
  description: string;
  imageUrl: string;
  location: string;
  latitude?: number;
  longitude?: number;
  nearbyLandmarks: string;
  severity: SeverityLevel;
  severityScore: number;
  civicRippleScore: number;
  impactAnalysis: ImpactAnalysis;
  recommendations: string[];
  status: ComplaintStatus;
  assignedDepartment: string;
  resolutionNotes: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface StatusHistoryEntry {
  historyId: string;
  complaintId: string;
  complaintUserId: string;
  status: ComplaintStatus;
  remarks: string;
  updatedBy: string;
  updatedByUid: string;
  timestamp: string;
  isDemo?: boolean;
}

export interface RepairVerification {
  verificationId: string;
  complaintId: string;
  complaintUserId: string;
  originalImageUrl: string;
  afterImageUrl: string;
  result: VerificationResult;
  visualDifferences: string[];
  explanation: string;
  confidenceNote: string;
  verifiedByUid: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface AIAnalysisResponse {
  detectedProblem: string;
  problemCategory: IssueCategory;
  visualObservations: string[];
  suggestedDescription: string;
  severityLevel: SeverityLevel;
  severityScore: number;
  possibleConsequences: string[];
  recommendedActions: string[];
  confidenceExplanation: string;
  civicRippleScore: number;
  impactAnalysis: ImpactAnalysis;
}

export interface FixVerifyResponse {
  result: VerificationResult;
  visualDifferences: string[];
  explanation: string;
  confidenceNote: string;
}

export interface AnalyticsInsightsResponse {
  executiveSummary: string;
  priorityHotspots: string[];
  operationalRecommendations: string[];
  dataCaveat: string;
}

export type PageId =
  | 'landing'
  | 'login'
  | 'register'
  | 'citizen-dashboard'
  | 'report-issue'
  | 'ai-analysis'
  | 'civic-ripple'
  | 'track-complaint'
  | 'fix-verify'
  | 'admin-dashboard'
  | 'analytics';
