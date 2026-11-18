import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Note = { id: number; staff: number; x: number; step: number; duration: 'whole' | 'half' | 'quarter' | 'eighth' }

const DURATIONS: Note['duration'][] = ['whole', 'half', 'quarter', 'eighth']
const STAFF_TOP = 112
const STAFF_GAP = 92
const LINE_GAP = 9

function App() {
  const [layout, setLayout] = useState<'solo' | 'large' | 'grand'>('solo')
  const [tool, setTool] = useState<Note['duration']>('quarter')
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem('melo-composer-notes') || '[]') as Note[] } catch { return [] }
  })
  const [title, setTitle] = useState('Tác phẩm mới')
  const [activeStaff, setActiveStaff] = useState(0)
  const [status, setStatus] = useState('Đã lưu trên thiết bị')

  useEffect(() => {
    localStorage.setItem('melo-composer-notes', JSON.stringify(notes))
    setStatus('Đã lưu trên thiết bị')
  }, [notes])

  const staffCount = layout === 'solo' ? 10 : layout === 'large' ? 6 : 5
  const paperHeight = Math.max(1123, 220 + staffCount * (layout === 'grand' ? 150 : STAFF_GAP))
  const currentNotes = useMemo(() => notes.filter(n => n.staff < staffCount), [notes, staffCount])

  function addNote(event: React.MouseEvent<SVGSVGElement>, staff: number) {
    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    const scaleX = 794 / rect.width
    const scaleY = paperHeight / rect.height
    const x = Math.max(155, Math.min(755, (event.clientX - rect.left) * scaleX))
    const y = (event.clientY - rect.top) * scaleY
    const top = STAFF_TOP + staff * (layout === 'grand' ? 150 : STAFF_GAP)
    const step = Math.round((top + 4 * LINE_GAP - y) / (LINE_GAP / 2))
    setNotes(prev => [...prev, { id: Date.now() + Math.random(), staff, x, step, duration: tool }])
    setActiveStaff(staff)
  }

  function undo() { setNotes(prev => prev.slice(0, -1)) }

  function play() {
    if (!currentNotes.length) { setStatus('Hãy chạm vào khuông nhạc để thêm nốt'); return }
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) { setStatus('Thiết bị chưa hỗ trợ phát âm thanh'); return }
    const ctx = new AudioContextClass()
    const ordered = [...currentNotes].sort((a, b) => a.x - b.x)
    ordered.forEach((note, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const midi = 64 + note.step
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
      const start = ctx.currentTime + i * 0.42
      const length = note.duration === 'whole' ? 1.6 : note.duration === 'half' ? 0.8 : note.duration === 'eighth' ? 0.2 : 0.4
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(start); osc.stop(start + length + 0.03)
    })
    setStatus('Đang phát bản nhạc thử bằng âm thanh tổng hợp')
    window.setTimeout(() => { setStatus('Đã phát xong') ; void ctx.close() }, ordered.length * 420 + 1900)
  }

  function clearScore() {
    if (window.confirm('Xóa toàn bộ nốt nhạc trên bản nhạc này?')) setNotes([])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">M</div><div><strong>MeloLegacy</strong><span>PHÒNG SOẠN NHẠC</span></div></div>
        <div className="top-actions"><span className="save-state"><i />{status}</span><button className="gold-button" onClick={() => window.print()}>Xuất / In</button></div>
      </header>
      <section className="workspace">
        <aside className="tool-panel">
          <div className="panel-heading">BẢN NHẠC</div>
          <label className="field-label" htmlFor="score-title">Tên tác phẩm</label>
          <input id="score-title" className="title-input" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="panel-heading">BỐ CỤC KHUÔNG NHẠC</div>
          <div className="layout-options">
            <button className={layout === 'solo' ? 'layout-choice selected' : 'layout-choice'} onClick={() => setLayout('solo')}><span className="layout-icon solo-icon">≋</span><span><b>Solo</b><small>10 khuông nhỏ · Khóa Sol</small></span></button>
            <button className={layout === 'large' ? 'layout-choice selected' : 'layout-choice'} onClick={() => setLayout('large')}><span className="layout-icon">☰</span><span><b>Khuông lớn</b><small>6 khuông · Dễ nhìn</small></span></button>
            <button className={layout === 'grand' ? 'layout-choice selected' : 'layout-choice'} onClick={() => setLayout('grand')}><span className="layout-icon">𝄞<br/>𝄢</span><span><b>Đại khuông</b><small>Sol + Fa · Hai tay piano</small></span></button>
          </div>
          <div className="panel-heading">CÔNG CỤ GHI NỐT</div>
          <div className="duration-grid">
            {DURATIONS.map((d, i) => <button key={d} className={tool === d ? 'duration selected' : 'duration'} onClick={() => setTool(d)} aria-label={d}><span>{['𝅝','𝅗𝅥','♩','♪'][i]}</span><small>{['Tròn','Trắng','Đen','Móc đơn'][i]}</small></button>)}
          </div>
          <p className="hint">Chọn hình nốt, sau đó chạm vào vị trí trên khuông nhạc để ghi nốt.</p>
          <div className="panel-heading">THAO TÁC</div>
          <div className="action-stack"><button onClick={undo}>↶　Hoàn tác nốt vừa ghi</button><button onClick={play}>▶　Nghe thử bản nhạc</button><button onClick={clearScore}>⌫　Xóa nốt trên trang</button></div>
          <div className="panel-foot">Bản thử nghiệm đầu tiên<br/>Dữ liệu hiện lưu trên thiết bị này.</div>
        </aside>
        <section className="score-area">
          <div className="score-toolbar"><div><span className="crumb">MeloLegacy</span><span className="slash">/</span><b>Phòng Soạn Nhạc</b></div><div className="zoom-label">A4 · Dọc · {staffCount} khuông</div></div>
          <div className="paper-wrap">
            <div className="paper" style={{ minHeight: paperHeight }}>
              <div className="paper-head"><div className="paper-kicker">MELOLEGACY · MUSIC COMPOSITION</div><h1>{title || 'Tác phẩm mới'}</h1><div className="paper-meta"><span>Tác giả: __________________</span><span>Tempo: ♩ = 80</span></div></div>
              <svg className="notation" viewBox={`0 0 794 ${paperHeight}`} role="img" aria-label="Khuông nhạc tương tác" onClick={e => addNote(e, activeStaff)}>
                {Array.from({ length: staffCount }, (_, s) => {
                  const top = STAFF_TOP + s * (layout === 'grand' ? 150 : STAFF_GAP)
                  return <g key={s} className="staff-group">
                    {Array.from({ length: 5 }, (_, line) => <line key={line} x1="72" y1={top + line * (layout === 'large' ? 15 : 9)} x2="752" y2={top + line * (layout === 'large' ? 15 : 9)} className="staff-line" />)}
                    <text x="82" y={top + 40} className="clef">𝄞</text>
                    <text x="48" y={top - 12} className="staff-number">{String(s + 1).padStart(2, '0')}</text>
                    {layout === 'grand' && <g transform={`translate(0 72)`}><line x1="72" y1={top + 5 * 9 + 72} x2="752" y2={top + 5 * 9 + 72} className="staff-line"/>{Array.from({length:4},(_,line)=><line key={line} x1="72" y1={top + 5 * 9 + 72 + (line+1)*9} x2="752" y2={top + 5 * 9 + 72 + (line+1)*9} className="staff-line"/>)}<text x="82" y={top + 72 + 112} className="clef bass">𝄢</text></g>}
                    {currentNotes.filter(n => n.staff === s).map(n => {
                      const y = top + 4 * (layout === 'large' ? 15 : 9) - n.step * ((layout === 'large' ? 15 : 9) / 2)
                      return <g key={n.id} className="note-mark" transform={`translate(${n.x} ${y})`}><ellipse rx="7" ry="5" transform="rotate(-18)" className={n.duration === 'whole' || n.duration === 'half' ? 'note-open' : 'note-filled'}/>{n.duration !== 'whole' && <line x1="6" y1="0" x2="6" y2={n.step >= 0 ? -34 : 34} className="note-stem"/>}{n.duration === 'eighth' && <path d={n.step >= 0 ? 'M6 -34 Q24 -25 13 -12' : 'M6 34 Q24 25 13 12'} className="note-flag"/>}</g>
                    })}
                    <rect x="65" y={top - 10} width="690" height={layout === 'large' ? 78 : 58} fill="transparent" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect(); const scaleY = paperHeight / rect.height; const y = (e.clientY - rect.top) * scaleY; const step = Math.round((top + 4 * (layout === 'large' ? 15 : 9) - y) / ((layout === 'large' ? 15 : 9) / 2)); const x = Math.max(155, Math.min(755, (e.clientX - rect.left) * 794 / rect.width)); setNotes(prev => [...prev, { id: Date.now() + Math.random(), staff: s, x, step, duration: tool }]); setActiveStaff(s) }} />
                  </g>
                })}
              </svg>
              <div className="paper-bottom"><span>MeloLegacy · Di sản âm nhạc</span><span>Trang 1</span></div>
            </div>
          </div>
        </section>
      </section>
      <footer className="mobile-note">Chạm vào khuông nhạc để ghi nốt · Xoay iPad ngang để có vùng làm việc rộng hơn.</footer>
    </main>
  )
}

export default App
