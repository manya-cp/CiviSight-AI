import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { computeCivicRippleScore } from './src/utils/rippleEngine.ts';
import type { IssueCategory, SeverityLevel, VerificationResult } from './src/types/civic.ts';

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.resolve(process.cwd());
const UPLOADS_DIR = path.resolve(ROOT_DIR, 'uploads');
const ASSETS_IMAGES_DIR = path.resolve(ROOT_DIR, 'src', 'assets', 'images');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const VALID_CATEGORIES: IssueCategory[] = [
  'Road & Pothole',
  'Water Leakage',
  'Garbage & Sanitation',
  'Open Drainage',
  'Streetlight Failure',
  'Flooding & Blocked Drain',
  'Other Infrastructure',
];

const VALID_SEVERITIES: SeverityLevel[] = ['Low', 'Moderate', 'High', 'Critical'];

const VALID_VERIFICATION_RESULTS: VerificationResult[] = [
  'Appears Resolved',
  'Partially Resolved',
  'Appears Unresolved',
  'Unable to Determine',
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('not configured')) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string; buffer: Buffer } | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  return { mimeType, base64, buffer };
}

function resolveLocalImageFromUrl(imageUrl: string): { base64: string; mimeType: string } | null {
  const cleanUrl = imageUrl.split('?')[0].trim();
  let targetPath: string | null = null;
  let allowedBase: string | null = null;

  if (cleanUrl.startsWith('/api/uploads/')) {
    const fileName = cleanUrl.slice('/api/uploads/'.length);
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(fileName)) return null;
    allowedBase = UPLOADS_DIR;
    targetPath = path.resolve(UPLOADS_DIR, fileName);
  } else if (cleanUrl.startsWith('/src/assets/images/')) {
    const fileName = cleanUrl.slice('/src/assets/images/'.length);
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(fileName)) return null;
    allowedBase = ASSETS_IMAGES_DIR;
    targetPath = path.resolve(ASSETS_IMAGES_DIR, fileName);
  }

  if (!targetPath || !allowedBase) return null;
  if (!targetPath.startsWith(allowedBase + path.sep)) return null;
  if (!fs.existsSync(targetPath)) return null;

  const ext = path.extname(targetPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const buffer = fs.readFileSync(targetPath);
  return { base64: buffer.toString('base64'), mimeType };
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/api/health', (_req, res) => {
  const key = process.env.GEMINI_API_KEY;
  res.json({
    ok: true,
    geminiConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
  });
});

// Upload validated complaint or verification photograph
app.post('/api/uploads', (req, res) => {
  try {
    const { dataUrl } = req.body as { dataUrl?: unknown };
    if (typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Invalid upload payload. Expected image dataUrl.' });
      return;
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      res.status(400).json({
        error: 'Unsupported image format or file too large. Please upload a JPEG, PNG, or WebP image under 5 MB.',
      });
      return;
    }

    const ext = ALLOWED_MIME_TYPES[parsed.mimeType];
    const fileId = crypto.randomUUID().replace(/-/g, '');
    const fileName = `${fileId}${ext}`;
    const destPath = path.resolve(UPLOADS_DIR, fileName);

    if (!destPath.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(400).json({ error: 'Invalid upload path.' });
      return;
    }

    fs.writeFileSync(destPath, parsed.buffer);
    res.json({
      url: `/api/uploads/${fileName}`,
      mimeType: parsed.mimeType,
      bytes: parsed.buffer.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to store uploaded image.';
    res.status(500).json({ error: message });
  }
});

app.get('/api/uploads/:filename', (req, res) => {
  const fileName = req.params.filename;
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(fileName)) {
    res.status(400).json({ error: 'Invalid image filename.' });
    return;
  }
  const targetPath = path.resolve(UPLOADS_DIR, fileName);
  if (!targetPath.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(targetPath)) {
    res.status(404).json({ error: 'Image not found.' });
    return;
  }
  res.sendFile(targetPath);
});

// Gemini Vision Civic Issue Analysis + Civic Ripple Intelligence
app.post('/api/ai/analyze-issue', async (req, res) => {
  try {
    const {
      imageDataUrl,
      imageUrl,
      categoryHint,
      description,
      location,
      nearbyLandmarks,
    } = req.body as {
      imageDataUrl?: unknown;
      imageUrl?: unknown;
      categoryHint?: unknown;
      description?: unknown;
      location?: unknown;
      nearbyLandmarks?: unknown;
    };

    let imagePayload: { base64: string; mimeType: string } | null = null;
    if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:')) {
      const parsed = parseDataUrl(imageDataUrl);
      if (parsed) imagePayload = { base64: parsed.base64, mimeType: parsed.mimeType };
    } else if (typeof imageUrl === 'string') {
      imagePayload = resolveLocalImageFromUrl(imageUrl);
    }

    if (!imagePayload) {
      res.status(400).json({
        error: 'A valid JPEG, PNG, or WebP photograph (under 5 MB) is required for Gemini Vision analysis.',
      });
      return;
    }

    const safeCategoryHint =
      typeof categoryHint === 'string' && VALID_CATEGORIES.includes(categoryHint as IssueCategory)
        ? categoryHint
        : 'Auto-detect from image';
    const safeDescription = typeof description === 'string' ? description.trim().slice(0, 1500) : '';
    const safeLocation = typeof location === 'string' ? location.trim().slice(0, 300) : 'Not specified';
    const safeLandmarks = typeof nearbyLandmarks === 'string' ? nearbyLandmarks.trim().slice(0, 500) : '';

    const ai = getGeminiClient();

    const prompt = [
      'You are an expert municipal civil infrastructure inspector for CIVISIGHT AI.',
      'Analyze the uploaded photograph carefully and objectively.',
      'CRITICAL INTEGRITY RULES:',
      '- Report ONLY what is visually observable in the photograph.',
      '- Do NOT fabricate unseen underground damage, exact measurements you cannot see, or official municipal claims.',
      '- If the image is unclear or ambiguous, explicitly explain the uncertainty in confidenceExplanation.',
      '',
      `Citizen category hint: ${safeCategoryHint}`,
      `Citizen notes: ${safeDescription || 'None provided'}`,
      `Reported location: ${safeLocation}`,
      `User-supplied nearby landmarks: ${safeLandmarks || 'None provided'}`,
      '',
      'Provide structured civic inspection metrics and base dimension estimates (0-100) for Infrastructure, Public Safety, Environmental, and Community Disruption based strictly on the visual evidence and supplied context.',
    ].join('\n');

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: imagePayload.mimeType,
                data: imagePayload.base64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction:
            'You are a careful, factual civic infrastructure vision analyst. Never hallucinate facts beyond the photograph and provided location notes.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedProblem: {
                type: Type.STRING,
                description: 'Concise title of the infrastructure issue observed in the photograph.',
              },
              problemCategory: {
                type: Type.STRING,
                description:
                  'One of: Road & Pothole, Water Leakage, Garbage & Sanitation, Open Drainage, Streetlight Failure, Flooding & Blocked Drain, Other Infrastructure.',
              },
              visualObservations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 objective visual observations directly visible in the photograph.',
              },
              suggestedDescription: {
                type: Type.STRING,
                description: 'Clear, citizen-ready 2-3 sentence complaint description summarizing the observed issue.',
              },
              severityLevel: {
                type: Type.STRING,
                description: 'One of: Low, Moderate, High, Critical.',
              },
              severityScore: {
                type: Type.NUMBER,
                description: 'Estimated visual severity score from 0 to 100.',
              },
              possibleConsequences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 4 plausible consequences if left unaddressed, framed cautiously as potential risks.',
              },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 practical immediate and short-term corrective actions.',
              },
              confidenceExplanation: {
                type: Type.STRING,
                description: 'Transparent explanation of visual confidence and any image limitations or uncertainties.',
              },
              infrastructureBase: {
                type: Type.NUMBER,
                description: 'Base Infrastructure Impact score 0-100 from visual damage.',
              },
              publicSafetyBase: {
                type: Type.NUMBER,
                description: 'Base Public Safety Impact score 0-100 from visible hazard.',
              },
              environmentalBase: {
                type: Type.NUMBER,
                description: 'Base Environmental Impact score 0-100 from visible water/waste/contamination.',
              },
              communityDisruptionBase: {
                type: Type.NUMBER,
                description: 'Base Community Disruption score 0-100 from visible blockage or utility disruption.',
              },
              rationale: {
                type: Type.STRING,
                description: '1-2 sentence explanation of why this issue deserves its estimated severity and priority.',
              },
            },
            required: [
              'detectedProblem',
              'problemCategory',
              'visualObservations',
              'suggestedDescription',
              'severityLevel',
              'severityScore',
              'possibleConsequences',
              'recommendedActions',
              'confidenceExplanation',
              'infrastructureBase',
              'publicSafetyBase',
              'environmentalBase',
              'communityDisruptionBase',
              'rationale',
            ],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsed = JSON.parse(rawText) as {
      detectedProblem: string;
      problemCategory: string;
      visualObservations: string[];
      suggestedDescription: string;
      severityLevel: string;
      severityScore: number;
      possibleConsequences: string[];
      recommendedActions: string[];
      confidenceExplanation: string;
      infrastructureBase: number;
      publicSafetyBase: number;
      environmentalBase: number;
      communityDisruptionBase: number;
      rationale: string;
    };

    const validatedCategory: IssueCategory = VALID_CATEGORIES.includes(parsed.problemCategory as IssueCategory)
      ? (parsed.problemCategory as IssueCategory)
      : safeCategoryHint !== 'Auto-detect from image'
        ? (safeCategoryHint as IssueCategory)
        : 'Other Infrastructure';

    const validatedSeverity: SeverityLevel = VALID_SEVERITIES.includes(parsed.severityLevel as SeverityLevel)
      ? (parsed.severityLevel as SeverityLevel)
      : 'Moderate';

    const clampedSeverityScore = Math.max(0, Math.min(100, Math.round(Number(parsed.severityScore) || 50)));

    const ripple = computeCivicRippleScore({
      category: validatedCategory,
      severityLevel: validatedSeverity,
      severityScore: clampedSeverityScore,
      location: safeLocation,
      nearbyLandmarks: safeLandmarks,
      detectedProblem: String(parsed.detectedProblem || 'Infrastructure Issue Detected').slice(0, 200),
      visualObservations: (Array.isArray(parsed.visualObservations) ? parsed.visualObservations : [])
        .map((s) => String(s).slice(0, 300))
        .slice(0, 6),
      possibleConsequences: (Array.isArray(parsed.possibleConsequences) ? parsed.possibleConsequences : [])
        .map((s) => String(s).slice(0, 300))
        .slice(0, 5),
      confidenceExplanation: String(
        parsed.confidenceExplanation || 'AI-assisted visual estimate based on uploaded photograph.'
      ).slice(0, 800),
      aiDimensionBases: {
        infrastructureBase: Number(parsed.infrastructureBase) || clampedSeverityScore,
        publicSafetyBase: Number(parsed.publicSafetyBase) || clampedSeverityScore,
        environmentalBase: Number(parsed.environmentalBase) || 40,
        communityDisruptionBase: Number(parsed.communityDisruptionBase) || 45,
        rationale: String(parsed.rationale || 'Priority reflects visible damage and potential public exposure.').slice(
          0,
          600
        ),
      },
    });

    res.json({
      detectedProblem: String(parsed.detectedProblem || 'Civic Infrastructure Issue').slice(0, 200),
      problemCategory: validatedCategory,
      visualObservations: ripple.impactAnalysis.visualObservations,
      suggestedDescription: String(parsed.suggestedDescription || safeDescription || 'Infrastructure issue reported.').slice(
        0,
        1500
      ),
      severityLevel: validatedSeverity,
      severityScore: clampedSeverityScore,
      possibleConsequences: ripple.impactAnalysis.possibleConsequences,
      recommendedActions: (Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [])
        .map((s) => String(s).slice(0, 300))
        .slice(0, 8),
      confidenceExplanation: ripple.impactAnalysis.confidenceExplanation,
      civicRippleScore: ripple.civicRippleScore,
      impactAnalysis: ripple.impactAnalysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini Vision analysis failed.';
    console.error('Analyze issue error:', message);
    res.status(502).json({ error: message });
  }
});

// FixVerify AI: Before-and-After Repair Verification using Gemini Vision
app.post('/api/ai/fixverify', async (req, res) => {
  try {
    const {
      beforeImageDataUrl,
      beforeImageUrl,
      afterImageDataUrl,
      originalProblem,
      category,
      location,
    } = req.body as {
      beforeImageDataUrl?: unknown;
      beforeImageUrl?: unknown;
      afterImageDataUrl?: unknown;
      originalProblem?: unknown;
      category?: unknown;
      location?: unknown;
    };

    let beforePayload: { base64: string; mimeType: string } | null = null;
    if (typeof beforeImageDataUrl === 'string' && beforeImageDataUrl.startsWith('data:')) {
      const parsed = parseDataUrl(beforeImageDataUrl);
      if (parsed) beforePayload = { base64: parsed.base64, mimeType: parsed.mimeType };
    } else if (typeof beforeImageUrl === 'string') {
      beforePayload = resolveLocalImageFromUrl(beforeImageUrl);
    }

    const afterParsed = typeof afterImageDataUrl === 'string' ? parseDataUrl(afterImageDataUrl) : null;

    if (!beforePayload) {
      res.status(400).json({ error: 'Original before-repair photograph could not be loaded for comparison.' });
      return;
    }
    if (!afterParsed) {
      res.status(400).json({
        error: 'A valid after-repair JPEG, PNG, or WebP photograph (under 5 MB) is required.',
      });
      return;
    }

    const safeProblem = typeof originalProblem === 'string' ? originalProblem.trim().slice(0, 400) : 'Civic issue';
    const safeCategory = typeof category === 'string' ? category.trim().slice(0, 100) : 'Infrastructure';
    const safeLocation = typeof location === 'string' ? location.trim().slice(0, 200) : 'Reported site';

    const ai = getGeminiClient();

    const prompt = [
      'You are FixVerify AI, an AI-assisted civic repair visual comparison inspector.',
      'Image 1 is the BEFORE photograph showing the reported infrastructure problem.',
      'Image 2 is the AFTER photograph submitted following reported maintenance.',
      '',
      `Reported category: ${safeCategory}`,
      `Original problem description: ${safeProblem}`,
      `Location: ${safeLocation}`,
      '',
      'Compare Image 1 and Image 2 carefully:',
      '- Identify concrete visual differences between Image 1 and Image 2.',
      '- Determine whether the original problem Appears Resolved, Partially Resolved, Appears Unresolved, or Unable to Determine (e.g. if angles/locations do not clearly match or image is obscured).',
      '- NEVER claim physical structural soundness is definitively certified from a photograph alone; explicitly note that this is AI-assisted visual verification.',
    ].join('\n');

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            { text: 'BEFORE PHOTOGRAPH (Image 1):' },
            { inlineData: { mimeType: beforePayload.mimeType, data: beforePayload.base64 } },
            { text: 'AFTER PHOTOGRAPH (Image 2):' },
            { inlineData: { mimeType: afterParsed.mimeType, data: afterParsed.base64 } },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction:
            'Compare the before and after photographs conservatively and truthfully. Always frame results as AI-assisted visual verification rather than certified engineering sign-off.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              result: {
                type: Type.STRING,
                description:
                  'Strictly one of: Appears Resolved, Partially Resolved, Appears Unresolved, Unable to Determine.',
              },
              visualDifferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 specific visual differences observed between Image 1 and Image 2.',
              },
              explanation: {
                type: Type.STRING,
                description: 'Clear 2-4 sentence explanation justifying the visual assessment.',
              },
              confidenceNote: {
                type: Type.STRING,
                description:
                  'Caveat noting camera angle, lighting, or framing differences and reminding that this is AI-assisted visual verification.',
              },
            },
            required: ['result', 'visualDifferences', 'explanation', 'confidenceNote'],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Gemini returned an empty verification response.');
    }

    const parsed = JSON.parse(rawText) as {
      result: string;
      visualDifferences: string[];
      explanation: string;
      confidenceNote: string;
    };

    const validatedResult: VerificationResult = VALID_VERIFICATION_RESULTS.includes(
      parsed.result as VerificationResult
    )
      ? (parsed.result as VerificationResult)
      : 'Unable to Determine';

    res.json({
      result: validatedResult,
      visualDifferences: (Array.isArray(parsed.visualDifferences) ? parsed.visualDifferences : [])
        .map((s) => String(s).slice(0, 300))
        .slice(0, 8),
      explanation: String(parsed.explanation || 'Visual comparison completed.').slice(0, 2500),
      confidenceNote: String(
        parsed.confidenceNote ||
          'AI-assisted visual verification only; field inspection may still be required for subsurface or structural safety.'
      ).slice(0, 900),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'FixVerify AI comparison failed.';
    console.error('FixVerify error:', message);
    res.status(502).json({ error: message });
  }
});

// Gemini Civic Analytics Insights
app.post('/api/ai/analytics-insights', async (req, res) => {
  try {
    const { statsSummary } = req.body as { statsSummary?: unknown };
    if (!statsSummary || typeof statsSummary !== 'object') {
      res.status(400).json({ error: 'Valid analytics statistics summary is required.' });
      return;
    }

    const ai = getGeminiClient();
    const prompt = [
      'Analyze these municipal civic complaint statistics for CIVISIGHT AI.',
      'Ground every insight strictly in the numbers provided below. Do not invent external trends.',
      '',
      JSON.stringify(statsSummary, null, 2),
    ].join('\n');

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a municipal operations strategist summarizing real or clearly-labeled demo civic complaint metrics.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              priorityHotspots: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              operationalRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              dataCaveat: { type: Type.STRING },
            },
            required: ['executiveSummary', 'priorityHotspots', 'operationalRecommendations', 'dataCaveat'],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Gemini returned an empty analytics summary.');
    }
    res.json(JSON.parse(rawText));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini analytics insight generation failed.';
    console.error('Analytics insights error:', message);
    res.status(502).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CIVISIGHT AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
