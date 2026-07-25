/**
 * Simple Web Audio API beeps for check-in feedback.
 * No external audio files — pure oscillator tones.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext && "AudioContext" in window) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playBeep(frequency: number, duration: number, type: OscillatorType = "sine"): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export function playSuccessBeep(): void {
  // Rising beep: 600Hz → 800Hz
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(600, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15);
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

export function playAlreadyBeep(): void {
  // Descending beep: 700Hz → 500Hz
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(700, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.2);
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}

export function playErrorBeep(): void {
  // Low error tone: 300Hz for 0.3s
  playBeep(300, 0.3, "square");
}

export function playCheckInSound(status: "success" | "already" | "error"): void {
  switch (status) {
    case "success":
      playSuccessBeep();
      break;
    case "already":
      playAlreadyBeep();
      break;
    case "error":
      playErrorBeep();
      break;
  }
}
