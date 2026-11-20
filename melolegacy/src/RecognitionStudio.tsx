import { useMemo, useRef, useState } from 'react'
import './RecognitionStudio.css'

type Stroke = { points: [number, number, number][]; pointer: string }
type NoteGuess = { step: string; octave: number; duration: 'whole'|'half'|'quarter'; confidence: number; x: number; y: number }
const STAFF = [240, 270, 300, 330, 360]
const STEPS = ['C','D','E','F','G','A','B']

function recognize(strokes: Stroke[]): NoteGuess[] {
  const result: NoteGuess[] = []
  for (const stroke of strokes) {
    const pts = stroke.points
    if (pts.length < 8) continue
    const xs = pts.map(p=>p[0]), ys=pts.map(p=>p[1])
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys)
    const w=maxX-minX, h=maxY-minY
    const closed=Math.hypot(pts[0][0]-pts[pts.length-1][0],pts[0][1]-pts[pts.length-1][1]) < Math.max(18,Math.min(w,h)*.45)
    const ratio=w/Math.max(h,1)
    if (!closed || w<12 || h<7 || ratio<1.15 || ratio>2.8) continue
    const cx=(minX+maxX)/2, cy=(minY+maxY)/2
    const step=Math.round((STAFF[4]-cy)/15)
    const diatonic=2+step
    const noteIndex=((diatonic%7)+7)%7
    const octave=4+Math.floor(diatonic/7)
    const compact=pts.length < 28
    result.push({step:STEPS[noteIndex],octave,duration:compact?'whole':'half',confidence:Math.min(.92,.56+Math.min(pts.length,45)/150),x:cx,y:cy})
  }
  return result
}
function pitchLabel(n: NoteGuess) { return n.step + n.octave }

export default function RecognitionStudio() {
  const [strokes,setStrokes]=useState<Stroke[]>([])
  const [draft,setDraft]=useState<Stroke|null>(null)
  const [guesses,setGuesses]=useState<NoteGuess[]>([])
  const [status,setStatus]=useState('Viết đầu nốt hình oval trên khuông, sau đó chọn Nhận dạng.')
  const [samples,setSamples]=useState<Array<{strokes:Stroke[];label:string;createdAt:string}>>([])
  const [pdfName,setPdfName]=useState('')
  const [pdfBusy,setPdfBusy]=useState(false)
  const [pdfStatus,setPdfStatus]=useState('PDF vẫn được giữ trong quy trình OMR riêng.')
  const [musicXml,setMusicXml]=useState('')
  const [correction,setCorrection]=useState('half')
  const activeRef=useRef(false)
  const recognized=useMemo(()=>guesses.length,[guesses])
  function point(e:React.PointerEvent<SVGSVGElement>):[number,number,number] {
    const rect=e.currentTarget.getBoundingClientRect()
    return [(e.clientX-rect.left)*1000/rect.width,(e.clientY-rect.top)*700/rect.height,Date.now()]
  }
  function start(e:React.PointerEvent<SVGSVGElement>) {
    if(e.pointerType==='mouse' && e.button!==0) return
    e.currentTarget.setPointerCapture(e.pointerId);activeRef.current=true
    setDraft({points:[point(e)],pointer:e.pointerType})
  }
  function move(e:React.PointerEvent<SVGSVGElement>) {
    if(!activeRef.current)return
    const p=point(e);setDraft(v=>v?{...v,points:[...v.points,p]}:v)
  }
  function end() {
    activeRef.current=false
    setDraft(v=>{if(v&&v.points.length>1)setStrokes(old=>[...old,v]);return null})
    setStatus('Đã thu nét viết. Nhấn Nhận dạng để phân tích nét.')
  }
  function runRecognition() {
    const found=recognize(strokes);setGuesses(found)
    setStatus(found.length?'Tìm thấy '+found.length+' đầu nốt có hình dạng phù hợp. Đây là kết quả nhận dạng hình học sơ bộ, cần xác nhận.':'Chưa tìm thấy đầu nốt oval đủ rõ. Hãy viết lại một đầu nốt khép kín, rộng hơn chiều cao.')
  }
  function confirmSample() {
    if(!guesses.length)return
    const label=guesses.map(g=>pitchLabel(g)+':'+correction).join(',')
    const sample={strokes,label,createdAt:new Date().toISOString()}
    const next=[...samples,sample];setSamples(next)
    try{localStorage.setItem('melo-pencil-training-samples-v1',JSON.stringify(next))}catch{}
    setStatus('Đã lưu mẫu đã xác nhận vào bộ dữ liệu huấn luyện cá nhân trên thiết bị.')
  }
  function exportSamples() {
    const blob=new Blob([JSON.stringify({schema:'melo-pencil-samples-v1',samples},null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='melolegacy-pencil-training-samples.json';a.click();URL.revokeObjectURL(url)
  }
  async function handlePdf(file?:File) {
    if(!file)return
    setPdfName(file.name);setPdfBusy(true);setMusicXml('')
    try {
      const body=new FormData();body.append('pdf',file)
      const createdResponse=await fetch('/api/omr/jobs',{method:'POST',body})
      if(!createdResponse.ok)throw new Error(await createdResponse.text()||'Không gửi được PDF đến OMR.')
      const created=await createdResponse.json() as {id:string}
      let done=false
      for(let i=0;i<450;i++){
        await new Promise(r=>setTimeout(r,2000))
        const response=await fetch('/api/omr/jobs/'+encodeURIComponent(created.id))
        if(!response.ok)throw new Error(await response.text())
        const job=await response.json() as {status:string;error?:string}
        if(job.status==='failed')throw new Error(job.error||'Audiveris không xử lý được PDF.')
        if(job.status==='completed'){done=true;break}
        setPdfStatus(job.status==='processing'?'Audiveris đang nhận dạng bản nhạc…':'PDF đã được đưa vào hàng đợi…')
      }
      if(!done)throw new Error('Đã hết thời gian chờ OMR.')
      const xml=await fetch('/api/omr/jobs/'+encodeURIComponent(created.id)+'/musicxml')
      if(!xml.ok)throw new Error(await xml.text())
      setMusicXml(await xml.text());setPdfStatus('Đã nhận MusicXML. Có thể tải xuống để mở trong Phòng Soạn Nhạc.')
    }catch(e){setPdfStatus(e instanceof Error?e.message:'Lỗi OMR PDF.')}
    finally{setPdfBusy(false)}
  }
  function downloadXml(){
    const blob=new Blob([musicXml],{type:'application/vnd.recordare.musicxml+xml'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='melolegacy-omr.musicxml';a.click();URL.revokeObjectURL(url)
  }
  return <main className="recognition-studio">
    <header className="rs-header"><a href="/" className="rs-back">← Phòng Soạn Nhạc</a><div><b>MeloLegacy</b><span>PHÒNG NHẬN DẠNG & HUẤN LUYỆN</span></div><span className="rs-count">{samples.length} mẫu cá nhân</span></header>
    <section className="rs-intro"><p className="rs-kicker">APPLE PENCIL · ƯU TIÊN SỐ MỘT</p><h1>Nhận dạng ký âm viết tay</h1><p>Viết trực tiếp trên khuông. Hệ thống thu nét, phân tích hình dạng đầu nốt, đề xuất cao độ và lưu mẫu đã được thầy xác nhận.</p></section>
    <section className="rs-workspace">
      <div className="rs-toolbar"><b>Khuông luyện viết</b><div><button onClick={runRecognition} disabled={!strokes.length}>Nhận dạng</button><button onClick={()=>{setStrokes([]);setGuesses([]);setStatus('Đã xóa nét trên khuông.')}}>Xóa nét</button></div></div>
      <svg className="rs-canvas" viewBox="0 0 1000 700" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} style={{touchAction:'none'}}>
        {STAFF.map(y=><line key={y} x1="70" x2="940" y1={y} y2={y} stroke="#536174" strokeWidth="2"/> )}
        <text x="28" y="345" fontSize="104" fill="#b58b3a" fontFamily="serif">𝄞</text>
        {strokes.map((s,i)=><polyline key={i} points={s.points.map(p=>p[0]+','+p[1]).join(' ')} fill="none" stroke="#174b9b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/> )}
        {draft&&<polyline points={draft.points.map(p=>p[0]+','+p[1]).join(' ')} fill="none" stroke="#174b9b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>}
        {guesses.map((g,i)=><g key={i}><ellipse cx={g.x} cy={g.y} rx="15" ry="9" fill="white" stroke="#17834c" strokeWidth="3"/><text x={g.x+22} y={g.y-10} fontSize="22" fill="#17834c">{pitchLabel(g)}</text></g>)}
      </svg>
      <p className="rs-status" role="status">{status}</p>
      <div className="rs-result"><b>Kết quả nhận dạng sơ bộ</b>
        {guesses.length?guesses.map((g,i)=><span key={i}>{pitchLabel(g)} · {g.duration==='whole'?'Nốt tròn':'Nốt trắng'} · độ tin cậy {Math.round(g.confidence*100)}%</span>):<span>Chưa có kết quả. Hãy viết một đầu nốt oval.</span>}
        <label>Trường độ xác nhận<select value={correction} onChange={e=>setCorrection(e.target.value)}><option value="whole">Nốt tròn</option><option value="half">Nốt trắng</option><option value="quarter">Nốt đen</option></select></label>
        <button onClick={confirmSample} disabled={!guesses.length}>Xác nhận & lưu mẫu huấn luyện</button>
      </div>
    </section>
    <section className="rs-dataset"><div><h2>Dữ liệu Apple Pencil cá nhân</h2><p>Mẫu được lưu trên thiết bị. Xuất JSON để đưa vào quy trình huấn luyện MeloLegacy; chưa tự động gửi dữ liệu học sinh lên máy chủ.</p></div><button onClick={exportSamples} disabled={!samples.length}>Xuất {samples.length} mẫu</button></section>
    <section className="rs-pdf"><div><p className="rs-kicker">GIỮ NGUYÊN ƯU TIÊN PDF</p><h2>Nhận dạng bản nhạc từ PDF</h2><p>PDF được gửi đến dịch vụ OMR Audiveris trên máy chủ đã cấu hình. Kết quả MusicXML có thể tải về.</p></div><label className="rs-upload">{pdfBusy?'Đang nhận dạng…':'Chọn PDF bản nhạc'}<input type="file" accept="application/pdf,.pdf" disabled={pdfBusy} onChange={e=>handlePdf(e.target.files?.[0])}/></label><p>{pdfName} — {pdfStatus}</p>{musicXml&&<button onClick={downloadXml}>Tải MusicXML</button>}</section>
    <footer className="rs-foot">Giai đoạn đầu: thu mẫu và nhận dạng hình học đầu nốt. Mô hình học sâu Apple Pencil chưa được huấn luyện hoặc triển khai trong phiên bản này; không coi kết quả sơ bộ là bản nhận dạng AI hoàn chỉnh.</footer>
  </main>
}
