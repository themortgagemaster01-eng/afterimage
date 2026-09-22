import type { AnalysisResult, AudioClassification, Hypothesis, VisualClassification } from "./types";
import { ANALYSIS_VERSION } from "./types";
const VOICE_WORDS = ["hello","help","here","wait","yes","no","leave","stay","unclear"];
export function simulateVoiceInterpretation(score: number, classification: AudioClassification): AnalysisResult {
  const hypotheses: Hypothesis[] = [];
  if (["VOICE-LIKE","SPEECH-LIKE","WHISPER-LIKE"].includes(classification)) {
    const a = Math.min(0.62, 0.22 + score * 0.5);
    const b = Math.max(0.12, 0.38 - score * 0.2);
    hypotheses.push({ text: VOICE_WORDS[Math.floor(Math.random()*8)], confidence: a });
    hypotheses.push({ text: "help", confidence: b });
    hypotheses.push({ text: "unclear", confidence: Math.max(0.08, 1-a-b) });
  } else {
    hypotheses.push({ text: "unclear", confidence: 0.78 });
    hypotheses.push({ text: "tonal artifact", confidence: 0.22 });
  }
  return { version: ANALYSIS_VERSION, classification, confidence: hypotheses[0].confidence, description: "AI INTERPRETATION — NOT RAW AUDIO. Simulated local hypotheses only.", hypotheses, generatedAt: Date.now() };
}
export function simulateVisualAnalysis(classification: VisualClassification, persistence: number, confidence: number): AnalysisResult {
  return { version: ANALYSIS_VERSION, classification, confidence, persistenceFrames: persistence, description: `Pattern classification only: ${classification.toLowerCase()} pattern in generated static.`, boundingRegion: { x:0.25, y:0.25, w:0.3, h:0.35 }, generatedAt: Date.now() };
}
