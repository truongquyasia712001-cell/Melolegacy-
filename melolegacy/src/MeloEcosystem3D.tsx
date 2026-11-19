import { useMemo, useState, type CSSProperties } from 'react'
import './MeloEcosystem3D.css'

type Room={id:string;name:string;short:string;icon:string;description:string;category:'room'|'shared'|'platform'|'separate';x:number;y:number}
type Branch={id:string;name:string;icon:string;description:string}
const ROOMS:Room[]=[
{id:'composer',name:'Phòng Soạn Nhạc',short:'Soạn Nhạc',icon:'🎼',description:'Trung tâm sáng tác, biên tập và làm việc với dữ liệu ký âm chung của MeloLegacy.',category:'room',x:50,y:48},
{id:'reader',name:'Phòng Đọc Bản Nhạc',short:'Đọc Bản Nhạc',icon:'📖',description:'Đọc, xem và theo dõi bản nhạc trong quá trình học tập, luyện tập và biểu diễn.',category:'room',x:25,y:22},
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
const LINKS=[['composer','reader'],['composer','musicnotes'],['composer','practice'],['composer','heritage'],['composer','recording'],['composer','video'],['composer','soundlab'],['composer','audio'],['reader','practice'],['reader','video'],['practice','audio'],['recording','audio'],['soundlab','audio'],['video','reader'],['melopad','composer'],['melocloud','composer'],['melobot','composer']] as const
const b=(id:string,name:string,icon:string,description:string):Branch=>({id,name,icon,description})
const BRANCHES:Record<string,Branch[]> = {
composer:[b('write','Sáng tác bản nhạc','🎼','Tạo tác phẩm mới trên khuông nhạc.'),b('edit','Biên tập ký âm','✏️','Chỉnh sửa cao độ, trường độ, dấu hóa, nhịp và cấu trúc bè.'),b('pdf','Nhận dạng PDF','📄','Đưa bản nhạc PDF qua Audiveris để nhận dạng.'),b('xml','MusicXML','🧩','Nhập, kiểm tra và làm việc với dữ liệu ký âm MusicXML.'),b('handwriting','Viết nhạc bằng bút','🖋️','Hướng phát triển nhận dạng ký âm viết tay.'),b('playback','Phát lại bản nhạc','▶️','Nghe bản nhạc với nguồn âm piano ưu tiên.'),b('parts','Bè nhạc & nhạc cụ','🎻','Tổ chức bè, khuông và nhạc cụ trong tổng phổ.')],
reader:[b('library','Giá nhạc cá nhân','📚','Sắp xếp tác phẩm và bộ sưu tập bản nhạc.'),b('page','Đọc bản nhạc','📖','Xem bản nhạc theo trang và hệ thống khuông.'),b('annotate','Ghi chú trên bản nhạc','🖊️','Đánh dấu và ghi chú phục vụ học tập.'),b('practice-reader','Chế độ luyện tập','🎯','Theo dõi bản nhạc trong khi luyện tập.')],
musicnotes:[b('handwrite','Viết tay trên khuông','✍️','Ghi ký âm bằng bút cảm ứng.'),b('recognize','Nhận dạng chữ viết','🔎','Phân tích ký hiệu viết tay và đề xuất nhận dạng.'),b('compare','So sánh kết quả','⇄','Đối chiếu bản gốc với ký âm được nhận dạng.'),b('samples','Bộ mẫu huấn luyện','🧪','Thu thập, kiểm tra và hiệu chỉnh mẫu ký hiệu.')],
practice:[b('ear','Luyện tai nghe','👂','Nhận biết cao độ, quãng và hợp âm.'),b('pitch','Luyện cao độ','🎯','Luyện hát hoặc chơi đúng cao độ.'),b('rhythm','Luyện tiết tấu','🥁','Thực hành nhịp, phách và trường độ.'),b('solfege','Xướng âm','🎵','Luyện đọc nốt và hát theo ký âm.'),b('tuner','Máy lên dây','🎚️','Đo tần số, độ lệch cents và chuẩn tham chiếu.')],
heritage:[b('catalog','Danh mục tác phẩm','🏛️','Khám phá tác phẩm và bộ sưu tập di sản.'),b('timeline','Dòng thời gian âm nhạc','⌛','Tìm hiểu lịch sử âm nhạc theo thời kỳ.'),b('sources','Tư liệu & nguồn','📜','Lưu trữ thông tin xuất xứ và tư liệu tham khảo.')],
recording:[b('capture','Thu âm','🎙️','Ghi lại giọng hát và nhạc cụ.'),b('takes','Quản lý bản thu','🎧','Nghe lại và sắp xếp các lần thu.'),b('link-score','Liên kết bản nhạc','🎼','Đối chiếu bản thu với tác phẩm ký âm.')],
video:[b('stage','Sân khấu trình diễn','🎭','Chuẩn bị không gian trình diễn và trình chiếu.'),b('score-video','Bản nhạc đồng bộ video','🎬','Đồng bộ hình ảnh với vị trí trong bản nhạc.'),b('slides','Lời & trình chiếu','🖥️','Hiển thị lời ca, nội dung và góc máy.')],
soundlab:[b('edit-audio','Biên tập âm thanh','✂️','Cắt, ghép và xử lý đoạn âm thanh.'),b('mix','Phối trộn','🎚️','Điều chỉnh và phối trộn nhiều nguồn âm.'),b('loop','Vòng lặp','🔁','Tạo và quản lý các đoạn lặp.'),b('audio-score','Âm thanh ↔ Ký âm','⇄','Kết nối dữ liệu âm thanh với bản nhạc.')],
audio:[b('engine','Bộ máy phát âm','〰️','Nguồn phát âm thanh dùng chung.'),b('metronome','Máy đếm nhịp','⏱️','Giữ nhịp và điều chỉnh tempo.'),b('piano','Đàn piano ảo','🎹','Nguồn âm piano và bàn phím ảo.'),b('tuning','Chuẩn cao độ','🎛️','Thiết lập tần số tham chiếu.')],
melopad:[b('gateway','Cửa ngõ hệ sinh thái','▣','Truy cập thống nhất các không gian Melo.')],
melocloud:[b('personal','Không gian cá nhân','☁️','Lưu trữ dữ liệu riêng của người dùng.'),b('shared','Tài nguyên chia sẻ','🌐','Truy cập tài nguyên cộng đồng được cho phép.')],
melobot:[b('assistant','Trợ lý âm nhạc','✧','Hỗ trợ tìm hiểu và làm việc với âm nhạc.')],
melobox:[b('storage','Lưu trữ đám mây','📦','Dự án lưu trữ độc lập Melobox.')],
}
const COLORS:Record<Room['category'],string>={room:'#9fb9b3',shared:'#a9b8d0',platform:'#c9a96d',separate:'#9d9282'}
export function MeloEcosystem3D({onClose}:{onClose:()=>void}){
 const [view,setView]=useState<'neuron'|'map'>('neuron')
 const [selectedId,setSelectedId]=useState('composer')
 const [selectedBranch,setSelectedBranch]=useState<Branch|null>(null)
 const selected=useMemo(()=>ROOMS.find(r=>r.id===selectedId)||ROOMS[0],[selectedId])
 const branches=BRANCHES[selected.id]||[]
 function selectRoom(id:string){setSelectedId(id);setSelectedBranch(null)}
 return <section className="melo-map">
 <header className="melo-map-header"><div><div className="melo-map-kicker">MELOLEGACY · KHÔNG GIAN HỆ SINH THÁI</div><h1>Thế giới MeloLegacy</h1><p>Khám phá các phòng, nhánh chức năng và mối liên kết trong cùng một hệ thống.</p></div><div className="melo-map-header-actions"><div className="melo-view-switch" role="group" aria-label="Chế độ sơ đồ"><button className={view==='neuron'?'active':''} onClick={()=>setView('neuron')}>✧ Sơ đồ Neuron</button><button className={view==='map'?'active':''} onClick={()=>setView('map')}>♜ Bản đồ Đàn Thiên Thần</button></div><button className="melo-map-back" onClick={onClose}>← Quay lại Phòng Soạn Nhạc</button></div></header>
 <div className={view==='neuron'?'melo-map-layout neuron-layout':'melo-map-layout world-layout'}>
 <div className={view==='neuron'?'melo-map-stage neuron-stage':'melo-map-stage world-stage'}>
 {view==='map'&&<svg className="lyre-wall" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lyreGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b58b4a"/><stop offset=".48" stopColor="#e0c58a"/><stop offset="1" stopColor="#80602e"/></linearGradient></defs><path d="M115 640 C38 590 35 450 45 270 C52 115 95 48 190 66 C315 90 365 135 500 135 C635 135 685 90 810 66 C905 48 948 115 955 270 C965 450 962 590 885 640" fill="none" stroke="url(#lyreGold)" strokeWidth="24" strokeLinecap="round"/><path d="M115 640 C38 590 35 450 45 270 C52 115 95 48 190 66 C315 90 365 135 500 135 C635 135 685 90 810 66 C905 48 948 115 955 270 C965 450 962 590 885 640" fill="none" stroke="#e5d0a1" strokeWidth="3" opacity=".65"/>{Array.from({length:9},(_,i)=><path key={i} d={`M${190+i*77.5} 68 Q${190+i*77.5} 360 ${190+i*77.5} 635`} stroke="#9c7b45" strokeWidth="1.4" opacity=".38" fill="none"/>)}<path d="M115 640 Q500 700 885 640" stroke="#c5a36b" strokeWidth="24" fill="none" strokeLinecap="round"/></svg>}
 <svg className="melo-connections" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true">{LINKS.map(([from,to])=>{const a=ROOMS.find(r=>r.id===from)!;const b=ROOMS.find(r=>r.id===to)!;return <line key={from+'-'+to} x1={a.x*10} y1={a.y*7.2} x2={b.x*10} y2={b.y*7.2} className={from==='composer'||to==='composer'?'main-link':'secondary-link'}/>})}</svg>
 {ROOMS.map(room=><button key={room.id} className={`melo-room-node ${room.id===selectedId?'selected':''} ${room.category}`} style={{left:room.x+'%',top:room.y+'%'}} onClick={()=>selectRoom(room.id)} aria-pressed={room.id===selectedId}><span className="room-avatar" style={{'--room-accent':COLORS[room.category]} as CSSProperties}>{room.icon}</span><span className="room-node-name">{room.short}</span></button>)}
 <div className="melo-map-instructions">{view==='neuron'?'Chọn một bong bóng để mở các nhánh chức năng của phòng đó':'Khám phá các lâu đài bên trong tường thành Đàn Thiên Thần'}</div>
 </div>
 <aside className="melo-map-details"><div className="melo-map-details-label">{selectedBranch?'NHÁNH CHỨC NĂNG':'KHU VỰC ĐANG CHỌN'}</div><span className="melo-map-dot" style={{background:selectedBranch?'#c9a96d':COLORS[selected.category]}}/><h2>{selectedBranch?.name||selected.name}</h2><p>{selectedBranch?.description||selected.description}</p><div className="melo-map-scope">{selectedBranch?'Chức năng thuộc '+selected.name:selected.category==='room'?'Phòng chức năng':selected.category==='shared'?'Lõi dùng chung':selected.category==='platform'?'Nền tảng hệ sinh thái':'Dự án riêng'}</div>
 <div className="melo-map-branch-heading">{branches.length?'CÁC NHÁNH TRONG PHÒNG':'CHƯA CÓ NHÁNH CHỨC NĂNG'}</div><div className="melo-detail-branches">{branches.map(b=><button key={b.id} className={selectedBranch?.id===b.id?'detail-branch selected':'detail-branch'} onClick={()=>setSelectedBranch(b)}><span>{b.icon}</span>{b.name}</button>)}</div>
 {selected.id==='composer'&&<button className="melo-enter-composer" onClick={onClose}>Mở Phòng Soạn Nhạc <span>→</span></button>}
 <div className="melo-map-legend"><div><i style={{background:COLORS.room}}/>Phòng chức năng</div><div><i style={{background:COLORS.shared}}/>Lõi dùng chung</div><div><i style={{background:COLORS.platform}}/>Nền tảng Melo</div><div><i style={{background:COLORS.separate}}/>Dự án riêng</div></div>
 <p className="melo-map-note">Sơ đồ là bản đồ kiến trúc và điều hướng. Các nhánh mô tả chức năng đã định hướng; phòng nào chưa được xây dựng sẽ tiếp tục được triển khai riêng.</p></aside>
 </div></section>
}
