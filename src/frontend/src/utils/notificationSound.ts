/**
 * Plays a 3-note ascending chime (C5 → E5 → G5) using the Web Audio API.
 * No external audio files needed. Plays only when called explicitly.
 */
export function playNotificationChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    for (let i = 0; i < notes.length; i++) {
      const freq = notes[i];
      const startOffset = i * 0.18;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gainNode.gain.linearRampToValueAtTime(
        0.4,
        ctx.currentTime + startOffset + 0.02,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startOffset + 0.15,
      );

      oscillator.start(ctx.currentTime + startOffset);
      oscillator.stop(ctx.currentTime + startOffset + 0.15);
    }

    // Close context after all notes finish
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Silently fail if Web Audio API not available
  }
}
