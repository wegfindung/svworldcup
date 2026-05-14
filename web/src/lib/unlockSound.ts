type AudioContextConstructor = typeof AudioContext
type BrowserWindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor
  }

let audioContext: AudioContext | null = null

function getAudioContextConstructor() {
  const browserWindow = window as BrowserWindowWithWebkitAudio
  return browserWindow.AudioContext ?? browserWindow.webkitAudioContext ?? null
}

function scheduleUnlockTone(context: AudioContext, startAt: number, frequency: number, duration: number) {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(0.14, startAt + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.04)
}

export function playUnlockSound() {
  if (typeof window === 'undefined') {
    return
  }

  const AudioContextType = getAudioContextConstructor()
  if (!AudioContextType) {
    return
  }

  audioContext ??= new AudioContextType()
  void audioContext.resume().catch(() => null)

  const startAt = audioContext.currentTime + 0.02
  scheduleUnlockTone(audioContext, startAt, 523.25, 0.16)
  scheduleUnlockTone(audioContext, startAt + 0.12, 659.25, 0.18)
  scheduleUnlockTone(audioContext, startAt + 0.26, 783.99, 0.24)
}
