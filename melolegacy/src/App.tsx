import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Accidental, Beam, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow'
import './App.css'

type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32'
type NoteItem = { id: number; staff: number; measure: number; beat?: number; key: string; duration: Duration; dotted: boolean; accidental: '' | '#' | 'b' | 'n'; rest: boolean }
type Layout = 'solo' | 'large' | 'grand' | 'orchestra'
type ImportedScore = { notes: NoteItem[]; partCount: number; staffCount: number; title: string }
function parseMusicXml(xml: string): ImportedScore {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Tệp MusicXML không hợp lệ.')
  const parts = Array.from(doc.getElementsByTagName('part'))
  if (!parts.length) throw new Error('Không tìm thấy bè nhạc trong MusicXML.')
  const notes: NoteItem[] = []
  let id = 1
  const durationMap: [number, Duration][] = [[4,'w'],[2,'h'],[1,'q'],[0.5,'8'],[0.25,'16'],[0.125,'32']]
  let staffOffset = 0
  parts.forEach((part) => {
    const measures = Array.from(part.getElementsByTagName('measure'))
    const declaredStaffCount = Number(measures[0]?.querySelector('attributes > staves')?.textContent || '1')
    const detectedStaffCount = Math.max(1, declaredStaffCount, ...measures.flatMap(measure =>
      Array.from(measure.children).filter(el => el.tagName === 'note').map(note => Number(note.querySelector('staff')?.textContent || '1'))
    ))
    measures.forEach((measure, measureIndex) => {
      const divisions = Number(measure.querySelector('attributes > divisions')?.textContent || '1')
      let cursorBeat = 0
      let lastStartBeat = 0
      Array.from(measure.children).forEach(element => {
        if (element.tagName === 'backup') { cursorBeat = Math.max(0, cursorBeat - Number(element.querySelector('duration')?.textContent || 0) / divisions); return }
        if (element.tagName === 'forward') { cursorBeat += Number(element.querySelector('duration')?.textContent || 0) / divisions; return }
        if (element.tagName !== 'note') return
        const note = element
        const pitch = note.querySelector('pitch')
        const rest = !!note.querySelector('rest')
        const step = (pitch?.querySelector('step')?.textContent || 'C').toLowerCase()
        const octave = Number(pitch?.querySelector('octave')?.textContent || '4')
        const alter = Number(pitch?.querySelector('alter')?.textContent || '0')
        const accidentalNode = note.querySelector('accidental')?.textContent || ''
        const accidental: NoteItem['accidental'] = accidentalNode === 'sharp' || alter > 0 ? '#' : accidentalNode === 'flat' || alter < 0 ? 'b' : accidentalNode === 'natural' ? 'n' : ''
        const rawDuration = Number(note.querySelector('duration')?.textContent || divisions)
        const quarterLength = rawDuration / divisions
        const duration = durationMap.reduce((best, item) => Math.abs(item[0] - quarterLength) < Math.abs(best[0] - quarterLength) ? item : best, durationMap[2])[1]
        const dotted = !!note.querySelector('dot')
        const localStaff = Math.max(0, Number(note.querySelector('staff')?.textContent || '1') - 1)
        const startBeat = note.querySelector('chord') ? lastStartBeat : cursorBeat
        notes.push({ id: id++, staff: staffOffset + localStaff, measure: measureIndex, beat: startBeat, key: step + '/' + octave, duration, dotted, accidental, rest })
        if (!note.querySelector('chord')) { lastStartBeat = startBeat; cursorBeat += quarterLength }
      })
    })
    staffOffset += detectedStaffCount
  })
  const title = doc.querySelector('work > work-title')?.textContent || doc.querySelector('movement-title')?.textContent || 'Bản nhạc vừa nhận dạng'
  return { notes, partCount: parts.length, staffCount: staffOffset, title }
}
const MeloEcosystem3D = lazy(() => import('./MeloEcosystem3D').then(module => ({ default: module.MeloEcosystem3D })))

const DURATIONS: { value: Duration; label: string; glyph: string }[] = [
  { value: 'w', label: 'Tròn', glyph: '𝅝' }, { value: 'h', label: 'Trắng', glyph: '𝅗𝅥' },
  { value: 'q', label: 'Đen', glyph: '♩' }, { value: '8', label: 'Móc đơn', glyph: '♪' },
  { value: '16', label: 'Móc kép', glyph: '𝅘𝅥𝅯' }, { value: '32', label: 'Móc ba', glyph: '𝅘𝅥𝅰' },
]
const DIATONIC = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
const BEATS: Record<Duration, number> = { w: 4, h: 2, q: 1, '8': .5, '16': .25, '32': .125 }
const SYSTEM_TOP = 94
const SYSTEM_GAP = 96
const GRAND_GAP = 142
const STAFF_SPACING = 9
const STAFF_LINE_COUNT = 5
const STAFF_HEIGHT = (STAFF_LINE_COUNT - 1) * STAFF_SPACING
const CLEF_BOTTOM_NOTE: Record<string, { index: number; octave: number }> = {
  treble: { index: 2, octave: 4 }, bass: { index: 6, octave: 2 },
  alto: { index: 5, octave: 3 }, tenor: { index: 1, octave: 3 },
}

function makeVexNote(item: NoteItem, clef: string) {
  const duration = item.duration + (item.dotted ? 'd' : '') + (item.rest ? 'r' : '')
  const note = new StaveNote({ keys: [item.rest ? 'b/4' : item.key], duration, clef })
  if (item.accidental && !item.rest) note.addModifier(new Accidental(item.accidental), 0)
  return note
}

function App() {
  const [layout, setLayout] = useState<Layout>('solo')
  const [showEcosystemMap, setShowEcosystemMap] = useState(false)
  const [duration, setDuration] = useState<Duration>('q')
  const [dotted, setDotted] = useState(false)
  const [rest, setRest] = useState(false)
  const [accidental, setAccidental] = useState<NoteItem['accidental']>('')
  const [clef, setClef] = useState<'treble' | 'bass' | 'alto' | 'tenor'>('treble')
  const [time, setTime] = useState('4/4')
  const [keySig, setKeySig] = useState('C')
  const [title, setTitle] = useState('Tác phẩm mới')
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('melo-composer-notes-v2') || '[]') as NoteItem[] } catch { return [] }
  })
  const [history, setHistory] = useState<NoteItem[][]>([])
  const [future, setFuture] = useState<NoteItem[][]>([])
  const [status, setStatus] = useState('Đã lưu trên thiết bị')
  const [dynamic, setDynamic] = useState('mf')
  const [tempo, setTempo] = useState(80)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeNoteIds, setActiveNoteIds] = useState<number[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const playbackRunRef = useRef(0)
  const [omrBusy, setOmrBusy] = useState(false)
  const [omrMessage, setOmrMessage] = useState('Chọn tệp PDF để nhận dạng bản nhạc.')
  const [omrJobId, setOmrJobId] = useState('')
  const [importedStaffCount, setImportedStaffCount] = useState<number | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const scoreRef = useRef<HTMLDivElement>(null)

  const measureCount = Math.max(4, ...notes.map(note => note.measure + 1))
  const baseSystems = layout === 'solo' ? 10 : layout === 'large' ? 6 : 5
  const systems = Math.max(baseSystems, Math.ceil(measureCount / 4))
  const stavesPerSystem = layout === 'grand' ? 2 : layout === 'orchestra' ? (importedStaffCount ?? 4) : 1
  const systemGap = layout === 'grand' ? GRAND_GAP : layout === 'orchestra' ? Math.max(SYSTEM_GAP, (stavesPerSystem - 1) * 68 + STAFF_HEIGHT + 30) : SYSTEM_GAP
  const paperHeight = Math.max(1123, 190 + systems * systemGap)

  useEffect(() => {
    localStorage.setItem('melo-composer-notes-v2', JSON.stringify(notes))
    setStatus('Đã lưu trên thiết bị')
  }, [notes])

  const grouped = useMemo(() => {
    const result = new Map<string, NoteItem[]>()
    notes.forEach(note => {
      const id = note.staff + ':' + note.measure
      result.set(id, [...(result.get(id) || []), note])
    })
    return result
  }, [notes])

  useEffect(() => {
    const host = scoreRef.current
    if (!host) return
    host.innerHTML = ''
    try {
      const width = Math.max(320, host.clientWidth || 760)
      const renderer = new Renderer(host, Renderer.Backends.SVG)
      renderer.resize(width, paperHeight)
      const context = renderer.getContext()
      const margin = 42
      const measureGap = 3
      const measureWidth = (width - margin * 2) / 4
      for (let system = 0; system < systems; system++) {
        const baseY = SYSTEM_TOP + system * systemGap
        for (let part = 0; part < stavesPerSystem; part++) {
          const staffIndex = part
          const y = baseY + part * 68
          const activeClef = layout === 'grand' ? (part === 0 ? 'treble' : 'bass') : (layout === 'orchestra' && part > 0 ? 'bass' : clef)
          for (let bar = 0; bar < 4; bar++) {
            const x = margin + bar * measureWidth
            const stave = new Stave(x, y, measureWidth - measureGap)
            if (bar === 0) {
              stave.addClef(activeClef)
              stave.addTimeSignature(time)
              if (keySig !== 'C') stave.addKeySignature(keySig)
            }
            stave.setContext(context).draw()
            const measureIndex = system * 4 + bar
            const items = grouped.get(staffIndex + ':' + measureIndex) || []
            if (!items.length) continue
            const tickables = items.map(item => {
              const note = makeVexNote(item, activeClef)
              if (item.dotted) note.addModifier // VexFlow duration carries the dot
              return note
            })
            const voice = new Voice({ numBeats: Number(time.split('/')[0]) || 4, beatValue: Number(time.split('/')[1]) || 4 })
            voice.setMode(Voice.Mode.SOFT)
            voice.addTickables(tickables)
            new Formatter().joinVoices([voice]).format([voice], measureWidth - 58)
            voice.draw(context, stave)
            tickables.forEach((tickable, index) => {
              const element = tickable.getSVGElement()
              if (element) element.setAttribute('data-note-id', String(items[index].id))
            })
            const beams = Beam.generateBeams(tickables)
            beams.forEach(beam => beam.setContext(context).draw())
          }
        }
      }
      const svg = host.querySelector('svg')
      if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Bản nhạc được khắc ký âm bằng VexFlow') }
    } catch (error) {
      console.error('Music engraving error', error)
      setStatus('Có lỗi khi dàn trang ký âm')
    }
  }, [notes, layout, clef, time, keySig, systems, stavesPerSystem, paperHeight, grouped])

  useEffect(() => {
    const host = scoreRef.current
    if (!host) return
    host.querySelectorAll('[data-note-id]').forEach(element => {
      const id = Number(element.getAttribute('data-note-id'))
      element.classList.toggle('is-playing', activeNoteIds.includes(id))
    })
  }, [activeNoteIds, notes, layout])

  function stopPlayback() {
    playbackRunRef.current += 1
    setIsPlaying(false)
    setActiveNoteIds([])
  }

  function playPianoTone(key: string, accidentalValue: NoteItem['accidental'], seconds: number) {
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return
    const context = audioContextRef.current || (audioContextRef.current = new AudioContextClass())
    const [letter = 'c', octaveText = '4'] = key.split('/')
    const semitones: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
    const midi = (Number(octaveText) + 1) * 12 + (semitones[letter.toLowerCase()] ?? 0) + (accidentalValue === '#' ? 1 : accidentalValue === 'b' ? -1 : 0)
    const frequency = 440 * Math.pow(2, (midi - 69) / 12)
    const master = context.createGain()
    master.gain.setValueAtTime(0.0001, context.currentTime)
    master.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.012)
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + Math.max(0.08, seconds))
    master.connect(context.destination)
    ;[1, 2, 3, 4].forEach((partial, index) => {
      const oscillator = context.createOscillator()
      const partialGain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency * partial, context.currentTime)
      partialGain.gain.value = [1, 0.32, 0.12, 0.045][index]
      oscillator.connect(partialGain)
      partialGain.connect(master)
      oscillator.start()
      oscillator.stop(context.currentTime + Math.max(0.1, seconds) + 0.03)
    })
  }

  async function togglePlayback() {
    if (isPlaying) { stopPlayback(); return }
    if (!notes.length) { setStatus('Chưa có nốt nhạc để phát'); return }
    const run = ++playbackRunRef.current
    const context = audioContextRef.current || (audioContextRef.current = new AudioContext())
    await context.resume()
    setIsPlaying(true)
    const beatSeconds = 60 / Math.max(20, Math.min(300, tempo)) / playbackRate
    const measureBeats = ((Number(time.split('/')[0]) || 4) * 4) / (Number(time.split('/')[1]) || 4)
    const fallbackBeat = new Map<string, number>()
    const events = notes.map(note => {
      const group = note.staff + ':' + note.measure
      const beat = Number.isFinite(note.beat) ? Number(note.beat) : (fallbackBeat.get(group) || 0)
      if (!Number.isFinite(note.beat)) fallbackBeat.set(group, beat + BEATS[note.duration] * (note.dotted ? 1.5 : 1))
      return { note, at: note.measure * measureBeats + beat, length: BEATS[note.duration] * (note.dotted ? 1.5 : 1) }
    }).sort((a, b) => a.at - b.at || a.note.staff - b.note.staff || a.note.id - b.note.id)
    let index = 0
    let currentBeat = events[0]?.at ?? 0
    while (index < events.length && playbackRunRef.current === run) {
      const simultaneous = events.filter(event => Math.abs(event.at - currentBeat) < 0.0001)
      const groupIds = simultaneous.map(event => event.note.id)
      setActiveNoteIds(groupIds)
      simultaneous.forEach(({ note, length }) => {
        if (!note.rest) playPianoTone(note.key, note.accidental, Math.max(0.07, length * beatSeconds * 0.88))
      })
      index += simultaneous.length
      const nextBeat = events[index]?.at
      const waitBeats = nextBeat === undefined ? Math.max(0.25, ...simultaneous.map(event => event.length)) : Math.max(0.04, nextBeat - currentBeat)
      await new Promise(resolve => window.setTimeout(resolve, waitBeats * beatSeconds * 1000))
      currentBeat = nextBeat ?? currentBeat + waitBeats
    }
    if (playbackRunRef.current === run) { setIsPlaying(false); setActiveNoteIds([]) }
  }

  function commit(next: NoteItem[]) {
    setHistory(prev => [...prev, notes])
    setFuture([])
    setNotes(next)
  }

  function addFromCanvas(event: React.MouseEvent<HTMLDivElement>) {
    const host = scoreRef.current
    const svg = host?.querySelector('svg')
    if (!host || !svg) return
    // Convert the pointer through the rendered SVG's actual viewBox. This keeps
    // note placement aligned after responsive scaling, zooming and scrolling.
    const rect = svg.getBoundingClientRect()
    const viewBox = svg.viewBox.baseVal
    const scaleX = viewBox.width / rect.width
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * (viewBox.height / rect.height)
    const system = Math.round((y - SYSTEM_TOP) / systemGap)
    if (system < 0 || system >= systems) return
    const baseY = SYSTEM_TOP + system * systemGap
    const localY = y - baseY
    let part = 0
    let activeClef = clef
    if (layout === 'grand') {
      part = Math.abs(localY - 68) < Math.abs(localY) ? 1 : 0
      activeClef = part === 0 ? 'treble' : 'bass'
    } else if (layout === 'orchestra') {
      part = Math.max(0, Math.min(stavesPerSystem - 1, Math.round(localY / 68)))
      activeClef = part === 0 ? 'treble' : 'bass'
    }
    const staffIndex = part
    const staffY = baseY + part * 68
    const bottom = CLEF_BOTTOM_NOTE[activeClef]
    // One diatonic step is exactly half the distance between staff lines.
    const step = Math.round((staffY + STAFF_HEIGHT - y) / (STAFF_SPACING / 2))
    const pitchIndex = bottom.index + step
    const name = DIATONIC[((pitchIndex % 7) + 7) % 7]
    const octave = bottom.octave + Math.floor(pitchIndex / 7)
    const key = name + '/' + octave
    const measureWidth = (viewBox.width - 84) / 4
    const measure = Math.max(0, Math.min(3, Math.floor((x - 42) / measureWidth)))
    const measureIndex = system * 4 + measure
    const current = grouped.get(staffIndex + ':' + measureIndex) || []
    const beatLimit = ((Number(time.split('/')[0]) || 4) * 4) / (Number(time.split('/')[1]) || 4)
    const used = current.reduce((sum, n) => sum + BEATS[n.duration] * (n.dotted ? 1.5 : 1), 0)
    if (used + BEATS[duration] * (dotted ? 1.5 : 1) > beatLimit + 0.001) {
      setStatus('Ô nhịp đã đủ trường độ. Hãy chọn ô nhịp kế tiếp.')
      return
    }
    const item: NoteItem = { id: Date.now() + Math.random(), staff: staffIndex, measure: measureIndex, beat: used, key, duration, dotted, accidental, rest }
    commit([...notes, item])
    setStatus('Đã thêm ký hiệu vào ô nhịp')
  }

  function undo() {
    if (!history.length) return
    setFuture(prev => [notes, ...prev])
    setNotes(history[history.length - 1])
    setHistory(prev => prev.slice(0, -1))
  }
  function redo() {
    if (!future.length) return
    setHistory(prev => [...prev, notes])
    setNotes(future[0])
    setFuture(prev => prev.slice(1))
  }
  function clearScore() {
    if (window.confirm('Xóa toàn bộ ký hiệu trên bản nhạc?')) commit([])
  }

  async function recognizePdf(file?: File) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setOmrMessage('Chỉ nhận tệp PDF bản nhạc.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setOmrMessage('PDF này lớn hơn 4 MB. Cổng tải trung gian hiện tại chưa nhận tệp lớn; cần hoàn tất luồng tải trực tiếp lên máy chủ OMR trước khi xử lý tệp này.')
      return
    }
    setOmrBusy(true)
    setOmrJobId('')
    setOmrMessage('Đang tải PDF lên dịch vụ nhận dạng…')
    try {
      const body = new FormData()
      body.append('pdf', file)
      const createdResponse = await fetch('/api/omr/jobs', { method: 'POST', body })
      if (!createdResponse.ok) throw new Error(await createdResponse.text() || 'Không thể gửi PDF đến máy chủ nhận dạng.')
      const created = await createdResponse.json() as { id: string }
      setOmrJobId(created.id)
      let completed = false
      for (let attempt = 0; attempt < 450; attempt++) {
        await new Promise(resolve => window.setTimeout(resolve, 2000))
        const statusResponse = await fetch('/api/omr/jobs/' + encodeURIComponent(created.id))
        if (!statusResponse.ok) throw new Error(await statusResponse.text() || 'Không đọc được trạng thái nhận dạng.')
        const job = await statusResponse.json() as { status: string; error?: string }
        if (job.status === 'failed') throw new Error(job.error || 'Audiveris không nhận dạng được tệp này.')
        if (job.status === 'completed') { completed = true; break }
        setOmrMessage(job.status === 'processing' ? 'Audiveris đang phân tích khuông nhạc, nốt và ký hiệu…' : 'PDF đã vào hàng đợi nhận dạng…')
      }
      if (!completed) throw new Error('Quá thời gian chờ nhận dạng. Anh có thể thử lại với PDF ít trang hơn.')
      setOmrMessage('Đang nạp MusicXML vào trình soạn nhạc…')
      const xmlResponse = await fetch('/api/omr/jobs/' + encodeURIComponent(created.id) + '/musicxml')
      if (!xmlResponse.ok) throw new Error(await xmlResponse.text() || 'Không tải được MusicXML.')
      const imported = parseMusicXml(await xmlResponse.text())
      if (!imported.notes.length) throw new Error('MusicXML không có nốt nhạc để đưa vào trình soạn.')
      commit(imported.notes)
      setTitle(imported.title)
      setLayout(imported.partCount > 1 ? 'orchestra' : 'solo')
      setImportedStaffCount(imported.staffCount)
      setOmrMessage('Đã nạp ' + imported.notes.length + ' ký hiệu từ ' + imported.partCount + ' bè. Anh có thể kiểm tra và chỉnh sửa trên khuông nhạc.')
      setStatus('Đã nhập bản nhạc từ MusicXML')
    } catch (error) {
      setOmrMessage(error instanceof Error ? error.message : 'Có lỗi trong quá trình nhận dạng PDF.')
    } finally {
      setOmrBusy(false)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
    }
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">M</div><div><strong>MeloLegacy</strong><span>{showEcosystemMap ? 'BẢN ĐỒ HỆ SINH THÁI' : 'PHÒNG SOẠN NHẠC'}</span></div></div>
      <div className="top-actions"><button className="map-toggle-button" onClick={() => setShowEcosystemMap(value => !value)}>{showEcosystemMap ? 'Phòng Soạn Nhạc' : 'Bản đồ Melo'}</button><span className="save-state"><i />{status}</span><button className="gold-button" onClick={() => window.print()}>Xuất PDF</button></div>
    </header>
    {showEcosystemMap ? <Suspense fallback={<div className="melo-map-loading">Đang mở sơ đồ 3D…</div>}><MeloEcosystem3D onClose={() => setShowEcosystemMap(false)} /></Suspense> : <><section className="workspace">
      <aside className="tool-panel">
        <div className="panel-heading">TÁC PHẨM</div>
        <label className="field-label" htmlFor="score-title">Tên tác phẩm</label>
        <input id="score-title" className="title-input" value={title} onChange={e => setTitle(e.target.value)} />
        <div className="panel-heading">BỐ CỤC KHUÔNG NHẠC</div>
        <div className="layout-options">
          {(['solo', 'large', 'grand', 'orchestra'] as Layout[]).map((item, index) => <button key={item} className={layout === item ? 'layout-choice selected' : 'layout-choice'} onClick={() => setLayout(item)}><span className="layout-icon">{['≋', '☰', '𝄞\n𝄢', '♬'][index]}</span><span><b>{['Solo', 'Khuông lớn', 'Đại khuông', 'Dàn nhạc'][index]}</b><small>{['10 khuông · Một bè', '6 khuông · Cỡ lớn', 'Sol + Fa · Piano', '4 bè · Phác thảo tổng phổ'][index]}</small></span></button>)}
        </div>
        <div className="panel-heading">TRƯỜNG ĐỘ · KÝ HIỆU CHUẨN</div>
        <div className="duration-grid">
          {DURATIONS.map(item => <button key={item.value} className={duration === item.value ? 'duration selected' : 'duration'} onClick={() => { setDuration(item.value); setRest(false) }}><span>{item.glyph}</span><small>{item.label}</small></button>)}
        </div>
        <div className="note-options">
          <button className={dotted ? 'mini-tool selected' : 'mini-tool'} onClick={() => setDotted(!dotted)}>·　Chấm dôi</button>
          <button className={rest ? 'mini-tool selected' : 'mini-tool'} onClick={() => setRest(!rest)}>𝄽　Dấu nghỉ</button>
        </div>
        <div className="panel-heading">DẤU HÓA</div>
        <div className="accidental-grid">{([{ value: '', label: 'Không' }, { value: '#', label: 'Thăng ♯' }, { value: 'b', label: 'Giáng ♭' }, { value: 'n', label: 'Bình ♮' }] as const).map(item => <button key={item.value || 'none'} className={accidental === item.value ? 'mini-tool selected' : 'mini-tool'} onClick={() => setAccidental(item.value)}>{item.label}</button>)}</div>
        <div className="panel-heading">KHÓA · NHỊP · HÓA BIỂU</div>
        <label className="field-label" htmlFor="clef">Khóa nhạc</label><select id="clef" className="title-input" value={clef} onChange={e => setClef(e.target.value as typeof clef)}><option value="treble">Khóa Sol</option><option value="bass">Khóa Fa</option><option value="alto">Khóa Đô (Alto)</option><option value="tenor">Khóa Đô (Tenor)</option></select>
        <div className="setting-row"><label className="field-label" htmlFor="time">Nhịp</label><select id="time" value={time} onChange={e => setTime(e.target.value)}><option>4/4</option><option>3/4</option><option>2/4</option><option>6/8</option><option>9/8</option><option>12/8</option></select></div>
        <div className="setting-row"><label className="field-label" htmlFor="key">Hóa biểu</label><select id="key" value={keySig} onChange={e => setKeySig(e.target.value)}>{['C','G','D','A','E','B','F','Bb','Eb','Ab','Db','Gb'].map(k => <option key={k}>{k}</option>)}</select></div>
        <div className="panel-heading">ÂM NHẠC · PHÁT LẠI</div>
        <div className="setting-row"><label className="field-label" htmlFor="tempo">Tempo ♩</label><input id="tempo" type="number" min="20" max="300" value={tempo} onChange={e => setTempo(Number(e.target.value))}/></div>
        <div className="setting-row"><label className="field-label" htmlFor="playback-rate">Tốc độ đọc</label><select id="playback-rate" value={playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))}><option value={0.5}>0,5× · Rất chậm</option><option value={0.75}>0,75× · Chậm</option><option value={1}>1× · Chuẩn</option><option value={1.25}>1,25× · Nhanh</option><option value={1.5}>1,5× · Rất nhanh</option></select></div>
        <button className="gold-button piano-play-button" onClick={togglePlayback} disabled={!notes.length}>{isPlaying ? 'Ⅱ　Dừng đọc' : '▶　Nghe piano & đọc nốt'}</button>
        <p className="hint">Âm thanh piano mô phỏng bằng Web Audio. Nốt đang phát sẽ được tô sáng trên khuông nhạc.</p>
        <div className="setting-row"><label className="field-label" htmlFor="dynamic">Cường độ</label><select id="dynamic" value={dynamic} onChange={e => setDynamic(e.target.value)}>{['pp','p','mp','mf','f','ff'].map(v => <option key={v}>{v}</option>)}</select></div>
        <div className="action-stack"><button onClick={undo} disabled={!history.length}>↶　Hoàn tác</button><button onClick={redo} disabled={!future.length}>↷　Làm lại</button><button onClick={clearScore}>⌫　Xóa bản nhạc</button></div>
        <p className="hint">Chọn trường độ và chạm đúng vị trí trên khuông để ghi nốt. Các nốt được khắc bằng bộ máy ký âm VexFlow.</p>
        <div className="panel-foot">Bản nhạc lưu cục bộ trên thiết bị này.</div>
      </aside>
      <section className="score-area">
        <div className="omr-panel">
          <div className="omr-copy"><strong>Nhận dạng bản nhạc PDF</strong><span>{omrMessage}</span>{omrJobId && <small>Mã xử lý: {omrJobId}</small>}</div>
          <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" disabled={omrBusy} onChange={event => recognizePdf(event.target.files?.[0])} />
          <button className="gold-button" disabled={omrBusy} onClick={() => pdfInputRef.current?.click()}>{omrBusy ? 'Đang nhận dạng…' : 'Tải PDF lên'}</button>
        </div>
        <div className="score-toolbar"><div><span className="crumb">MeloLegacy</span><span className="slash">/</span><b>Phòng Soạn Nhạc</b></div><div className="zoom-label">A4 · Dọc · {systems} hệ thống</div></div>
        <div className="paper-wrap"><div className="paper" style={{ minHeight: paperHeight }}>
          <div className="paper-head"><div className="paper-kicker">MELOLEGACY · MUSIC COMPOSITION</div><h1>{title || 'Tác phẩm mới'}</h1><div className="paper-meta"><span>Tác giả: __________________</span><span>♩ = {tempo}　{dynamic}</span></div></div>
          <div className="notation-host" ref={scoreRef} onClick={addFromCanvas} style={{ minHeight: paperHeight - 180 }} />
          <div className="paper-bottom"><span>MeloLegacy · Di sản âm nhạc</span><span>Trang 1</span></div>
        </div></div>
      </section>
    </section>
    <footer className="mobile-note">Chọn trường độ rồi chạm vào khuông nhạc để ghi nốt. Xoay iPad ngang để có vùng làm việc rộng hơn.</footer></>}
  </main>
}
export default App
