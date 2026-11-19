import { useEffect, useRef, useState } from 'react'
import ComposerRoomBase from './ComposerRoomBase'

type Popup = { kind: 'clef' | 'key' | 'time'; x: number; y: number } | null
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
  const [penMode, setPenMode] = useState(false)
  const [strokes, setStrokes] = useState<string[]>([])
  const [activeStroke, setActiveStroke] = useState('')
  const [timeTop, setTimeTop] = useState(4)
  const [timeBottom, setTimeBottom] = useState(4)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement)?.closest?.('.notation-picker, .notation-picker-trigger')) setPopup(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  function locate(event: React.MouseEvent, kind: 'clef' | 'key' | 'time') {
    const target = event.target as Element
    const svg = target.closest('svg')
    if (!svg || !target.closest('.notation-host')) return false
    const rect = svg.getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY
    const localX = (x - rect.left) * (svg.viewBox.baseVal.width / rect.width)
    const clefHit = target.closest('[class*="clef"]')
    const timeHit = target.closest('[class*="timesig"], [class*="time-signature"]')
    const keyHit = target.closest('[class*="keysig"], [class*="key-signature"]')
    const hit = kind === 'clef' ? clefHit || localX < 70 : kind === 'time' ? timeHit || (localX >= 70 && localX < 100) : keyHit || (localX >= 100 && localX < 150)
    if (!hit) return false
    event.preventDefault()
    event.stopPropagation()
    setPopup({ kind, x: Math.min(window.innerWidth - 250, Math.max(8, x)), y: Math.min(window.innerHeight - 280, Math.max(8, y + 12)) })
    return true
  }

  function openClef(event: React.MouseEvent) { locate(event, 'clef') }
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
    onContextMenuCapture={event => { if (!penMode) { event.preventDefault(); openClef(event) } }}
    onTouchStartCapture={onLongPressStart}
    onTouchEndCapture={cancelLongPress}
    onTouchMoveCapture={cancelLongPress}>
    <ComposerRoomBase />
    <div className="composer-pen-tools">
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
      {popup.kind === 'key' && <div className="fifths-wheel" role="group" aria-label="Vòng tròn quãng năm">
        {FIFTHS.map((key, index) => {
          const angle = (index / 12) * Math.PI * 2 - Math.PI / 2
          return <button key={key} style={{ left: `${50 + Math.cos(angle) * 39}%`, top: `${50 + Math.sin(angle) * 39}%` }} onClick={() => { setNativeSelect('key', key); setPopup(null) }}><b>{key}</b><small>{KEY_LABELS[key]}</small></button>
        })}
        <div className="fifths-center">Vòng<br/>quãng năm</div>
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
