import React, { useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
} from 'lucide-react';
import { LeafletMap } from '../components/LeafletMap';
import { analyzeCivicIssue, uploadImageFile } from '../services/apiService';
import { saveComplaintWithHistory } from '../services/firestoreService';
import { urlToDataUrl, validateAndPrepareImage } from '../utils/imageUtils';
import type {
  CivicComplaint,
  IssueCategory,
  PageId,
  UserProfile,
} from '../types/civic';

const CATEGORIES: IssueCategory[] = [
  'Road & Pothole',
  'Water Leakage',
  'Garbage & Sanitation',
  'Open Drainage',
  'Streetlight Failure',
  'Flooding & Blocked Drain',
  'Other Infrastructure',
];

interface ReportIssuePageProps {
  user: UserProfile | null;
  demoMode: boolean;
  onComplaintCreated: (complaint: CivicComplaint, nextPage: PageId) => void;
  onNavigate: (page: PageId) => void;
}

export const ReportIssuePage: React.FC<ReportIssuePageProps> = ({
  user,
  demoMode,
  onComplaintCreated,
  onNavigate,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<string>('');
  const [category, setCategory] = useState<IssueCategory>('Water Leakage');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [nearbyLandmarks, setNearbyLandmarks] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 37.7858,
    lng: -122.4036,
  });

  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draftingDesc, setDraftingDesc] = useState(false);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const prepared = await validateAndPrepareImage(file);
      setImageDataUrl(prepared.dataUrl);
      setImageMeta(`${prepared.width}x${prepared.height} · ${(prepared.sizeBytes / 1024).toFixed(0)} KB`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image.');
    }
  };

  const handleLoadSamplePhoto = async (sampleType: 'water' | 'pothole') => {
    setError(null);
    const url =
      sampleType === 'water'
        ? '/src/assets/images/demo_water_leak_1795323868231.jpg'
        : '/src/assets/images/demo_road_pothole_1795323868451.jpg';
    try {
      const dataUrl = await urlToDataUrl(url);
      setImageDataUrl(dataUrl);
      setImageMeta('Sample Field Photograph Ready');
      if (sampleType === 'water') {
        setCategory('Water Leakage');
        if (!location) setLocation('Market St & 4th Ave, Downtown');
        if (!nearbyLandmarks) setNearbyLandmarks('City Urgent Care Clinic, Elementary School Crosswalk');
      } else {
        setCategory('Road & Pothole');
        if (!location) setLocation('1420 Oakland Ave, North Transit Lane');
        if (!nearbyLandmarks) setNearbyLandmarks('Bus Route 38 Stop, Neighborhood Market');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sample photograph.');
    }
  };

  const handleGenerateDescription = async () => {
    if (!imageDataUrl) {
      setError('Upload a photograph first so Gemini Vision can draft a description.');
      return;
    }
    setError(null);
    setDraftingDesc(true);
    try {
      const aiRes = await analyzeCivicIssue({
        imageDataUrl,
        categoryHint: category,
        description,
        location: location || 'Urban street location',
        nearbyLandmarks,
      });
      setDescription(aiRes.suggestedDescription);
      setCategory(aiRes.problemCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gemini description draft failed.');
    } finally {
      setDraftingDesc(false);
    }
  };

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        if (!location.trim()) {
          setLocation(`GPS Site (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      },
      () => {
        setError('Unable to access browser GPS. You can click directly on the map to pin the location.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!imageDataUrl) {
      setError('Please upload a photograph of the infrastructure issue.');
      return;
    }
    if (location.trim().length < 3) {
      setError('Please enter a street address or intersection (at least 3 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please enter at least 10 characters describing the issue (or click Auto-Draft with Gemini).');
      return;
    }

    try {
      setProgressStep('Uploading validated photograph to secure server storage...');
      setProgressPercent(28);
      const uploaded = await uploadImageFile(imageDataUrl);

      setProgressStep('Running Gemini Vision & Civic Ripple Intelligence...');
      setProgressPercent(68);
      const aiResult = await analyzeCivicIssue({
        imageDataUrl,
        categoryHint: category,
        description: description.trim(),
        location: location.trim(),
        nearbyLandmarks: nearbyLandmarks.trim(),
      });

      const generatedId = `CIV-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const complaintDraft: Omit<CivicComplaint, 'createdAt' | 'updatedAt'> = {
        complaintId: generatedId,
        userId: user ? user.uid : 'demo-citizen-sandbox',
        reporterName: user ? user.name : 'Demo Explorer',
        category: aiResult.problemCategory || category,
        description: description.trim(),
        imageUrl: uploaded.url,
        location: location.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        nearbyLandmarks: nearbyLandmarks.trim(),
        severity: aiResult.severityLevel,
        severityScore: aiResult.severityScore,
        civicRippleScore: aiResult.civicRippleScore,
        impactAnalysis: aiResult.impactAnalysis,
        recommendations: aiResult.recommendedActions,
        status: 'AI Analysed',
        assignedDepartment: 'Pending Municipal Triage',
        resolutionNotes: '',
        isDemo: !user && demoMode,
      };

      if (user && !demoMode) {
        setProgressStep('Persisting complaint & audit history to Cloud Firestore...');
        setProgressPercent(90);
        const saved = await saveComplaintWithHistory(complaintDraft);
        setProgressPercent(100);
        onComplaintCreated(saved, 'ai-analysis');
      } else {
        // Demo sandbox mode
        const demoSaved: CivicComplaint = {
          ...complaintDraft,
          complaintId: `DEMO-${generatedId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDemo: true,
        };
        setProgressPercent(100);
        onComplaintCreated(demoSaved, 'ai-analysis');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
      setProgressStep(null);
      setProgressPercent(0);
    }
  };

  if (!user && !demoMode) {
    return (
      <div className="max-w-xl mx-auto glass-panel-elevated rounded-2xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">Sign In Required</h1>
        <p className="text-sm text-slate-300">
          Please sign in with Firebase Authentication to persist live civic complaints, or enter
          Demo Mode to test Gemini Vision reporting on sample records.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-300">
            Step 1 of Civic Workflow · Photographic Evidence &amp; Nearby Context
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            Report an Infrastructure Issue
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">Load sample test photo:</span>
          <button
            type="button"
            onClick={() => handleLoadSamplePhoto('water')}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 cursor-pointer"
          >
            Water Main Leak
          </button>
          <button
            type="button"
            onClick={() => handleLoadSamplePhoto('pothole')}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 cursor-pointer"
          >
            Road Pothole
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-sm text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Photo Upload & Map Pin */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">1. Issue Photograph</h2>
              <span className="text-xs text-slate-400">JPEG, PNG, WebP · Max 5 MB</span>
            </div>

            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              {imageDataUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-cyan-400/30 bg-slate-950">
                  <img
                    src={imageDataUrl}
                    alt="Uploaded infrastructure preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-56 object-cover"
                  />
                  <div className="px-3 py-2 bg-[#040917]/85 flex items-center justify-between text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5 text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {imageMeta}
                    </span>
                    <span className="text-sky-300 underline">Replace photo</span>
                  </div>
                </div>
              ) : (
                <div className="h-56 rounded-xl border border-dashed border-white/25 hover:border-cyan-400/60 bg-white/5 flex flex-col items-center justify-center text-center p-6 transition-colors">
                  <Upload className="w-8 h-8 text-cyan-300 mb-3" />
                  <div className="text-sm font-medium text-white">Click to upload site photograph</div>
                  <p className="text-xs text-slate-400 mt-1">
                    Clear street-level lighting improves Gemini Vision accuracy
                  </p>
                </div>
              )}
            </label>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">
                2. Pin Location on Map
              </h2>
              <button
                type="button"
                onClick={handleUseBrowserLocation}
                className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                Use My GPS
              </button>
            </div>
            <LeafletMap
              interactivePick
              pickedCoords={coords}
              onPickCoords={(c) => setCoords(c)}
              heightClass="h-56"
            />
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              {coords
                ? `Pinned Coordinates: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : 'Click anywhere on the map to set coordinates.'}
            </p>
          </div>
        </div>

        {/* Right: Form Fields */}
        <div className="lg:col-span-7 glass-panel-elevated rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="font-display text-lg font-semibold text-white border-b border-white/10 pb-3">
            3. Issue Details &amp; Sensitive Nearby Context
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue-category" className="block text-xs font-medium text-slate-300 mb-1.5">
                Issue Category
              </label>
              <select
                id="issue-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09132b] border border-white/15 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="issue-location" className="block text-xs font-medium text-slate-300 mb-1.5">
                Street Address / Intersection
              </label>
              <input
                id="issue-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Market St & 4th Ave, Civic Center"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="issue-landmarks" className="block text-xs font-medium text-slate-300 mb-1.5">
              Nearby Important Landmarks (powers Civic Ripple Intelligence)
            </label>
            <input
              id="issue-landmarks"
              type="text"
              value={nearbyLandmarks}
              onChange={(e) => setNearbyLandmarks(e.target.value)}
              placeholder="e.g., Lincoln Elementary School, City Clinic, Metro Station, River Park"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              If left blank, Civic Ripple Intelligence will mark the assessment as limited due to
              missing nearby context.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="issue-description" className="text-xs font-medium text-slate-300">
                Issue Description
              </label>
              <button
                type="button"
                disabled={draftingDesc || !imageDataUrl}
                onClick={handleGenerateDescription}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-40 cursor-pointer"
              >
                {draftingDesc ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {draftingDesc ? 'Drafting with Gemini...' : 'Auto-Draft Description from Photo'}
              </button>
            </div>
            <textarea
              id="issue-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is damaged, how long it has persisted, and any traffic or pedestrian obstructions..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {progressStep && (
            <div className="rounded-xl bg-sky-500/10 border border-sky-400/25 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-sky-200">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {progressStep}
                </span>
                <span className="font-mono tabular-nums">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              {demoMode
                ? 'Submitting in Demo Mode creates a local DEMO record (not written to live municipal dispatch).'
                : 'Saves to Cloud Firestore with a unique Complaint ID and real Gemini Vision inspection.'}
            </p>
            <button
              type="submit"
              disabled={Boolean(progressStep)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              {progressStep ? 'Analyzing & Saving...' : 'Submit & Analyze with Gemini'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
