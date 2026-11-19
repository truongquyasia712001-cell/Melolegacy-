import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Accidental, Beam, Formatter, Renderer, Stave, StaveNote, Voice, VexFlow } from 'vexflow'
import './App.css'
import { loadLocalScore, saveLocalScore } from './localScoreStore'

type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32'
type NoteItem = { id: number; staff: number; measure: number; key: string; duration: Duration; dotted: boolean; accidental: '' | '#' | 'b' | 'n'; rest: boolean }
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
      Array.from(measure.children).filter(el => el.tagName === 'note').forEach(note => {
        const pitch = note.querySelector('pitch')
        const rest = !!note.querySelector('rest')
        const step = (pitch?.querySelector('step')?.textContent || 'C').toLowerCase()
        const octave = Number(pitch?.querySelector('octave')?.textContent || '4')
        const alter = Number(pitch?.querySelector('alter')?.textContent || '0')
        const accidentalNode = note.querySelector('accidental')?.textContent || ''
        const accidental: NoteItem['accidental'] = accidentalNode === 'sharp' || alter > 0 ? '#' : accidentalNode === 'flat' || alter < 0 ? 'b' : accidentalNode === 'natural' ? 'n' : ''
        const quarterLength = Number(note.querySelector('duration')?.textContent || divisions) / divisions
        const duration = durationMap.reduce((best, item) => Math.abs(item[0] - quarterLength) < Math.abs(best[0] - quarterLength) ? item : best, durationMap[2])[1]
        const dotted = !!note.querySelector('dot')
        const localStaff = Math.max(0, Number(note.querySelector('staff')?.textContent || '1') - 1)
        notes.push({ id: id++, staff: staffOffset + localStaff, measure: measureIndex, key: step + '/' + octave, duration, dotted, accidental, rest })
      })
    })
    staffOffset += detectedStaffCount
  })
  const title = doc.querySelector('work > work-title')?.textContent || doc.querySelector('movement-title')?.textContent || 'Bản nhạc vừa nhận dạng'
  return { notes, partCount: parts.length, staffCount: staffOffset, title }
}
const MeloEcosystem3D = lazy(() => import('./MeloEcosystem3D').then(module => ({ default: module.MeloEcosystem3D })))

const DURATIONS: { value: Duration; label: string; glyph: string }[] = [
  { value: 'w', label: 'Tròn', glyph: '\uE1D2' }, { value: 'h', label: 'Trắng', glyph: '\uE1D3' },
  { value: 'q', label: 'Đen', glyph: '\uE1D5' }, { value: '8', label: 'Móc đơn', glyph: '\uE1D7' },
  { value: '16', label: 'Móc kép', glyph: '\uE1D9' }, { value: '32', label: 'Móc ba', glyph: '\uE1DB' },
]
const DIATONIC = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
const BEATS: Record<Duration, number> = { w: 4, h: 2, q: 1, '8': .5, '16': .25, '32': .125 }
const SYSTEM_TOP = 82
const SYSTEM_GAP = 86
const GRAND_GAP = 124
const STAFF_GROUP_GAP = 62
const STAFF_SPACING = 8
const STAFF_LINE_COUNT = 5
const STAFF_HEIGHT = (STAFF_LINE_COUNT - 1) * STAFF_SPACING
const MEASURES_PER_SYSTEM = 3
const SCORE_MARGIN = 34
const CLEF_BOTTOM_NOTE: Record<string, { index: number; octave: number }> = {
  treble: { index: 2, octave: 4 }, bass: { index: 6, octave: 2 },
  alto: { index: 5, octave: 3 }, tenor: { index: 1, octave: 3 },
}

function makeVexNote(item: NoteItem, clef: string) {
  const duration = item.duration + (item.dotted ? 'd' : '') + (item.rest ? 'r' : '')
  const note = new StaveNote({ keys: [item.rest ? 'b/4' : item.key], duration, clef, glyphFontScale: 34 })
  if (item.accidental && !item.rest) note.addModifier(new Accidental(item.accidental), 0)
  return note
}

function App() {
  const [layout, setLayout] = useState<Layout>('solo')
  const [showEcosystemMap, setShowEcosystemMap] = useState(false)
  const [activeTool, setActiveTool] = useState<'file' | 'layout' | 'notes' | 'score' | 'playback' | 'edit' | 'write' | null>(null)
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
  const [status, setStatus] = useState('Đang mở dữ liệu trên thiết bị…')
  const [storageReady, setStorageReady] = useState(false)
  const [musicFontReady, setMusicFontReady] = useState(false)
  const handwritingCanvasRef = useRef<HTMLCanvasElement>(null)
  const inkPointerRef = useRef<number | null>(null)
  const [sourceMusicXml, setSourceMusicXml] = useState<string | null>(null)
  const [dynamic, setDynamic] = useState('mf')
  const [tempo, setTempo] = useState(80)
  const [omrBusy, setOmrBusy] = useState(false)
  const [omrMessage, setOmrMessage] = useState('Chọn tệp PDF để nhận dạng bản nhạc.')
  const [omrJobId, setOmrJobId] = useState('')
  const [importedStaffCount, setImportedStaffCount] = useState<number | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const backupInputRef = useRef<HTMLInputElement>(null)
  const scoreRef = useRef<HTMLDivElement>(null)

  const measureCount = Math.max(4, ...notes.map(note => note.measure + 1))
  const baseSystems = 4
  const systems = Math.max(baseSystems, Math.ceil(measureCount / MEASURES_PER_SYSTEM))
  const stavesPerSystem = layout === 'grand' ? 2 : layout === 'orchestra' ? (importedStaffCount ?? 4) : 1
  const systemGap = layout === 'grand' ? GRAND_GAP : layout === 'orchestra' ? Math.max(SYSTEM_GAP, (stavesPerSystem - 1) * STAFF_GROUP_GAP + STAFF_HEIGHT + 26) : SYSTEM_GAP
  const paperHeight = Math.max(1123, 190 + systems * systemGap)

  useEffect(() => {
    let active = true
    VexFlow.loadFonts('Bravura', 'Academico').then(() => {
      if (!active) return
      VexFlow.setFonts('Bravura', 'Academico')
      setMusicFontReady(true)
    }).catch(() => {
      if (active) {
        setMusicFontReady(true)
        setStatus('Đang dùng bộ ký âm tích hợp; không tải được phông chữ văn bản bổ trợ')
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    loadLocalScore().then(snapshot => {
      if (!active) return
      if (snapshot) {
        setNotes(Array.isArray(snapshot.notes) ? snapshot.notes as NoteItem[] : [])
        setTitle(snapshot.title)
        setLayout(snapshot.layout as Layout)
        setClef(snapshot.clef as typeof clef)
        setTime(snapshot.time)
        setKeySig(snapshot.keySig)
        setTempo(snapshot.tempo)
        setDynamic(snapshot.dynamic)
        setSourceMusicXml(snapshot.sourceMusicXml)
      }
      setStorageReady(true)
      setStatus('Dữ liệu trên thiết bị đã sẵn sàng')
    }).catch(error => {
      if (!active) return
      setStorageReady(true)
      setStatus(error instanceof Error ? error.message : 'Không đọc được dữ liệu cục bộ')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    saveLocalScore({ notes, title, layout, clef, time, keySig, tempo, dynamic, sourceMusicXml })
      .then(() => setStatus('Đã lưu trên thiết bị'))
      .catch(error => setStatus(error instanceof Error ? error.message : 'Không lưu được dữ liệu trên thiết bị'))
  }, [storageReady, notes, title, layout, clef, time, keySig, tempo, dynamic, sourceMusicXml])

  function downloadScoreBackup() {
    const backup = {
      format: 'MeloLegacyScoreBackup', version: 1, exportedAt: new Date().toISOString(),
      notes, title, layout, clef, time, keySig, tempo, dynamic, sourceMusicXml,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'melolegacy-sao-luu-tac-pham.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function restoreScoreBackup(file?: File) {
    if (!file) return
    try {
      const candidate: unknown = JSON.parse(await file.text())
      if (!candidate || typeof candidate !== 'object') throw new Error('Tệp sao lưu không đúng định dạng MeloLegacy.')
      const data = candidate as Record<string, unknown>
      const validNotes = Array.isArray(data.notes) && data.notes.every(value => {
        if (!value || typeof value !== 'object') return false
        const note = value as Record<string, unknown>
        return typeof note.id === 'number' && Number.isInteger(note.staff) && Number.isInteger(note.measure)
          && typeof note.key === 'string' && ['w', 'h', 'q', '8', '16', '32'].includes(String(note.duration))
          && typeof note.dotted === 'boolean' && ['', '#', 'b', 'n'].includes(String(note.accidental))
          && typeof note.rest === 'boolean'
      })
      if (data.format !== 'MeloLegacyScoreBackup' || data.version !== 1 || !validNotes
        || typeof data.title !== 'string' || typeof data.layout !== 'string'
        || !['solo', 'large', 'grand', 'orchestra'].includes(data.layout)
        || typeof data.clef !== 'string' || !['treble', 'bass', 'alto', 'tenor'].includes(data.clef)
        || typeof data.time !== 'string' || typeof data.keySig !== 'string'
        || typeof data.tempo !== 'number' || typeof data.dynamic !== 'string'
        || !(typeof data.sourceMusicXml === 'string' || data.sourceMusicXml === null)) {
        throw new Error('Tệp sao lưu thiếu dữ liệu hoặc không tương thích với phiên bản này.')
      }
      if (!window.confirm('Khôi phục bản sao lưu sẽ thay thế tác phẩm đang mở. Anh muốn tiếp tục không?')) return
      commit(data.notes as NoteItem[])
      setTitle(data.title)
      setLayout(data.layout as Layout)
      setClef(data.clef as typeof clef)
      setTime(data.time)
      setKeySig(data.keySig)
      setTempo(data.tempo)
      setDynamic(data.dynamic)
      setSourceMusicXml(data.sourceMusicXml)
      setOmrMessage('Đã khôi phục bản sao lưu trên thiết bị.')
      setStatus('Đã khôi phục bản sao lưu')
    } catch (error) {
      setOmrMessage(error instanceof Error ? error.message : 'Không thể đọc tệp sao lưu.')
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = ''
    }
  }

  function downloadOriginalMusicXml() {
    if (!sourceMusicXml) return
    const blob = new Blob([sourceMusicXml], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'melolegacy-ban-goc.musicxml'
    link.click()
    URL.revokeObjectURL(url)
  }

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
      if (!musicFontReady) return
    const width = Math.max(320, host.clientWidth || 760)
      const renderer = new Renderer(host, Renderer.Backends.SVG)
      renderer.resize(width, paperHeight)
      const context = renderer.getContext()
      const margin = SCORE_MARGIN
      const measureGap = 3
      const measureWidth = (width - margin * 2) / MEASURES_PER_SYSTEM
      for (let system = 0; system < systems; system++) {
        const baseY = SYSTEM_TOP + system * systemGap
        for (let part = 0; part < stavesPerSystem; part++) {
          const staffIndex = part
          const y = baseY + part * STAFF_GROUP_GAP
          const activeClef = layout === 'grand' ? (part === 0 ? 'treble' : 'bass') : (layout === 'orchestra' && part > 0 ? 'bass' : clef)
          for (let bar = 0; bar < MEASURES_PER_SYSTEM; bar++) {
            const x = margin + bar * measureWidth
            const stave = new Stave(x, y, measureWidth - measureGap, { spacingBetweenLinesPx: STAFF_SPACING })
            if (bar === 0) {
              stave.addClef(activeClef, 'small')
              stave.addTimeSignature(time)
              if (keySig !== 'C') stave.addKeySignature(keySig)
            }
            stave.setContext(context).draw()
            const measureIndex = system * MEASURES_PER_SYSTEM + bar
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
            new Formatter().joinVoices([voice]).format([voice], measureWidth - 48)
            voice.draw(context, stave)
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
  }, [notes, layout, clef, time, keySig, systems, stavesPerSystem, paperHeight, grouped, musicFontReady])

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
      part = Math.abs(localY - STAFF_GROUP_GAP) < Math.abs(localY) ? 1 : 0
      activeClef = part === 0 ? 'treble' : 'bass'
    } else if (layout === 'orchestra') {
      part = Math.max(0, Math.min(stavesPerSystem - 1, Math.round(localY / STAFF_GROUP_GAP)))
      activeClef = part === 0 ? 'treble' : 'bass'
    }
    const staffIndex = part
    const staffY = baseY + part * STAFF_GROUP_GAP
    const bottom = CLEF_BOTTOM_NOTE[activeClef]
    // One diatonic step is exactly half the distance between staff lines.
    const step = Math.round((staffY + STAFF_HEIGHT - y) / (STAFF_SPACING / 2))
    const pitchIndex = bottom.index + step
    const name = DIATONIC[((pitchIndex % 7) + 7) % 7]
    const octave = bottom.octave + Math.floor(pitchIndex / 7)
    const key = name + '/' + octave
    const measureWidth = (viewBox.width - SCORE_MARGIN * 2) / MEASURES_PER_SYSTEM
    const measure = Math.max(0, Math.min(MEASURES_PER_SYSTEM - 1, Math.floor((x - SCORE_MARGIN) / measureWidth)))
    const measureIndex = system * MEASURES_PER_SYSTEM + measure
    const current = grouped.get(staffIndex + ':' + measureIndex) || []
    const beatLimit = ((Number(time.split('/')[0]) || 4) * 4) / (Number(time.split('/')[1]) || 4)
    const used = current.reduce((sum, n) => sum + BEATS[n.duration] * (n.dotted ? 1.5 : 1), 0)
    if (used + BEATS[duration] * (dotted ? 1.5 : 1) > beatLimit + 0.001) {
      setStatus('Ô nhịp đã đủ trường độ. Hãy chọn ô nhịp kế tiếp.')
      return
    }
    const item: NoteItem = { id: Date.now() + Math.random(), staff: staffIndex, measure: measureIndex, key, duration, dotted, accidental, rest }
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
      const originalMusicXml = await xmlResponse.text()
      setSourceMusicXml(originalMusicXml)
      const imported = parseMusicXml(originalMusicXml)
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
      <div className="brand"><div className="brand-mark">M</div><div><strong>MeloLegacy</strong><span>{showEcosystemMap ? 'BẢN ĐỒ HỆ SINH THÁI 3D' : 'PHÒNG SOẠN NHẠC'}</span></div></div>
      <div className="top-actions"><button className="map-toggle-button" onClick={() => setShowEcosystemMap(value => !value)}>{showEcosystemMap ? 'Phòng Soạn Nhạc' : 'Sơ đồ 3D'}</button><span className="save-state"><i />{status}</span><button className="gold-button" onClick={() => window.print()}>Xuất PDF</button></div>
    </header>
    {showEcosystemMap ? <Suspense fallback={<div className="melo-map-loading">Đang mở sơ đồ 3D…</div>}><MeloEcosystem3D onClose={() => setShowEcosystemMap(false)} /></Suspense> : <><section className="workspace" aria-busy={!storageReady} style={{ pointerEvents: storageReady ? 'auto' : 'none' }}>
      <aside className="tool-rail" aria-label="Công cụ Phòng Soạn Nhạc">
        <nav className="tool-icon-list" aria-label="Nhóm công cụ">
          <button className={activeTool === 'file' ? 'tool-icon active' : 'tool-icon'} aria-label="Tác phẩm và nhập PDF" title="Tác phẩm và nhập PDF" onClick={() => setActiveTool(activeTool === 'file' ? null : 'file')}><span>▤</span></button>
          <button className={activeTool === 'layout' ? 'tool-icon active' : 'tool-icon'} aria-label="Bố cục khuông nhạc" title="Bố cục khuông nhạc" onClick={() => setActiveTool(activeTool === 'layout' ? null : 'layout')}><span>☷</span></button>
          <button className={activeTool === 'notes' ? 'tool-icon active' : 'tool-icon'} aria-label="Nốt và ký hiệu" title="Nốt và ký hiệu" onClick={() => setActiveTool(activeTool === 'notes' ? null : 'notes')}><span>♬</span></button>
          <button className={activeTool === 'score' ? 'tool-icon active' : 'tool-icon'} aria-label="Khóa, nhịp và hóa biểu" title="Khóa, nhịp và hóa biểu" onClick={() => setActiveTool(activeTool === 'score' ? null : 'score')}><span>𝄞</span></button>
          <button className={activeTool === 'playback' ? 'tool-icon active' : 'tool-icon'} aria-label="Thiết lập phát nhạc" title="Thiết lập phát nhạc" onClick={() => setActiveTool(activeTool === 'playback' ? null : 'playback')}><span>♫</span></button>
          <button className={activeTool === 'edit' ? 'tool-icon active' : 'tool-icon'} aria-label="Chỉnh sửa" title="Chỉnh sửa" onClick={() => setActiveTool(activeTool === 'edit' ? null : 'edit')}><span>↶</span></button>
          <button className={activeTool === 'write' ? 'tool-icon active handwriting-tool' : 'tool-icon handwriting-tool'} aria-label="Viết tay và nhận dạng" title="Viết tay và nhận dạng" onClick={() => setActiveTool(activeTool === 'write' ? null : 'write')}><span>✍</span></button>
        </nav>
        {activeTool && <section className="tool-popover" aria-label="Bảng công cụ">
          <div className="tool-popover-head"><strong>{({ file: 'Tác phẩm', layout: 'Bố cục khuông', notes: 'Nốt và ký hiệu', score: 'Thiết lập bản nhạc', playback: 'Phát nhạc', edit: 'Chỉnh sửa', write: 'Viết tay và nhận dạng' } as const)[activeTool]}</strong><button className="popover-close" aria-label="Đóng bảng công cụ" onClick={() => setActiveTool(null)}>×</button></div>
          {activeTool === 'file' && <>
            <label className="field-label" htmlFor="score-title">Tên tác phẩm</label><input id="score-title" className="title-input" value={title} onChange={e => setTitle(e.target.value)} />
            <div className="tool-divider-line" />
            <input ref={pdfInputRef} className="visually-hidden-input" type="file" accept="application/pdf,.pdf" disabled={omrBusy} onChange={event => recognizePdf(event.target.files?.[0])} />
            <input ref={backupInputRef} className="visually-hidden-input" type="file" accept="application/json,.json" onChange={event => restoreScoreBackup(event.target.files?.[0])} />
            <button className="tool-action" onClick={downloadScoreBackup}><span>⇩</span>Sao lưu toàn bộ tác phẩm</button>
            <button className="tool-action" onClick={() => backupInputRef.current?.click()}><span>↥</span>Khôi phục từ bản sao lưu</button>
            <div className="tool-divider-line" />
            <button className="tool-action primary" disabled={omrBusy} onClick={() => pdfInputRef.current?.click()}><span>⇧</span>{omrBusy ? 'Đang nhận dạng PDF…' : 'Nhập PDF và nhận dạng'}</button>
            <p className="tool-help">{omrMessage}</p>{omrJobId && <small className="tool-help">Mã xử lý: {omrJobId}</small>}
            {sourceMusicXml && <><p className="tool-help">Bản MusicXML gốc được giữ riêng, không bị thay thế khi chỉnh sửa bản làm việc.</p><button className="tool-action" onClick={downloadOriginalMusicXml}><span>⇩</span>Tải MusicXML gốc</button></>}
          </>}
          {activeTool === 'layout' && <div className="layout-options">{(['solo', 'large', 'grand', 'orchestra'] as Layout[]).map((item, index) => <button key={item} className={layout === item ? 'layout-choice selected' : 'layout-choice'} onClick={() => setLayout(item)}><span className="layout-icon">{['≋', '☰', '𝄞\n𝄢', '♬'][index]}</span><span><b>{['Solo', 'Khuông lớn', 'Đại khuông', 'Dàn nhạc'][index]}</b><small>{['10 khuông · Một bè', '6 khuông · Cỡ lớn', 'Sol + Fa · Piano', '4 bè · Phác thảo tổng phổ'][index]}</small></span></button>)}</div>}
          {activeTool === 'notes' && <>
            <div className="field-label">Trường độ</div><div className="duration-grid">{DURATIONS.map(item => <button key={item.value} className={duration === item.value ? 'duration selected' : 'duration'} onClick={() => { setDuration(item.value); setRest(false) }}><span>{item.glyph}</span><small>{item.label}</small></button>)}</div>
            <div className="note-options"><button className={dotted ? 'mini-tool selected' : 'mini-tool'} onClick={() => setDotted(!dotted)}>·　Chấm dôi</button><button className={rest ? 'mini-tool selected' : 'mini-tool'} onClick={() => setRest(!rest)}>𝄽　Dấu nghỉ</button></div>
            <div className="tool-divider-line" /><div className="field-label">Dấu hóa</div><div className="accidental-grid">{([{ value: '', label: 'Không' }, { value: '#', label: 'Thăng \uE262' }, { value: 'b', label: 'Giáng \uE260' }, { value: 'n', label: 'Bình \uE261' }] as const).map(item => <button key={item.value || 'none'} className={accidental === item.value ? 'mini-tool selected' : 'mini-tool'} onClick={() => setAccidental(item.value)}>{item.label}</button>)}</div>
          </>}
          {activeTool === 'score' && <>
            <label className="field-label" htmlFor="clef">Khóa nhạc</label><select id="clef" className="title-input" value={clef} onChange={e => setClef(e.target.value as typeof clef)}><option value="treble">Khóa Sol</option><option value="bass">Khóa Fa</option><option value="alto">Khóa Đô (Alto)</option><option value="tenor">Khóa Đô (Tenor)</option></select>
            <div className="setting-row"><label className="field-label" htmlFor="time">Nhịp</label><select id="time" value={time} onChange={e => setTime(e.target.value)}><option>4/4</option><option>3/4</option><option>2/4</option><option>6/8</option><option>9/8</option><option>12/8</option></select></div>
            <div className="setting-row"><label className="field-label" htmlFor="key">Hóa biểu</label><select id="key" value={keySig} onChange={e => setKeySig(e.target.value)}>{['C','G','D','A','E','B','F','Bb','Eb','Ab','Db','Gb'].map(k => <option key={k}>{k}</option>)}</select></div>
          </>}
          {activeTool === 'playback' && <>
            <div className="setting-row"><label className="field-label" htmlFor="tempo">Tempo ♩</label><input id="tempo" type="number" min="20" max="300" value={tempo} onChange={e => setTempo(Math.max(20, Math.min(300, Number(e.target.value) || 80)))}/></div>
            <div className="setting-row"><label className="field-label" htmlFor="dynamic">Cường độ</label><select id="dynamic" value={dynamic} onChange={e => setDynamic(e.target.value)}>{['pp','p','mp','mf','f','ff'].map(v => <option key={v}>{v}</option>)}</select></div>
            <p className="tool-help">Thiết lập tempo và cường độ hiển thị trên bản nhạc. Bộ phát âm thanh chưa được kết nối trong phiên bản này.</p>
          </>}
          {activeTool === 'write' && <div className="handwriting-panel">
            <p className="tool-help">Viết ký hiệu bằng Apple Pencil hoặc bút cảm ứng trong vùng bên dưới. Nét viết hiện được giữ trong phiên làm việc này.</p>
            <canvas ref={handwritingCanvasRef} className="handwriting-canvas" width={720} height={260}
              onPointerDown={event => { const canvas = event.currentTarget; const rect = canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) * canvas.width / rect.width; const y = (event.clientY - rect.top) * canvas.height / rect.height; const ctx = canvas.getContext('2d'); if (!ctx) return; inkPointerRef.current = event.pointerId; canvas.setPointerCapture(event.pointerId); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#29251f' }}
              onPointerMove={event => { if (inkPointerRef.current !== event.pointerId) return; const canvas = event.currentTarget; const rect = canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) * canvas.width / rect.width; const y = (event.clientY - rect.top) * canvas.height / rect.height; const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.lineTo(x, y); ctx.stroke() }}
              onPointerUp={event => { if (inkPointerRef.current === event.pointerId) inkPointerRef.current = null }}
              onPointerCancel={event => { if (inkPointerRef.current === event.pointerId) inkPointerRef.current = null }} />
            <button className="tool-action" onClick={() => { const canvas = handwritingCanvasRef.current; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height) }}><span>⌫</span>Xóa nét viết</button>
            <p className="tool-help handwriting-notice">Bộ nhận dạng chữ viết nhạc của MeloLegacy chưa được kết nối. Nút này đã mở vùng viết tay; chưa tự chuyển nét viết thành MusicXML hoặc nốt nhạc.</p>
          </div>}
          {activeTool === 'edit' && <div className="edit-tools"><button className="tool-action" onClick={undo} disabled={!history.length}><span>↶</span>Hoàn tác</button><button className="tool-action" onClick={redo} disabled={!future.length}><span>↷</span>Làm lại</button><button className="tool-action danger" onClick={clearScore}><span>⌫</span>Xóa bản nhạc</button><button className="tool-action" onClick={() => window.print()}><span>⤓</span>Xuất / In PDF</button></div>}
        </section>}
      </aside>
      <section className="score-area">
        <div className="score-toolbar"><div><span className="crumb">MeloLegacy</span><span className="slash">/</span><b>Phòng Soạn Nhạc</b></div><div className="zoom-label">A4 · Dọc · {systems} hệ thống · 3 ô nhịp / hệ</div></div>
        <div className="paper-wrap"><div className="paper" style={{ minHeight: paperHeight }}>
          <div className="paper-head"><div className="paper-kicker">MELOLEGACY · MUSIC COMPOSITION</div><h1>{title || 'Tác phẩm mới'}</h1><div className="paper-meta"><span>Tác giả: __________________</span><span>♩ = {tempo}　{dynamic}</span></div></div>
          <div className="notation-host" ref={scoreRef} onClick={addFromCanvas} style={{ minHeight: paperHeight - 180 }} />
          <div className="paper-bottom"><span>MeloLegacy · Di sản âm nhạc</span><span>Trang 1</span></div>
        </div></div>
      </section>
    </section>
    <footer className="mobile-note">Chọn trường độ rồi chạm vào khuông nhạc để ghi nốt. Dùng nút ✍ để mở vùng viết tay. Xoay iPad ngang để có vùng làm việc rộng hơn.</footer></>}
  </main>
}
export default App
