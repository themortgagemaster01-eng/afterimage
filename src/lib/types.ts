export type AppStatus = "READY" | "SCANNING" | "ANALYZING" | "PAUSED";
export type FrequencyBandId = "150-500" | "300-3000" | "200-4000" | "300-5000" | "full";
export interface FrequencyBand { id: FrequencyBandId; label: string; min: number; max: number; }
export const FREQUENCY_BANDS: FrequencyBand[] = [
  { id: "150-500", label: "150–500 Hz", min: 150, max: 500 },
  { id: "300-3000", label: "300–3,000 Hz", min: 300, max: 3000 },
  { id: "200-4000", label: "200–4,000 Hz", min: 200, max: 4000 },
  { id: "300-5000", label: "300–5,000 Hz", min: 300, max: 5000 },
  { id: "full", label: "Full spectrum", min: 20, max: 20000 },
];
export type AudioClassification = "VOICE-LIKE" | "WHISPER-LIKE" | "SPEECH-LIKE" | "TONAL" | "IMPACT" | "STATIC BURST" | "UNCLASSIFIED";
export type VisualClassification = "FACE-LIKE" | "HUMAN-FORM-LIKE" | "ANIMAL-LIKE" | "OBJECT-LIKE" | "LETTER-LIKE" | "NUMBER-LIKE" | "GEOMETRIC" | "ABSTRACT" | "UNCLASSIFIED";
export interface Hypothesis { text: string; confidence: number; }
export interface AnalysisResult { version: string; classification: string; confidence: number; description: string; hypotheses?: Hypothesis[]; persistenceFrames?: number; boundingRegion?: { x: number; y: number; w: number; h: number }; generatedAt: number; }
export interface AudioEvent { id: string; sessionId: string; timestamp: number; durationMs: number; frequencyRange: string; rms: number; anomalyScore: number; classification: AudioClassification; confidence: number; rawAsset: string; derivedAssets: { filtered?: string; spectrogram?: string }; analysisVersion: string; analysis?: AnalysisResult; userInterpretation?: string; blindComplete: boolean; }
export interface VisualEvent { id: string; sessionId: string; timestamp: number; durationMs: number; persistenceFrames: number; classification: VisualClassification; confidence: number; rawAsset: string; derivedAssets: { enhanced?: string; contrast?: string; edge?: string; noiseReduced?: string }; analysisVersion: string; analysis?: AnalysisResult; userInterpretation?: string; blindComplete: boolean; }
export interface CorrelatedEvent { id: string; sessionId: string; timestamp: number; durationMs: number; audioEventId: string; visualEventId: string; independentDetection: boolean; aiInterpretation: string; }
export interface Session { id: string; startedAt: number; endedAt?: number; durationMs: number; frequencyBand: FrequencyBandId; micEnabled: boolean; visualEnabled: boolean; status: AppStatus; notes: string; audioEventCount: number; visualEventCount: number; correlatedCount: number; }
export interface FrequencyExperiment { id: string; sessionId?: string; startedAt: number; endedAt?: number; startHz: number; endHz: number; preset: string; durationMs: number; anomalies: number; voiceLike: number; signalStrength: number; }
export const ANALYSIS_VERSION = "sim-0.1.0";
