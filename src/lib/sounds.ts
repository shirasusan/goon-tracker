/** Short satisfying unlock chime via Web Audio (no asset files). */
export function playAchievementSound(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()

    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.05)
    master.connect(ctx.destination)

    const notes = [
      { freq: 523.25, start: 0, dur: 0.18 }, // C5
      { freq: 659.25, start: 0.1, dur: 0.2 }, // E5
      { freq: 783.99, start: 0.2, dur: 0.28 }, // G5
      { freq: 1046.5, start: 0.34, dur: 0.55 }, // C6
    ]

    for (const note of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(note.freq, now + note.start)

      gain.gain.setValueAtTime(0.0001, now + note.start)
      gain.gain.exponentialRampToValueAtTime(0.5, now + note.start + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur)

      osc.connect(gain)
      gain.connect(master)
      osc.start(now + note.start)
      osc.stop(now + note.start + note.dur + 0.05)
    }

    // Soft sparkle layer
    const sparkle = ctx.createOscillator()
    const sparkleGain = ctx.createGain()
    sparkle.type = 'sine'
    sparkle.frequency.setValueAtTime(2093, now + 0.38)
    sparkleGain.gain.setValueAtTime(0.0001, now + 0.38)
    sparkleGain.gain.exponentialRampToValueAtTime(0.12, now + 0.4)
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85)
    sparkle.connect(sparkleGain)
    sparkleGain.connect(master)
    sparkle.start(now + 0.38)
    sparkle.stop(now + 0.9)

    window.setTimeout(() => {
      void ctx.close()
    }, 1400)
  } catch {
    // Autoplay / unsupported — ignore
  }
}
