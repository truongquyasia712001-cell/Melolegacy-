import { useRef, useState } from 'react'
import { savePianoSampleBank, type PianoSample } from './pianoSamples'

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
  const [fileName, setFileName] = useState('')
  const [samples, setSamples] = useState<PianoSample[]>([])
  const [message, setMessage] = useState('Chưa có bộ sample thu âm. Tải bản ghi từng nốt E2 đến C6 để tạo thư viện piano.')
  const [busy, setBusy] = useState(false)

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
      const AudioContextClass = window.AudioContext
      const context = new AudioContextClass()
      const decoded = await context.decodeAudioData(await file.arrayBuffer())
      const segments = findNoteSegments(decoded)
      if (!segments.length) throw new Error('Không phát hiện được các nốt tách biệt. Hãy kiểm tra bản ghi có khoảng lặng giữa các nốt.')
      const count = Math.min(segments.length, LAST_MIDI - FIRST_MIDI + 1)
      const channel = decoded.getChannelData(0)
      const prepared = segments.slice(0, count).map((segment, index) => ({
        midi: FIRST_MIDI + index,
        sampleRate: decoded.sampleRate,
        samples: channel.slice(segment.start, segment.end),
        sourceName: file.name,
      }))
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
    <p className="hint">Nhận bản ghi từng nốt theo thứ tự E2 → C6, tách khoảng lặng và gán nốt bán cung. Dữ liệu được lưu riêng trong trình duyệt.</p>
    <input ref={inputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.aiff" hidden onChange={event => importRecording(event.target.files?.[0])} />
    <button className="mini-tool sample-import" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? 'Đang xử lý…' : '＋　Nạp bản thu piano'}</button>
    {fileName && <div className="sample-file-name">{fileName}</div>}
    {samples.length > 0 && <>
      <div className="sample-summary"><strong>{samples.length}/{LAST_MIDI - FIRST_MIDI + 1} nốt</strong><span>{noteName(FIRST_MIDI)} – {noteName(FIRST_MIDI + samples.length - 1)}</span></div>
      <div className="sample-note-grid">{samples.map(sample => <span key={sample.midi} title={noteName(sample.midi)}>{noteName(sample.midi)}</span>)}</div>
      <button className="gold-button sample-save" disabled={busy} onClick={save}>Lưu bộ sample trên thiết bị</button>
    </>}
    <p className="hint" role="status">{message}</p>
  </section>
}
