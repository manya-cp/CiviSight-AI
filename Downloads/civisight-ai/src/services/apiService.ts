import type {
  AIAnalysisResponse,
  AnalyticsInsightsResponse,
  FixVerifyResponse,
  IssueCategory,
} from '../types/civic';

async function handleApiResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export async function checkApiHealth(): Promise<{ ok: boolean; geminiConfigured: boolean }> {
  const res = await fetch('/api/health');
  return handleApiResponse(res);
}

export async function uploadImageFile(dataUrl: string): Promise<{ url: string; mimeType: string; bytes: number }> {
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  return handleApiResponse(res);
}

export async function analyzeCivicIssue(params: {
  imageDataUrl?: string;
  imageUrl?: string;
  categoryHint?: IssueCategory | '';
  description?: string;
  location: string;
  nearbyLandmarks: string;
}): Promise<AIAnalysisResponse> {
  const res = await fetch('/api/ai/analyze-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleApiResponse(res);
}

export async function runFixVerifyComparison(params: {
  beforeImageDataUrl?: string;
  beforeImageUrl?: string;
  afterImageDataUrl: string;
  originalProblem: string;
  category: string;
  location: string;
}): Promise<FixVerifyResponse> {
  const res = await fetch('/api/ai/fixverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleApiResponse(res);
}

export async function generateAnalyticsInsights(statsSummary: Record<string, unknown>): Promise<AnalyticsInsightsResponse> {
  const res = await fetch('/api/ai/analytics-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statsSummary }),
  });
  return handleApiResponse(res);
}
