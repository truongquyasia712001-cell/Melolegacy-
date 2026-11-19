import { useMemo, useState, type CSSProperties } from 'react'
import './MeloEcosystem3D.css'

type Room = { id:string; name:string; short:string; icon:string; description:string; category:'room'|'shared'|'platform'|'separate'; x:number; y:number }
type Branch = { id:string; name:string; icon:string; description:string }

const ROOMS:Room[] = [
 {id:'composer',name:'Phòng Soạn Nhạc',short:'Soạn Nhạc',icon:'🎼',description:'Trung tâm sáng tác, biên tập và làm việc với dữ liệu ký âm chung của MeloLegacy.',category:'room',x:50,y:48},
 {id:'reader',name:'Phòng Đọc Bản Nhạc',short:'Đọc Bản Nhạc',icon:'📖',description:'Đọc, xem và theo dõi bản nhạc trong quá trình học tập, biểu diễn.',category:'room',x:25,y:22},
 {id:'musicnotes',name:'Phòng Music Notes',short:'Music Notes',icon:'✍️',description:'Không gian viết tay, nghiên cứu ký âm và kiểm tra kết quả nhận dạng.',category:'room',x:75,y:22},
 {id:'practice',name:'Phòng Luyện Tập',short:'Luyện Tập',icon:'🎹',description:'Luyện tai nghe, cao độ, tiết tấu, xướng âm và thực hành âm nhạc.',category:'room',x:16,y:49},
 {id:'heritage',name:'Thư Viện Di Sản',short:'Di Sản Âm Nhạc',icon:'🏛️',description:'Lưu giữ và khám phá tác phẩm, tư liệu cùng các giá trị âm nhạc.',category:'room',x:84,y:49},
 {id:'recording',name:'Phòng Thu Âm',short:'Thu Âm',icon:'🎙️',description:'Ghi âm giọng hát, nhạc cụ và các phần trình diễn.',category:'room',x:28,y:78},
 {id:'video',name:'Phòng Video & Sân Khấu',short:'Video & Sân Khấu',icon:'🎬',description:'Kết hợp bản nhạc, lời, hình ảnh, trình chiếu và ghi hình biểu diễn.',category:'room',x:50,y:83},
 {id:'soundlab',name:'Sound Lab',short:'Sound Lab',icon:'🎚️',description:'Xử lý, cắt ghép, phối trộn và chuyển đổi âm thanh với dữ liệu bản nhạc.',category:'room',x:72,y:78},
 {id:'audio',name:'Audio Engine',short:'Audio Engine',icon:'〰️',description:'Lõi âm thanh dùng chung cho các phòng nghe, luyện tập và sáng tạo.',category:'shared',x:50,y:66},
 {id:'melopad',name:'Melopad',short:'Melopad',icon:'▣',description:'Giao diện trung tâm và cửa ngõ thống nhất của hệ sinh thái Melo.',category:'platform',x:13,y:8},
 {id:'melocloud',name:'Melocloud',short:'Melocloud',icon:'☁️',description:'Nền tảng đám mây của hệ sinh thái Melo.',category:'platform',x:50,y:8},
 {id:'melobot',name:'Melobot',short:'Melobot',icon:'✧',description:'Trợ lý thông minh trong hệ sinh thái Melo.',category:'platform',x:87,y:8},
 {id:'melobox',name:'Melobox · Dự án riêng',short:'Melobox',icon:'📦',description:'Dự án lưu trữ riêng, không thuộc bốn nền tảng chuẩn của hệ sinh thái Melo.',category:'separate',x:91,y:91},
]
const CONNECTIONS = [
 ['composer','reader'],['composer','musicnotes'],['composer','practice'],['composer','heritage'],['composer','recording'],['composer','video'],['composer','soundlab'],['composer','audio'],
 ['reader','practice'],['reader','video'],['practice','audio'],['recording','audio'],['soundlab','audio'],['video','reader'],
 ['melopad','composer'],['melocloud','composer'],['melobot','composer'],
] as const
const BRANCHES:Branch[] = [
 {id:'write',name:'Sáng tác bản nhạc',icon:'🎼',description:'Tạo tác phẩm mới trên khuông nhạc.'},
 {id:'edit',name:'Biên tập ký âm',icon:'✏️',description:'Chỉnh sửa nốt, trường độ, dấu hóa, nhịp và cấu trúc bè.'},
 {id:'pdf',name:'Nhận dạng PDF',icon:'📄',description:'Đưa bản nhạc PDF qua Audiveris để nhận dạng.'},
 {id:'xml',name:'MusicXML',icon:'🧩',description:'Nhập và làm việc với dữ liệu ký âm MusicXML.'},
 {id:'handwriting',name:'Viết nhạc bằng bút',icon:'🖋️',description:'Hướng phát triển nhận dạng ký âm viết tay.'},
 {id:'playback',name:'Phát lại bản nhạc',icon:'▶️',description:'Nghe bản nhạc với nguồn âm piano ưu tiên.'},
 {id:'parts',name:'Bè nhạc & nhạc cụ',icon:'🎻',description:'Tổ chức bè, khuông và nhạc cụ trong tổng phổ.'},
]
const COLORS:Record<Room['category'],string>={room:'#9fb9b3',shared:'#a9b8d0',platform:'#c9a96d',separate:'#9d9282'}

export function MeloEcosystem3D({onClose}:{onClose:()=>void}) {
 const [view,setView]=useState<'neuron'|'map'>('neuron')
 const [selectedId,setSelectedId]=useState('composer')
 const [selectedBranch,setSelectedBranch]=useState<Branch|null>(null)
 const selected=useMemo(()=>ROOMS.find(room=>room.id===selectedId)||ROOMS[0],[selectedId])
 const isComposer=selected.id==='composer'
 function selectRoom(id:string){setSelectedId(id);setSelectedBranch(null)}
 return <section className="melo-map">
  <header className="melo-map-header"><div><div className="melo-map-kicker">MELOLEGACY · KHÔNG GIAN HỆ SINH THÁI</div><h1>Thế giới MeloLegacy</h1><p>Hai cách khám phá cùng một hệ thống phòng và chức năng âm nhạc.</p></div>
   <div className="melo-map-header-actions"><div className="melo-view-switch" role="group" aria-label="Chế độ sơ đồ"><button className={view==='neuron'?'active':''} onClick={()=>setView('neuron')}>✧ Sơ đồ Neuron</button><button className={view==='map'?'active':''} onClick={()=>setView('map')}>♜ Bản đồ Đàn Thiên Thần</button></div><button className="melo-map-back" onClick={onClose}>← Quay lại Phòng Soạn Nhạc</button></div>
  </header>
  <div className={view==='neuron'?'melo-map-layout neuron-layout':'melo-map-layout world-layout'}>
   <div className={view==='neuron'?'melo-map-stage neuron-stage':'melo-map-stage world-stage'}>
    {view==='map'&&<svg className="lyre-wall" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lyreGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b58b4a"/><stop offset=".48" stopColor="#e0c58a"/><stop offset="1" stopColor="#80602e"/></linearGradient></defs><path d="M115 640 C38 590 35 450 45 270 C52 115 95 48 190 66 C315 90 365 135 500 135 C635 135 685 90 810 66 C905 48 948 115 955 270 C965 450 962 590 885 640" fill="none" stroke="url(#lyreGold)" strokeWidth="24" strokeLinecap="round"/><path d="M115 640 C38 590 35 450 45 270 C52 115 95 48 190 66 C315 90 365 135 500 135 C635 135 685 90 810 66 C905 48 948 115 955 270 C965 450 962 590 885 640" fill="none" stroke="#f1d99e" strokeWidth="3" opacity=".7"/><path d="M190 66 Q500 260 810 66 M145 105 Q500 295 855 105 M100 160 Q500 340 900 160" fill="none" stroke="#b99455" strokeWidth="5" opacity=".85"/>{Array.from({length:9},(_,i)=><path key={i} d={`M${190+i*77.5} 68 Q${190+i*77.5} 360 ${190+i*77.5} 635`} stroke="#9c7b45" strokeWidth="1.4" opacity=".32" fill="none"/>)}<path d="M115 640 Q500 700 885 640" stroke="#e0c58a" strokeWidth="28" fill="none" strokeLinecap="round"/><path d="M115 640 Q500 700 885 640" stroke="#76552b" strokeWidth="3" fill="none"/></svg>}
    <svg className="melo-connections" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true">{CONNECTIONS.map(([from,to])=>{const a=ROOMS.find(r=>r.id===from)!;const b=ROOMS.find(r=>r.id===to)!;return <line key={from+'-'+to} x1={a.x*10} y1={a.y*7.2} x2={b.x*10} y2={b.y*7.2} className={from==='composer'||to==='composer'?'main-link':'secondary-link'}/>})}</svg>
    {ROOMS.map(room=><button key={room.id} className={`melo-room-node ${room.id===selectedId?'selected':''} ${room.category}`} style={{left:room.x+'%',top:room.y+'%'}} onClick={()=>selectRoom(room.id)} aria-pressed={room.id===selectedId}><span className="room-avatar" style={{'--room-accent':COLORS[room.category]} as CSSProperties}>{room.icon}</span><span className="room-node-name">{room.short}</span></button>)}
    {isComposer&&<div className="composer-branch-strip"><div className="branch-strip-title">CÁC NHÁNH TRONG PHÒNG SOẠN NHẠC</div><div className="composer-branch-grid">{BRANCHES.map(branch=><button key={branch.id} className={selectedBranch?.id===branch.id?'composer-branch selected':'composer-branch'} onClick={()=>setSelectedBranch(branch)}><span>{branch.icon}</span><b>{branch.name}</b></button>)}</div></div>}
    <div className="melo-map-instructions">{view==='neuron'?'Chọn một bong bóng để xem phòng · Chọn Phòng Soạn Nhạc để mở các nhánh chức năng':'Khám phá các lâu đài bên trong tường thành Đàn Thiên Thần'}</div>
   </div>
   <aside className="melo-map-details"><div className="melo-map-details-label">{selectedBranch?'NHÁNH CHỨC NĂNG':'KHU VỰC ĐANG CHỌN'}</div><span className="melo-map-dot" style={{background:selectedBranch?'#c9a96d':COLORS[selected.category]}}/><h2>{selectedBranch?.name||selected.name}</h2><p>{selectedBranch?.description||selected.description}</p><div className="melo-map-scope">{selectedBranch?'Chức năng thuộc '+selected.name:selected.category==='room'?'Phòng chức năng':selected.category==='shared'?'Lõi dùng chung':selected.category==='platform'?'Nền tảng hệ sinh thái':'Dự án riêng'}</div>
    {isComposer&&<><div className="melo-map-branch-hint">Phòng Soạn Nhạc là trung tâm. Chọn một nhánh bên dưới để xem chức năng cụ thể.</div><div className="melo-detail-branches">{BRANCHES.map(branch=><button key={branch.id} className={selectedBranch?.id===branch.id?'detail-branch selected':'detail-branch'} onClick={()=>setSelectedBranch(branch)}><span>{branch.icon}</span>{branch.name}</button>)}</div></>}
    <div className="melo-map-legend"><div><i style={{background:COLORS.room}}/>Phòng chức năng</div><div><i style={{background:COLORS.shared}}/>Lõi dùng chung</div><div><i style={{background:COLORS.platform}}/>Nền tảng Melo</div><div><i style={{background:COLORS.separate}}/>Dự án riêng</div></div>
    <p className="melo-map-note">Sơ đồ thể hiện kiến trúc và các nhánh chức năng đã định hướng; các phòng chưa được triển khai đầy đủ sẽ tiếp tục được phát triển.</p>
   </aside>
  </div>
 </section>
}
