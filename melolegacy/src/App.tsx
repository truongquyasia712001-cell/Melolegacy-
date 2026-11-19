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

export default function App() {
  const [popup, setPopup] = useState<Popup>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [symbolsOpen, setSymbolsOpen] = useState(false)
  const [tempoOpen, setTempoOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const [activeGroup, setActiveGroup] = useState('notes')
  const [dock, setDock] = useState<'top'|'bottom'|'left'|'right'>('bottom')
  const [palettePoint, setPalettePoint] = useState<{x:number;y:number}|null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [paletteDrag, setPaletteDrag] = useState<{x:number;y:number;left:number;top:number}|null>(null)
  const [penMode, setPenMode] = useState(false)
  const [strokes, setStrokes] = useState<string[]>([])
  const [activeStroke, setActiveStroke] = useState('')
  const [timeTop, setTimeTop] = useState(4)
  const [timeBottom, setTimeBottom] = useState(4)
  const [wheelRotation, setWheelRotation] = useState(0)
  const wheelDragRef = useRef<{ startAngle: number; startRotation: number; moved: boolean } | null>(null)
  const wheelSuppressClickRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => { setToolbarTarget(document.querySelector('.score-toolbar')) }, [])

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

  function drawStart(event: React.PointerEvent<SVGSVGElement>) {
    if (!penMode) return
    const rect = event.currentTarget.getBoundingClientRect()
    const point = `${((event.clientX - rect.left) / rect.width) * 1000},${((event.clientY - rect.top) / rect.height) * 1000}`
    event.currentTarget.setPointerCapture(event.pointerId)
    setActiveStroke(point)
  }
  function drawMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!penMode || !activeStroke || event.buttons === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const point = `${((event.clientX - rect.left) / rect.width) * 1000},${((event.clientY - rect.top) / rect.height) * 1000}`
    setActiveStroke(value => value + ' ' + point)
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
        <button className={libraryOpen?'command-active':''} aria-label="Thư viện ký hiệu" title="Thư viện ký hiệu" onClick={()=>{setLibraryOpen(v=>!v);setSymbolsOpen(false);setTempoOpen(false)}}>𝅗𝅥</button>
        <button className={penMode?'command-active':''} aria-label="Bút viết" title="Bút viết" onClick={()=>{setPenMode(v=>!v);setLibraryOpen(false);setSymbolsOpen(false)}}>✎</button>
        <button className={recording?'command-recording':''} aria-label="Thu âm" title="Thu âm" onClick={async()=>{if(recording){recorderRef.current?.stop();setRecording(false);return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const recorder=new MediaRecorder(stream);recorderRef.current=recorder;recordChunksRef.current=[];recorder.ondataavailable=e=>{if(e.data.size)recordChunksRef.current.push(e.data)};recorder.onstop=()=>{const blob=new Blob(recordChunksRef.current,{type:recorder.mimeType||'audio/webm'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='MeloLegacy-ban-thu-am.webm';a.click();URL.revokeObjectURL(url);stream.getTracks().forEach(t=>t.stop())};recorder.start();setRecording(true)}catch{alert('MeloLegacy cần quyền truy cập micro để thu âm.')}}}>{recording?'●':'🎙'}</button>
        <button className={tempoOpen?'command-active':''} aria-label="Máy nhịp" title="Máy nhịp" onClick={()=>{setTempoOpen(v=>!v);setLibraryOpen(false);setSymbolsOpen(false)}}>♩⌁</button>
      </div>
      {libraryOpen&&<div className="notation-category-popover">
        <div className="notation-popover-heading"><b>Nhóm ký hiệu</b><button onClick={()=>setLibraryOpen(false)}>×</button></div>
        <div className="notation-category-list">{SYMBOL_GROUPS.map(group=><button key={group.id} onClick={()=>{setActiveGroup(group.id);setSymbolsOpen(true);setLibraryOpen(false)}}>{group.name}</button>)}</div>
        <div className="notation-dock-options">{(['top','bottom','left','right'] as const).map(side=><button key={side} className={dock===side?'active':''} onClick={()=>setDock(side)}>{({top:'Trên',bottom:'Dưới',left:'Trái',right:'Phải'} as const)[side]}</button>)}</div>
      </div>}
      {symbolsOpen&&<div className={`notation-symbol-rail rail-${dock}`}>
        <div className="notation-rail-title"><b>{SYMBOL_GROUPS.find(g=>g.id===activeGroup)?.name}</b><button onClick={()=>setSymbolsOpen(false)}>×</button></div>
        <div className="notation-rail-items">{(SYMBOL_GROUPS.find(g=>g.id===activeGroup)?.items??[]).map(([glyph,label])=><button key={label} title={label} className={selectedSymbol===label?'selected':''} onClick={()=>{setSelectedSymbol(label);if(activeGroup==='notes'){const i=['𝅝','𝅗𝅥','♩','♪','𝅘𝅥𝅯','𝅘𝅥𝅰'].indexOf(glyph);const vals=['w','h','q','8','16','32'];if(i>=0){const b=document.querySelector<HTMLButtonElement>(`.duration-grid button:nth-child(${i+1})`);b?.click()}}else if(activeGroup==='accidentals'){const map:Record<string,string>={'♯':'#','♭':'b','♮':'n','𝄪':'#','𝄫':'b'};const s=document.querySelector<HTMLSelectElement>('#accidental');if(s&&map[glyph]){s.value=map[glyph];s.dispatchEvent(new Event('change',{bubbles:true}))}else{const idx={'♯':1,'♭':2,'♮':3,'𝄪':1,'𝄫':2}[glyph];document.querySelectorAll<HTMLButtonElement>('.accidental-grid button')[idx]?.click()}}else if(activeGroup==='clefs'){const map:Record<string,string>={'𝄞':'treble','𝄢':'bass','𝄡':'alto','𝄥':'treble'};if(map[glyph])setNativeSelect('clef',map[glyph])}else if(activeGroup==='dynamics'){const s=document.getElementById('dynamic') as HTMLSelectElement|null;if(s&&['pp','p','mp','mf','f','ff'].includes(glyph)){s.value=glyph;s.dispatchEvent(new Event('change',{bubbles:true}))}}else if(activeGroup==='time'){const s=document.getElementById('time') as HTMLSelectElement|null;if(s&&['3/4','4/4','6/8'].includes(glyph)){s.value=glyph;s.dispatchEvent(new Event('change',{bubbles:true}))}}}}>{glyph}<small>{label}</small></button>)}</div>
      </div>}
      {tempoOpen&&<div className="notation-tempo-popover"><label>Tempo · BPM</label><input type="number" min="20" max="300" defaultValue="80" onChange={e=>{const s=document.getElementById('tempo') as HTMLInputElement|null;if(s){s.value=e.target.value;s.dispatchEvent(new Event('input',{bubbles:true}))}}}/><button onClick={()=>setTempoOpen(false)}>Xong</button></div>}
    </div>,toolbarTarget)}
    <div className="composer-pen-tools" style={{display:"none"}}>
      <button className={penMode ? 'pen-toggle active' : 'pen-toggle'} onClick={() => { setPenMode(value => !value); setPopup(null) }}>✎ {penMode ? 'Đang viết' : 'Bút viết'}</button>
      {penMode && <button className="pen-clear" onClick={() => setStrokes([])}>Xóa nét</button>}
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
