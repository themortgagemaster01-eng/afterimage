/** Real audible-spectrum analysis via Web Audio. Not RF / TV. */
export type NoiseMode = "none" | "white" | "pink" | "sweep";
export interface ScanFrame {
  rms: number; peakHz: number; peakMag: number; bandEnergy: number; totalEnergy: number; speechLike: number;
  waveform: Float32Array; spectrum: Float32Array; bins: { hz: number; mag: number }[]; sweepHz: number | null;
}
export class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  source: MediaStreamAudioSourceNode | null = null;
  stream: MediaStream | null = null;
  bandpass: BiquadFilterNode | null = null;
  noiseGain: GainNode | null = null;
  noiseNode: AudioBufferSourceNode | OscillatorNode | null = null;
  sweepOsc: OscillatorNode | null = null;
  mode: NoiseMode = "none";
  bandMin = 300; bandMax = 3000; sweepHz: number | null = null; sweepMin = 20; sweepMax = 20000;
  private sweepDir = 1;
  async startMic() {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.55;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.bandpass = this.ctx.createBiquadFilter();
    this.bandpass.type = "bandpass";
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.applyBand(this.bandMin, this.bandMax);
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseGain.connect(this.ctx.destination);
  }
  stopMic() {
    this.stopStimulus();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null; this.source?.disconnect(); this.source = null;
    void this.ctx?.close(); this.ctx = null; this.analyser = null; this.bandpass = null; this.noiseGain = null;
  }
  applyBand(min: number, max: number) {
    this.bandMin = Math.max(20, min); this.bandMax = Math.min(20000, max);
    if (!this.bandpass || !this.ctx) return;
    const center = Math.sqrt(this.bandMin * this.bandMax);
    const q = center / Math.max(1, this.bandMax - this.bandMin);
    this.bandpass.frequency.value = center;
    this.bandpass.Q.value = Math.min(12, Math.max(0.3, q * 4));
  }
  setMode(mode: NoiseMode, sweepMin = 20, sweepMax = 20000) {
    this.mode = mode; this.sweepMin = sweepMin; this.sweepMax = sweepMax;
    this.stopStimulus();
    if (!this.ctx || !this.noiseGain) return;
    if (mode === "none") { this.noiseGain.gain.value = 0; return; }
    this.noiseGain.gain.value = 0.08;
    if (mode === "white" || mode === "pink") {
      const src = this.ctx.createBufferSource();
      src.buffer = mode === "white" ? this.makeWhite(2) : this.makePink(2);
      src.loop = true; src.connect(this.noiseGain); src.start(); this.noiseNode = src;
    } else if (mode === "sweep") {
      const osc = this.ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = sweepMin;
      osc.connect(this.noiseGain); osc.start(); this.sweepOsc = osc; this.sweepHz = sweepMin; this.sweepDir = 1;
    }
  }
  tickSweep(dtSec: number) {
    if (this.mode !== "sweep" || !this.sweepOsc || this.sweepHz == null) return;
    const octaves = Math.log2(this.sweepMax / this.sweepMin);
    const speed = Math.pow(2, octaves * 0.12 * dtSec);
    if (this.sweepDir > 0) { this.sweepHz *= speed; if (this.sweepHz >= this.sweepMax) { this.sweepHz = this.sweepMax; this.sweepDir = -1; } }
    else { this.sweepHz /= speed; if (this.sweepHz <= this.sweepMin) { this.sweepHz = this.sweepMin; this.sweepDir = 1; } }
    this.sweepOsc.frequency.setTargetAtTime(this.sweepHz, this.ctx?.currentTime || 0, 0.02);
  }
  stopStimulus() {
    try { this.noiseNode?.stop(); } catch { /* */ }
    try { this.sweepOsc?.stop(); } catch { /* */ }
    this.noiseNode?.disconnect(); this.sweepOsc?.disconnect();
    this.noiseNode = null; this.sweepOsc = null; this.sweepHz = null;
    if (this.noiseGain) this.noiseGain.gain.value = 0;
  }
  read(): ScanFrame {
    const empty: ScanFrame = { rms: 0, peakHz: 0, peakMag: 0, bandEnergy: 0, totalEnergy: 0, speechLike: 0, waveform: new Float32Array(128), spectrum: new Float32Array(64), bins: [], sweepHz: this.sweepHz };
    const analyser = this.analyser; const ctx = this.ctx;
    if (!analyser || !ctx) { for (let i = 0; i < 128; i++) empty.waveform[i] = (Math.random() - 0.5) * 0.02; return empty; }
    const time = new Float32Array(analyser.fftSize);
    const freq = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(time); analyser.getFloatFrequencyData(freq);
    let sum = 0; for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
    const rms = Math.sqrt(sum / time.length);
    const wave = new Float32Array(128); const step = Math.max(1, Math.floor(time.length / 128));
    for (let i = 0; i < 128; i++) wave[i] = time[i * step] || 0;
    const nyquist = ctx.sampleRate / 2; const binHz = nyquist / freq.length;
    let peakHz = 0, peakMag = -Infinity, bandEnergy = 0, totalEnergy = 0, voiceEnergy = 0;
    const bins: { hz: number; mag: number }[] = [];
    for (let i = 1; i < freq.length; i++) {
      const hz = i * binHz; const mag = Math.max(0, (freq[i] + 90) / 80);
      totalEnergy += mag;
      if (hz >= this.bandMin && hz <= this.bandMax) { bandEnergy += mag; bins.push({ hz, mag }); if (mag > peakMag) { peakMag = mag; peakHz = hz; } }
      if (hz >= 300 && hz <= 3400) voiceEnergy += mag;
    }
    const spec = new Float32Array(64);
    if (bins.length) {
      const chunk = Math.max(1, Math.floor(bins.length / 64));
      for (let i = 0; i < 64; i++) { let acc = 0; for (let j = 0; j < chunk; j++) acc += bins[Math.min(bins.length - 1, i * chunk + j)].mag; spec[i] = acc / chunk; }
    }
    const speechLike = totalEnergy > 0 ? Math.min(1, (voiceEnergy / totalEnergy) * (rms * 10 + 0.15)) : 0;
    return { rms, peakHz, peakMag: peakMag === -Infinity ? 0 : peakMag, bandEnergy, totalEnergy, speechLike, waveform: wave, spectrum: spec, bins, sweepHz: this.sweepHz };
  }
  private makeWhite(seconds: number) {
    const ctx = this.ctx!; const len = ctx.sampleRate * seconds; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return buf;
  }
  private makePink(seconds: number) {
    const ctx = this.ctx!; const len = ctx.sampleRate * seconds; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
    return buf;
  }
}
