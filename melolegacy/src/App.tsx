import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ComposerRoomBase from './ComposerRoomBase'

type Popup = { kind: 'clef' | 'key' | 'time'; x: number; y: number } | null

const SYMBOL_GROUPS = [
 {id:'notes',name:'Nốt nhạc & dấu nghỉ',items:[['𝅝','Nốt tròn'],['𝅗𝅥','Nốt trắng'],['♩','Nốt đen'],['♪','Móc đơn'],['𝅘𝅥𝅯','Móc kép'],['𝅘𝅥𝅰','Móc ba'],['𝄻','Dấu nghỉ tròn'],['𝄼','Dấu nghỉ trắng'],['𝄽','Dấu nghỉ đen'],['𝄾','Dấu nghỉ móc đơn'],['𝄿','Dấu nghỉ móc kép']]},
 {id:'clefs',name:'Khóa nhạc',items:[['𝄞','Khóa Sol'],['𝄢','Khóa Fa'],['𝄡','Khóa Đô'],['𝄥','Khóa trung tính']]},
 {id:'accidentals',name:'Dấu hóa',items:[['♯','Thăng'],['♭','Giáng'],['♮','Bình'],['𝄪','Thăng kép'],['𝄫','Giáng kép']]},
 {id:'time',name:'Nhịp & tiết tấu',items:[['𝄴','Alla breve'],['𝄵','Nhịp thông thường'],['3/4','Nhịp 3/4'],['4/4','Nhịp 4/4'],['6/8','Nhịp 6/8']]},
 {id:'dynamics',name:'Cường độ',items:[['pp','Pianissimo'],['p','Piano'],['mp','Mezzo piano'],['mf','Mezzo forte'],['f','Forte'],['ff','Fortissimo'],['sfz','Sforzando'],['cresc.','Crescendo'],['dim.','Diminuendo']]},
 {id:'articulation',name:'Ngắt – nhấn – diễn tấu',items:[[' stacc.','Staccato'],['–','Tenuto'],['>','Accent'],['^','Marcato'],['𝄐','Fermata'],['𝄒','Breath mark']]},
 {id:'ornaments',name:'Dấu láy & trang trí',items:[['𝆓','Trill'],['𝆔','Mordent'],['𝆕','Inverted mordent'],['𝆖','Turn'],['𝆗','Inverted turn'],['𝆘','Shake']]},
 {id:'lines',name:'Dấu nối & đường biểu cảm',items:[['⌒','Slur'],['‿','Tie'],['𝆑','Crescendo hairpin'],['𝆒','Diminuendo hairpin'],['8va','Ottava alta'],['8vb','Ottava bassa']]},
 {id:'repeats',name:'Lặp & điều hướng',items:[['𝄆','Mở dấu lặp'],['𝄇','Đóng dấu lặp'],['𝄋','Segno'],['𝄌','Coda'],['D.C.','Da capo'],['D.S.','Dal segno'],['Fine','Fine']]},
 {id:'octave',name:'Quãng tám & chuyển vị',items:[['8va','Lên quãng tám'],['8vb','Xuống quãng tám'],['15ma','Lên hai quãng tám'],['15mb','Xuống hai quãng tám']]},
 {id:'text',name:'Chữ & chỉ dẫn',items:[['♩=','Tempo'],['pizz.','Pizzicato'],['arco','Arco'],['sim.','Simile'],['rit.','Ritardando'],['accel.','Accelerando']]},
 {id:'percussion',name:'Bộ gõ & nhạc cụ',items:[['𝄥','Khóa bộ gõ'],['x','Đầu nốt bộ gõ'],['○','Đầu nốt mở'],['+','Đầu nốt đóng']]},
] as const

const CLEFS = [
  { value: 'treble', label: 'Sol', symbol: '𝄞' },
  { value: 'bass', label: 'Fa', symbol: '𝄢' },
  { value: 'alto', label: 'Đô Alto', symbol: '𝄡' },
  { value: 'tenor', label: 'Đô Tenor', symbol: '𝄡' },
]
const FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F']
const KEY_LABELS: Record<string, string> = { C: 'Đô', G: 'Sol', D: 'Rê', A: 'La', E: 'Mi', B: 'Si', Gb: 'Sol♭', Db: 'Rê♭', Ab: 'La♭', Eb: 'Mi♭', Bb: 'Si♭', F: 'Fa' }

function setNativeSelect(id: string, value: string) {
  const select = document.getElementById(id) as HTMLSelectElement | null
  if (!select) return
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  setter?.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}


type ToolIconName = 'library'|'note'|'undo'|'redo'|'play'|'pause'|'metronome'|'piano'|'settings'|'compass'|'mic'|'camera'|'upload'|'download'|'recording'|'pen'|'eraser'|'trash'|'zoomIn'|'zoomOut'
function ToolIcon({name}:{name:ToolIconName}) {
  const paths: Record<ToolIconName,string[]> = {
    library:['M4 5.5A1.5 1.5 0 0 1 5.5 4H20v15H5.5A1.5 1.5 0 0 0 4 20z','M4 7h16','M8 4v3'],
    note:['M9 18V5l11-2v13','M9 18a3 2 0 1 1-3-2 3 2 0 0 1 3 2','M20 16a3 2 0 1 1-3-2 3 2 0 0 1 3 2'],
    undo:['M9 14 4 9l5-5','M4 9h9a7 7 0 0 1 0 14h-2'],
    redo:['m15 14 5-5-5-5','M20 9h-9a7 7 0 0 0 0 14h2'],
    play:['m8 5 11 7-11 7z'],
    pause:['M8 5v14','M16 5v14'],
    metronome:['m5 20 4-16h6l4 16z','M12 5v9l4-4','M7 20h10'],
    piano:['M4 5h16v14H4z','M8 5v8','M12 5v8','M16 5v8','M8 13v6','M16 13v6'],
    settings:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z','M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1z'],
    compass:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z'],
    mic:['M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z','M19 11a7 7 0 0 1-14 0','M12 18v4','M8 22h8'],
    camera:['M4 7h4l2-2h4l2 2h4v12H4z','M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z'],
    upload:['M12 16V3','m7 8 5-5 5 5','M4 15v5h16v-5'],
    download:['M12 3v13','m7 11 5 5 5-5','M4 17v4h16v-4'],
    recording:['M4 6h16v12H4z','M8 10v4','M11 8v8','M14 10v4','M17 9v6'],
    pen:['m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z','m14 7 3 3','M4 20h6'],
    eraser:['m7 20-4-4a2 2 0 0 1 0-3l8-9a2 2 0 0 1 3 0l7 7a2 2 0 0 1 0 3l-5 6z','m8 11 7 7','M11 20h10'],
    trash:['M4 7h16','M10 11v6','M14 11v6','M6 7l1 14h10l1-14','M9 7V4h6v3'],
    zoomIn:['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z','M11 8v6','M8 11h6','m16 16 5 5'],
    zoomOut:['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z','M8 11h6','m16 16 5 5']
  }
  return <svg className="tool-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name].map((d,i)=><path key={i} d={d}/>)}</svg>
}

export default function App() {
  const [popup, setPopup] = useState<Popup>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [symbolsOpen, setSymbolsOpen] = useState(false)
  const [tempoOpen, setTempoOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [autoCollapse, setAutoCollapse] = useState(true)
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const [activeGroup, setActiveGroup] = useState('notes')
  const [dock, setDock] = useState<'top'|'bottom'|'left'|'right'>('bottom')
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [penMode, setPenMode] = useState(false)
  const [penTool, setPenTool] = useState<'pen'|'eraser'>('pen')
  const [zoom, setZoom] = useState(1)
  const [strokes, setStrokes] = useState<string[]>([])
  const [activeStroke, setActiveStroke] = useState('')
  const [timeTop, setTimeTop] = useState(4)
  const [timeBottom, setTimeBottom] = useState(4)
  const [wheelRotation, setWheelRotation] = useState(0)
  const wheelDragRef = useRef<{ startAngle: number; startRotation: number; moved: boolean } | null>(null)
  const wheelSuppressClickRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => { setToolbarTarget(document.querySelector('.score-toolbar')) }, [])
  useEffect(() => { const onState=(event:Event)=>setPlaying(Boolean((event as CustomEvent).detail)); window.addEventListener('melo:play-state',onState); return ()=>window.removeEventListener('melo:play-state',onState) }, [])
  useEffect(() => {
    const onRecord = async () => {
      if (recording) { recorderRef.current?.stop(); setRecording(false); return }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        recorderRef.current = recorder
        recordChunksRef.current = []
        recorder.ondataavailable = event => { if (event.data.size) recordChunksRef.current.push(event.data) }
        recorder.onstop = () => {
          const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = 'MeloLegacy-ban-thu-am.webm'
          anchor.click()
          URL.revokeObjectURL(url)
          stream.getTracks().forEach(track => track.stop())
        }
        recorder.start()
        setRecording(true)
      } catch { alert('MeloLegacy cần quyền truy cập micro để thu âm.') }
    }
    window.addEventListener('melo:record', onRecord)
    return () => window.removeEventListener('melo:record', onRecord)
  }, [recording])

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement)?.closest?.('.notation-picker, .notation-picker-trigger')) setPopup(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  useEffect(() => {
    const layer = document.querySelector<HTMLElement>('.pen-layer')
    const host = document.querySelector<HTMLElement>('.notation-host')
    if (!layer || !host) return
    const place = () => {
      const rect = host.getBoundingClientRect()
      layer.style.top = rect.top + 'px'
      layer.style.left = rect.left + 'px'
      layer.style.width = rect.width + 'px'
      layer.style.height = rect.height + 'px'
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(host)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [])

  function locate(event: React.MouseEvent, kind: 'clef' | 'key' | 'time') {
    const target = event.target as Element
    const svg = target.closest('svg')
    if (!svg || !target.closest('.notation-host')) return false
    const x = event.clientX
    const y = event.clientY
    const clefHit = target.closest('[class*="clef"]')
    const timeHit = target.closest('[class*="timesig"], [class*="time-signature"]')
    const keyHit = target.closest('[class*="keysig"], [class*="key-signature"]')
    const hit = kind === 'clef' ? clefHit : kind === 'time' ? timeHit : keyHit
    if (!hit) return false
    event.preventDefault()
    event.stopPropagation()
    setPopup({ kind, x: Math.min(window.innerWidth - 250, Math.max(8, x)), y: Math.min(window.innerHeight - 280, Math.max(8, y + 12)) })
    return true
  }

  function openClef(event: React.MouseEvent) { return locate(event, 'clef') }
  function openInlineSetting(event: React.MouseEvent) {
    if (locate(event, 'time')) return
    locate(event, 'key')
  }
  function onLongPressStart(event: React.TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return
    timerRef.current = window.setTimeout(() => {
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const svg = el?.closest('svg')
      if (!svg || !el?.closest('.notation-host')) return
      const rect = svg.getBoundingClientRect()
      const x = (touch.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width)
      if (x < 70) setPopup({ kind: 'clef', x: touch.clientX, y: touch.clientY + 12 })
      else if (x < 100) setPopup({ kind: 'time', x: touch.clientX, y: touch.clientY + 12 })
      else if (x < 150) setPopup({ kind: 'key', x: touch.clientX, y: touch.clientY + 12 })
    }, 520)
  }
  function cancelLongPress() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function eraseAt(event: React.PointerEvent<SVGSVGElement>) {
    const rect=event.currentTarget.getBoundingClientRect()
    const x=((event.clientX-rect.left)/rect.width)*1000, y=((event.clientY-rect.top)/rect.height)*1000
    setStrokes(current=>current.filter(stroke=>!stroke.trim().split(/\s+/).some(pair=>{const [px,py]=pair.split(',').map(Number);return Number.isFinite(px)&&Math.hypot(px-x,py-y)<48})))
  }
  function drawStart(event: React.PointerEvent<SVGSVGElement>) {
    if (!penMode) return
    event.currentTarget.setPointerCapture(event.pointerId)
    if (penTool==='eraser') { eraseAt(event); return }
    const rect=event.currentTarget.getBoundingClientRect()
    setActiveStroke(((event.clientX-rect.left)/rect.width*1000)+','+((event.clientY-rect.top)/rect.height*1000))
  }
  function drawMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!penMode || event.buttons===0) return
    if (penTool==='eraser') { eraseAt(event); return }
    if (!activeStroke) return
    const rect=event.currentTarget.getBoundingClientRect()
    setActiveStroke(value=>value+' '+((event.clientX-rect.left)/rect.width*1000)+','+((event.clientY-rect.top)/rect.height*1000))
  }
  function drawEnd() {
    if (activeStroke) setStrokes(value => [...value, activeStroke])
    setActiveStroke('')
  }

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  return <div className="composer-interaction-shell"
    onClickCapture={event => { if (!penMode) openInlineSetting(event) }}
    onDoubleClickCapture={event => { if (!penMode) openClef(event) }}
    onContextMenuCapture={event => { if (!penMode && openClef(event)) event.preventDefault() }}
    onTouchStartCapture={onLongPressStart}
    onTouchEndCapture={cancelLongPress}
    onTouchMoveCapture={cancelLongPress}>
    <ComposerRoomBase />
    {toolbarTarget && createPortal(<div className="composer-commandbar">
      <div className="composer-command-main">
        <div className="command-side command-left">
          <button className={libraryOpen?'command-active':''} aria-label="Thư viện ký hiệu" title="Thư viện ký hiệu" onClick={()=>{setLibraryOpen(v=>!v);setSymbolsOpen(false);setTempoOpen(false)}} ><ToolIcon name="library" /></button>
          <button aria-label="Nhóm ký âm" title="Nhóm ký âm" onClick={()=>{setLibraryOpen(v=>!v);setSymbolsOpen(false);setTempoOpen(false)}} ><ToolIcon name="note" /></button>
          <button aria-label="Hoàn tác" title="Hoàn tác" onClick={()=>window.dispatchEvent(new Event('melo:undo'))} ><ToolIcon name="undo" /></button>
        </div>
        <button className="command-play-toggle" aria-label="Phát hoặc dừng bản nhạc" title="Phát / Dừng" onClick={()=>window.dispatchEvent(new Event('melo:play-toggle'))}>{playing?<ToolIcon name="pause" />:<ToolIcon name="play" />}</button>
        <div className="command-side command-right">
          <button aria-label="Làm lại" title="Làm lại" onClick={()=>window.dispatchEvent(new Event('melo:redo'))} ><ToolIcon name="redo" /></button>
          <button className={tempoOpen?'command-active':''} aria-label="Metronome" title="Metronome" onClick={()=>{setTempoOpen(v=>!v);setLibraryOpen(false);setSymbolsOpen(false)}} ><ToolIcon name="metronome" /></button>
          <button aria-label="Piano ảo" title="Piano ảo" onClick={()=>window.dispatchEvent(new Event('melo:piano'))} ><ToolIcon name="piano" /></button>
          <button aria-label="Cài đặt" title="Cài đặt" onClick={()=>window.dispatchEvent(new Event('melo:settings'))} ><ToolIcon name="settings" /></button>
        </div>
      </div>
      {libraryOpen&&<div className="notation-category-popover">
        <div className="notation-popover-heading"><b>Nhóm ký hiệu</b><button onClick={()=>setLibraryOpen(false)}>×</button></div>
        <div className="notation-category-list">{SYMBOL_GROUPS.map(group=><button key={group.id} onClick={()=>{setActiveGroup(group.id);setSymbolsOpen(true);setLibraryOpen(false)}}>{group.name}</button>)}</div>
        <div className="notation-dock-options">{(['top','bottom','left','right'] as const).map(side=><button key={side} className={dock===side?'active':''} onClick={()=>setDock(side)}>{({top:'Trên',bottom:'Dưới',left:'Trái',right:'Phải'} as const)[side]}</button>)}</div>
      </div>}
      {symbolsOpen&&<div className={`notation-symbol-rail rail-${dock}`}>
        <div className="notation-rail-title"><b>{SYMBOL_GROUPS.find(g=>g.id===activeGroup)?.name}</b><label className="auto-collapse"><input type="checkbox" checked={autoCollapse} onChange={e=>setAutoCollapse(e.target.checked)}/> Tự thu gọn</label><button onClick={()=>setSymbolsOpen(false)}>×</button></div>
        <div className="notation-rail-items">{(SYMBOL_GROUPS.find(g=>g.id===activeGroup)?.items??[]).map(([glyph,label])=><button key={label} title={label} className={selectedSymbol===label?'selected':''} onClick={()=>{setSelectedSymbol(label);if(autoCollapse)setSymbolsOpen(false);if(activeGroup==='notes'){const i=['𝅝','𝅗𝅥','♩','♪','𝅘𝅥𝅯','𝅘𝅥𝅰'].indexOf(glyph);if(i>=0){const b=document.querySelector<HTMLButtonElement>(`.duration-grid button:nth-child(${i+1})`);b?.click()}}else if(activeGroup==='accidentals'){const map:Record<string,string>={'♯':'#','♭':'b','♮':'n','𝄪':'#','𝄫':'b'};const s=document.querySelector<HTMLSelectElement>('#accidental');if(s&&map[glyph]){s.value=map[glyph];s.dispatchEvent(new Event('change',{bubbles:true}))}else{const idx=({'♯':1,'♭':2,'♮':3,'𝄪':1,'𝄫':2} as Record<string,number>)[glyph];document.querySelectorAll<HTMLButtonElement>('.accidental-grid button')[idx]?.click()}}else if(activeGroup==='clefs'){const map:Record<string,string>={'𝄞':'treble','𝄢':'bass','𝄡':'alto','𝄥':'treble'};if(map[glyph])setNativeSelect('clef',map[glyph])}else if(activeGroup==='dynamics'){const s=document.getElementById('dynamic') as HTMLSelectElement|null;if(s&&['pp','p','mp','mf','f','ff'].includes(glyph)){s.value=glyph;s.dispatchEvent(new Event('change',{bubbles:true}))}}else if(activeGroup==='time'){const s=document.getElementById('time') as HTMLSelectElement|null;if(s&&['3/4','4/4','6/8'].includes(glyph)){s.value=glyph;s.dispatchEvent(new Event('change',{bubbles:true}))}}}}>{glyph}<small>{label}</small></button>)}</div>
      </div>}
      {tempoOpen&&<div className="notation-tempo-popover"><label>Tempo · BPM</label><input type="number" min="20" max="300" defaultValue="80" onChange={e=>{const s=document.getElementById('tempo') as HTMLInputElement|null;if(s){s.value=e.target.value;s.dispatchEvent(new Event('input',{bubbles:true}))}}}/><button onClick={()=>setTempoOpen(false)}>Xong</button></div>}
    </div>,toolbarTarget)}
    <div className="composer-pen-tools" style={{display:"none"}}>
      <button className={penMode ? 'pen-toggle active' : 'pen-toggle'} onClick={() => { setPenMode(value => !value); setPopup(null) }}>✎ {penMode ? 'Đang viết' : 'Bút viết'}</button>
      {penMode && <button className="pen-clear" onClick={() => setStrokes([])}>Xóa nét</button>}
    </div>
    {penMode && <div className="floating-pen-tools-panel" role="group" aria-label="Công cụ bút viết">
      <button className={penTool === "pen" ? "active" : ""} aria-label="Bút viết" title="Bút viết" onClick={() => setPenTool("pen")}><ToolIcon name="pen" /></button>
      <button className={penTool === "eraser" ? "active" : ""} aria-label="Tẩy nét" title="Tẩy nét viết" onClick={() => setPenTool("eraser")}><ToolIcon name="eraser" /></button>
      <button aria-label="Xóa toàn bộ nét viết" title="Xóa toàn bộ nét viết" onClick={() => { if (window.confirm("Xóa toàn bộ nét viết tay?")) { setStrokes([]); setActiveStroke("") } }}><ToolIcon name="trash" /></button>
      <i />
      <button aria-label="Thu nhỏ" title="Thu nhỏ bản nhạc" onClick={() => setZoom(v => Math.max(.65, Number((v - .1).toFixed(2))))}><ToolIcon name="zoomOut" /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button aria-label="Phóng to" title="Phóng to bản nhạc" onClick={() => setZoom(v => Math.min(2.2, Number((v + .1).toFixed(2))))}><ToolIcon name="zoomIn" /></button>
    </div>}
    <div className="floating-pen-anchor">
      <button className={penMode ? "floating-pen active" : "floating-pen"} aria-label="Bút nổi" title="Bút nổi" onClick={() => { setPenMode(true); setPenTool("pen"); setActiveGroup("notes"); setSymbolsOpen(true); setLibraryOpen(false) }}><ToolIcon name="pen" /></button>
    </div>
    <div className={penMode ? 'pen-layer enabled' : 'pen-layer'} aria-label="Lớp viết tay trên khuông nhạc">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"
        onPointerDown={drawStart} onPointerMove={drawMove} onPointerUp={drawEnd} onPointerCancel={drawEnd}>
        {strokes.map((stroke, index) => <polyline key={index} points={stroke} fill="none" stroke="#245b9a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
        {activeStroke && <polyline points={activeStroke} fill="none" stroke="#245b9a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
    {popup && <div className="notation-picker" style={{ left: popup.x, top: popup.y }} onPointerDown={event => event.stopPropagation()}>
      <div className="picker-head"><b>{popup.kind === 'clef' ? 'Chọn khóa nhạc' : popup.kind === 'key' ? 'Vòng tròn quãng năm' : 'Số chỉ nhịp'}</b><button onClick={() => setPopup(null)}>×</button></div>
      {popup.kind === 'clef' && <div className="clef-wheel">{CLEFS.map(item => <button key={item.value} onClick={() => { setNativeSelect('clef', item.value); setPopup(null) }}><strong>{item.symbol}</strong><span>{item.label}</span></button>)}</div>}
      {popup.kind === 'key' && <div className="fifths-wheel" role="group" aria-label="Vòng tròn quãng năm"
        onPointerDown={event => {
          const rect = event.currentTarget.getBoundingClientRect()
          const angle = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI
          wheelDragRef.current = { startAngle: angle, startRotation: wheelRotation, moved: false }
        }}
        onPointerMove={event => {
          const drag = wheelDragRef.current
          if (!drag) return
          const rect = event.currentTarget.getBoundingClientRect()
          const angle = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI
          const delta = ((angle - drag.startAngle + 540) % 360) - 180
          if (Math.abs(delta) > 4) drag.moved = true
          if (drag.moved) setWheelRotation(drag.startRotation + delta)
        }}
        onPointerUp={() => {
          const drag = wheelDragRef.current
          wheelDragRef.current = null
          if (!drag?.moved) return
          wheelSuppressClickRef.current = true
          const snapped = Math.round(wheelRotation / 30) * 30
          setWheelRotation(snapped)
          const index = ((-Math.round(snapped / 30)) % 12 + 12) % 12
          setNativeSelect('key', FIFTHS[index])
          setPopup(null)
        }}
        onPointerCancel={() => { wheelDragRef.current = null }}>
        {FIFTHS.map((key, index) => {
          const angle = (index * 30 + wheelRotation - 90) * Math.PI / 180
          return <button key={key} style={{ left: `${50 + Math.cos(angle) * 39}%`, top: `${50 + Math.sin(angle) * 39}%` }} onClick={() => { if (wheelSuppressClickRef.current) { wheelSuppressClickRef.current = false; return } setNativeSelect('key', key); setPopup(null) }}><b>{key}</b><small>{KEY_LABELS[key]}</small></button>
        })}
        <div className="fifths-center"><b>{FIFTHS[((-Math.round(wheelRotation / 30)) % 12 + 12) % 12]}</b><span>Quãng năm</span></div>
      </div>}
      {popup.kind === 'time' && <div className="time-picker">
        <label>Tử số</label>
        <div className="number-roller" onScroll={event => { const el = event.currentTarget; const item = el.querySelector<HTMLElement>('[data-number]'); if (item) setTimeTop(Math.max(1, Math.min(9, Math.round((el.scrollLeft + el.clientWidth / 2 - item.offsetWidth / 2) / item.offsetWidth) + 1))) }}>
          {numbers.map(number => <button data-number key={number} className={timeTop === number ? 'chosen' : ''} onClick={event => { setTimeTop(number); event.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }}>{number}</button>)}
        </div>
        <label>Mẫu số</label>
        <div className="number-roller" onScroll={event => { const el = event.currentTarget; const item = el.querySelector<HTMLElement>('[data-number]'); if (item) setTimeBottom(Math.max(1, Math.min(9, Math.round((el.scrollLeft + el.clientWidth / 2 - item.offsetWidth / 2) / item.offsetWidth) + 1))) }}>
          {numbers.map(number => <button data-number key={number} className={timeBottom === number ? 'chosen' : ''} onClick={event => { setTimeBottom(number); event.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }}>{number}</button>)}
        </div>
        <button className="apply-time" onClick={() => { setNativeSelect('time', `${timeTop}/${timeBottom}`); setPopup(null) }}>Áp dụng nhịp {timeTop}/{timeBottom}</button>
      </div>}
    </div>}
  </div>
}
