export type PianoSample = {
  midi: number
  sampleRate: number
  samples: Float32Array
  sourceName: string
}

const DB_NAME = 'melolegacy-audio'
const STORE_NAME = 'piano-samples'
const DB_VERSION = 1

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
  audioBuffer.copyToChannel(sample.samples, 0)
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
