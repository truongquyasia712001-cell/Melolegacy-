export type PianoSample = {
  midi: number
  sampleRate: number
  samples: Float32Array
  sourceName: string
}

const DB_NAME = 'melolegacy-audio'
const STORE_NAME = 'piano-samples'
const DB_VERSION = 1
const META_PIANO_OGG = '/audio/meta-piano'
const META_NOTE_NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

function openSampleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'midi' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Không mở được kho sample piano.'))
  })
}

export async function loadPianoSampleBank(): Promise<PianoSample[]> {
  if (typeof indexedDB === 'undefined') return []
  const db = await openSampleDb()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve((request.result || []) as PianoSample[])
      request.onerror = () => reject(request.error || new Error('Không đọc được bộ sample piano.'))
    })
  } finally {
    db.close()
  }
}

export async function savePianoSampleBank(samples: PianoSample[]): Promise<void> {
  const db = await openSampleDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      store.clear()
      samples.forEach(sample => store.put(sample))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('Không lưu được bộ sample piano.'))
      transaction.onabort = () => reject(transaction.error || new Error('Đã hủy lưu bộ sample piano.'))
    })
  } finally {
    db.close()
  }
}

/** Downloads the official CC0 Meta Piano OGGs and stores one mf layer for all 88 keys. */
export async function loadMetaPianoSamples(
  context: AudioContext,
  onProgress?: (loaded: number, total: number) => void,
): Promise<PianoSample[]> {
  const midiNotes = Array.from({ length: 88 }, (_, index) => index + 21)
  const result: PianoSample[] = []
  const batchSize = 5
  for (let offset = 0; offset < midiNotes.length; offset += batchSize) {
    const batch = midiNotes.slice(offset, offset + batchSize)
    const loaded = await Promise.all(batch.map(async midi => {
      const pitchClass = midi % 12
      const octave = Math.floor(midi / 12) - 1
      const file = `INSPiano_Vel03_${META_NOTE_NAMES[pitchClass]}${octave}_01.ogg`
      const response = await fetch(`${META_PIANO_OGG}/${file}`)
      if (!response.ok) throw new Error(`Không tải được mẫu ${META_NOTE_NAMES[pitchClass]}${octave} từ Meta Open Sound (HTTP ${response.status}).`)
      const audio = await context.decodeAudioData(await response.arrayBuffer())
      return {
        midi,
        sampleRate: audio.sampleRate,
        samples: audio.getChannelData(0).slice(),
        sourceName: 'Meta Piano · CC0 1.0',
      } satisfies PianoSample
    }))
    result.push(...loaded)
    onProgress?.(result.length, midiNotes.length)
  }
  return result.sort((a, b) => a.midi - b.midi)
}

export function midiFromPitch(key: string, accidental: '' | '#' | 'b' | 'n' = ''): number {
  const [letter = 'c', octaveText = '4'] = key.split('/')
  const semitones: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
  return (Number(octaveText) + 1) * 12 + (semitones[letter.toLowerCase()] ?? 0) + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
}

export function playPianoSample(
  context: AudioContext,
  sample: PianoSample,
  targetMidi: number,
  seconds: number,
): void {
  const audioBuffer = context.createBuffer(1, sample.samples.length, sample.sampleRate)
  audioBuffer.getChannelData(0).set(sample.samples)
  const source = context.createBufferSource()
  source.buffer = audioBuffer
  source.playbackRate.setValueAtTime(Math.pow(2, (targetMidi - sample.midi) / 12), context.currentTime)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.9, context.currentTime + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + Math.max(0.08, seconds))
  source.connect(gain)
  gain.connect(context.destination)
  source.start()
  source.stop(context.currentTime + Math.max(0.12, seconds) + 0.04)
}
