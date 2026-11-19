import { useRef, useState } from 'react'
import { loadMetaPianoSamples, playPianoSample, savePianoSampleBank, type PianoSample } from './pianoSamples'

const FIRST_MIDI = 40 // E2
const LAST_MIDI = 84 // C6
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

function noteName(midi: number) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1)
}

function findNoteSegments(buffer: AudioBuffer): Array<{ start: number; end: number }> {
  const channel = buffer.getChannelData(0)
  const frameSize = Math.max(1, Math.floor(buffer.sampleRate * 0.01))
  const levels: number[] = []
  let peak = 0
  for (let offset = 0; offset < channel.length; offset += frameSize) {
    let energy = 0
    const end = Math.min(channel.length, offset + frameSize)
    for (let i = offset; i < end; i++) energy += channel[i] * channel[i]
    const rms = Math.sqrt(energy / Math.max(1, end - offset))
    levels.push(rms)
    peak = Math.max(peak, rms)
  }
  if (peak < 0.004) return []
  const threshold = Math.max(0.003, peak * 0.055)
  const active = levels.map(level => level >= threshold)
  const raw: Array<{ first: number; last: number }> = []
  let start = -1
  for (let i = 0; i < active.length; i++) {
    if (active[i] && start < 0) start = i
    const isLast = i === active.length - 1
    if (start >= 0 && (!active[i] || isLast)) {
      const last = active[i] && isLast ? i : i - 1
      if (last - start + 1 >= 8) raw.push({ first: start, last })
      start = -1
    }
  }
  const merged: Array<{ first: number; last: number }> = []
  raw.forEach(segment => {
    const previous = merged[merged.length - 1]
    if (previous && segment.first - previous.last <= 12) previous.last = segment.last
    else merged.push({ ...segment })
  })
  const edge = Math.floor(buffer.sampleRate * 0.018)
  return merged.map(segment => ({
    start: Math.max(0, segment.first * frameSize - edge),
    end: Math.min(channel.length, (segment.last + 1) * frameSize + edge),
  })).filter(segment => segment.end - segment.start >= buffer.sampleRate * 0.08)
}

export function PianoSampleBank({ onSaved }: { onSaved: (samples: PianoSample[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewContextRef = useRef<AudioContext | null>(null)
  const [fileName, setFileName] = useState('')
  const [samples, setSamples] = useState<PianoSample[]>([])
  const [message, setMessage] = useState('Chưa tải thư viện piano. Có thể tải bộ Meta Piano 88 phím miễn phí hoặc nạp bản thu riêng.')
  const [busy, setBusy] = useState(false)

  async function loadOfficialMetaPiano() {
    setBusy(true)
    setMessage('Đang tải 88 nốt piano Meta (lớp lực đánh mf)…')
    const context = previewContextRef.current || (previewContextRef.current = new AudioContext())
    try {
      await context.resume()
      const prepared = await loadMetaPianoSamples(context, (loaded, total) => {
        setMessage(`Đang tải sample piano Meta: ${loaded}/${total} nốt…`)
      })
      await savePianoSampleBank(prepared)
      setSamples(prepared)
      setFileName('Meta Piano · 88 phím · CC0 1.0')
      onSaved(prepared)
      setMessage('Đã tải và lưu đủ 88 nốt piano Meta trên thiết bị. Lần sau có thể dùng ngoại tuyến.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải thư viện Meta Piano.')
    } finally {
      setBusy(false)
    }
  }

  async function importRecording(file?: File) {
    if (!file) return
    if (!file.type.startsWith('audio/') && !/\.(m4a|mp3|wav|aiff?)$/i.test(file.name)) {
      setMessage('Tệp không phải định dạng âm thanh được hỗ trợ.')
      return
    }
    if (file.size > 80 * 1024 * 1024) {
      setMessage('Tệp lớn hơn 80 MB. Hãy dùng bản ghi âm ngắn hơn.')
      return
    }
    setBusy(true)
    setMessage('Đang đọc và phân tích bản ghi âm…')
    try {
      const context = new AudioContext()
      const decoded = await context.decodeAudioData(await file.arrayBuffer())
      const segments = findNoteSegments(decoded)
      if (!segments.length) throw new Error('Không phát hiện được các nốt tách biệt. Hãy kiểm tra bản ghi có khoảng lặng giữa các nốt.')
      const count = Math.min(segments.length, LAST_MIDI - FIRST_MIDI + 1)
      const channel = decoded.getChannelData(0)
      const prepared = segments.slice(0, count).map((segment, index) => {
        const samples = channel.slice(segment.start, segment.end)
        const peak = samples.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0)
        if (peak > 0.0001) for (let i = 0; i < samples.length; i++) samples[i] = samples[i] * (0.82 / peak)
        return { midi: FIRST_MIDI + index, sampleRate: decoded.sampleRate, samples, sourceName: file.name }
      })
      setSamples(prepared)
      setFileName(file.name)
      setMessage('Đã tách ' + prepared.length + ' mẫu. Thứ tự được gán lần lượt từ E2 lên từng nửa cung; cần nghe đối chiếu trước khi dùng làm đàn chuẩn.')
      await context.close()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể phân tích bản ghi âm trên trình duyệt này.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function preview(sample: PianoSample) {
    const context = previewContextRef.current || (previewContextRef.current = new AudioContext())
    await context.resume()
    playPianoSample(context, sample, sample.midi, 1.2)
  }

  async function save() {
    if (!samples.length) return
    setBusy(true)
    try {
      await savePianoSampleBank(samples)
      onSaved(samples)
      setMessage('Đã lưu ' + samples.length + ' sample piano trên thiết bị này. Âm thanh không được tải lên máy chủ.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu được bộ sample.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="sample-bank">
    <div className="panel-heading">THƯ VIỆN SAMPLE PIANO</div>
    <p className="hint">Nguồn Meta Open Sound · 88 phím A0–C8 · đang nạp lớp lực đánh mf để thử nghiệm · nguồn gốc có 4 lớp · CC0 1.0.</p>
    <button className="gold-button sample-save" disabled={busy} onClick={loadOfficialMetaPiano}>{busy ? 'Đang xử lý…' : 'Tải piano Meta · 88 phím'}</button>
    <input ref={inputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.aiff" hidden onChange={event => importRecording(event.target.files?.[0])} />
    <button className="mini-tool sample-import" disabled={busy} onClick={() => inputRef.current?.click()}>＋　Nạp bản thu piano riêng</button>
    {fileName && <div className="sample-file-name">{fileName}</div>}
    {samples.length > 0 && <>
      <div className="sample-summary"><strong>{samples.length} nốt</strong><span>{samples.length === 88 ? 'A0 – C8' : noteName(samples[0].midi) + ' – ' + noteName(samples[samples.length - 1].midi)}</span></div>
      <div className="sample-note-grid">{samples.filter((_, index) => samples.length <= 45 || index % 2 === 0).map(sample => <button type="button" key={sample.midi} title={'Nghe mẫu ' + noteName(sample.midi)} aria-label={'Nghe ' + noteName(sample.midi)} onClick={() => preview(sample)}>{noteName(sample.midi)}</button>)}</div>
      <button className="gold-button sample-save" disabled={busy} onClick={save}>Lưu bộ sample trên thiết bị</button>
    </>}
    <p className="hint" role="status">{message}</p>
    <p className="hint">Nguồn mẫu: <a href="https://github.com/facebookincubator/Meta-open-sound" target="_blank" rel="noreferrer">Meta Open Sound</a> · CC0 1.0 Universal.</p>
  </section>
}
