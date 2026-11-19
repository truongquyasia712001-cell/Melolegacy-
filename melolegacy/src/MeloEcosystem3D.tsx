import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import './MeloEcosystem3D.css'

type MeloNode = {
  id: string
  name: string
  group: 'core' | 'platform' | 'room' | 'engine' | 'workflow' | 'separate'
  description: string
  scope: string
}
type MeloLink = { source: string; target: string; relation?: 'separate' | 'flow' }

const NODES: MeloNode[] = [
  { id: 'melopad', name: 'Melopad', group: 'platform', description: 'Giao diện trung tâm và cửa ngõ thống nhất để người dùng tiếp cận hệ sinh thái Melo.', scope: 'Nền tảng hệ sinh thái' },
  { id: 'melolegacy', name: 'MeloLegacy', group: 'core', description: 'Trường học âm nhạc và cộng đồng di sản âm nhạc; trung tâm của bản đồ này.', scope: 'Nền tảng âm nhạc' },
  { id: 'melocloud', name: 'Melocloud', group: 'platform', description: 'Nền tảng đám mây của hệ sinh thái Melo.', scope: 'Nền tảng hệ sinh thái' },
  { id: 'melobot', name: 'Melobot', group: 'platform', description: 'Trợ lý AI trong hệ sinh thái Melo.', scope: 'Nền tảng hệ sinh thái' },
  { id: 'composer', name: 'Phòng Soạn Nhạc', group: 'room', description: 'Không gian soạn, đọc, chỉnh sửa và làm việc với dữ liệu ký âm chung của MeloLegacy.', scope: 'Phòng chức năng' },
  { id: 'reader', name: 'Phòng Đọc Bản Nhạc', group: 'room', description: 'Không gian đọc bản nhạc và hỗ trợ người học khi luyện tập.', scope: 'Phòng chức năng' },
  { id: 'musicnotes', name: 'Phòng Music Notes', group: 'room', description: 'Không gian nghiên cứu, luyện viết tay và kiểm tra kết quả nhận dạng ký âm.', scope: 'Phòng chức năng' },
  { id: 'practice', name: 'Phòng Luyện Tập', group: 'room', description: 'Không gian luyện tai nghe, cao độ, tiết tấu, xướng âm và thực hành âm nhạc.', scope: 'Phòng chức năng' },
  { id: 'heritage', name: 'Thư Viện Di Sản', group: 'room', description: 'Nơi lưu giữ và khám phá tác phẩm, tư liệu và giá trị âm nhạc.', scope: 'Phòng chức năng' },
  { id: 'soundlab', name: 'Sound Lab', group: 'room', description: 'Không gian xử lý, cắt ghép, phối trộn và chuyển đổi âm thanh với dữ liệu bản nhạc.', scope: 'Phòng chức năng' },
  { id: 'recording', name: 'Phòng Thu Âm', group: 'room', description: 'Không gian ghi âm giọng hát và nhạc cụ.', scope: 'Phòng chức năng' },
  { id: 'video', name: 'Phòng Video / Sân Khấu', group: 'room', description: 'Không gian kết hợp bản nhạc, lời, hình ảnh, trình chiếu và ghi hình biểu diễn.', scope: 'Phòng chức năng' },
  { id: 'audio', name: 'Audio Engine', group: 'engine', description: 'Lõi âm thanh dùng chung cho các chức năng nghe, luyện tập và nhạc cụ.', scope: 'Dịch vụ lõi dùng chung' },
  { id: 'tuner', name: 'Tuner', group: 'engine', description: 'Bộ chỉnh âm dùng chung, hiển thị tần số Hz và độ lệch cents.', scope: 'Công cụ âm thanh' },
  { id: 'metronome', name: 'Metronome', group: 'engine', description: 'Bộ giữ nhịp và thiết lập tempo.', scope: 'Công cụ âm thanh' },
  { id: 'piano', name: 'Piano', group: 'engine', description: 'Nguồn âm piano ưu tiên cho phát lại bản nhạc và luyện tập.', scope: 'Nguồn âm thanh' },
  { id: 'pdf', name: 'PDF → Audiveris', group: 'workflow', description: 'Luồng ưu tiên: nhận PDF bản nhạc và dùng Audiveris để nhận dạng ký âm.', scope: 'Luồng xử lý bản nhạc' },
  { id: 'musicxml', name: 'MusicXML', group: 'workflow', description: 'Dữ liệu ký âm có cấu trúc để đưa vào Phòng Soạn Nhạc kiểm tra và chỉnh sửa.', scope: 'Định dạng trao đổi' },
  { id: 'handwriting', name: 'Nhận dạng chữ viết tay', group: 'workflow', description: 'Định hướng nhận dạng ký âm viết tay và cải thiện dữ liệu qua xác minh, chỉnh sửa.', scope: 'Luồng nghiên cứu và huấn luyện' },
  { id: 'melobox', name: 'Melobox', group: 'separate', description: 'Dự án lưu trữ riêng. Không thuộc bốn nền tảng chuẩn của hệ sinh thái Melo; việc tích hợp lưu trữ về sau cần được thiết kế riêng.', scope: 'Dự án độc lập' },
]

const LINKS: MeloLink[] = [
  { source: 'melopad', target: 'melolegacy' },
  { source: 'melopad', target: 'melocloud' },
  { source: 'melopad', target: 'melobot' },
  { source: 'melolegacy', target: 'composer' },
  { source: 'melolegacy', target: 'reader' },
  { source: 'melolegacy', target: 'musicnotes' },
  { source: 'melolegacy', target: 'practice' },
  { source: 'melolegacy', target: 'heritage' },
  { source: 'melolegacy', target: 'soundlab' },
  { source: 'melolegacy', target: 'recording' },
  { source: 'melolegacy', target: 'video' },
  { source: 'composer', target: 'pdf' },
  { source: 'pdf', target: 'musicxml', relation: 'flow' },
  { source: 'musicxml', target: 'composer', relation: 'flow' },
  { source: 'musicnotes', target: 'handwriting', relation: 'flow' },
  { source: 'practice', target: 'audio' },
  { source: 'soundlab', target: 'audio' },
  { source: 'recording', target: 'audio' },
  { source: 'video', target: 'reader' },
  { source: 'audio', target: 'tuner' },
  { source: 'audio', target: 'metronome' },
  { source: 'audio', target: 'piano' },
  { source: 'melocloud', target: 'melobox', relation: 'separate' },
]

const COLORS: Record<MeloNode['group'], string> = {
  core: '#e7c77e',
  platform: '#d3a956',
  room: '#8eb5ae',
  engine: '#9caed0',
  workflow: '#d79b75',
  separate: '#a99b8a',
}

export function MeloEcosystem3D({ onClose }: { onClose: () => void }) {
  const graphHost = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 900, height: 620 })
  const [selected, setSelected] = useState<MeloNode | null>(NODES.find(node => node.id === 'melolegacy') || null)
  const graphData = useMemo(() => ({
    nodes: NODES.map(node => ({ ...node })),
    links: LINKS.map(link => ({ ...link })),
  }), [])

  useEffect(() => {
    const host = graphHost.current
    if (!host) return
    const resize = () => setSize({ width: Math.max(300, host.clientWidth), height: Math.max(360, host.clientHeight) })
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="melo-map">
      <header className="melo-map-header">
        <div>
          <div className="melo-map-kicker">MELOLEGACY · BẢN ĐỒ KIẾN TRÚC</div>
          <h1>Sơ đồ tổng quát MeloLegacy</h1>
          <p>Không gian 3D thể hiện các nền tảng, phòng chức năng và luồng dữ liệu âm nhạc.</p>
        </div>
        <button className="melo-map-back" onClick={onClose}>← Quay lại Phòng Soạn Nhạc</button>
      </header>

      <div className="melo-map-layout">
        <div className="melo-map-stage" ref={graphHost}>
          <ForceGraph3D
            graphData={graphData}
            width={size.width}
            height={size.height}
            backgroundColor="#17150f"
            nodeLabel={(node: object) => {
              const item = node as MeloNode
              return item.name + ' · ' + item.scope
            }}
            nodeColor={(node: object) => COLORS[(node as MeloNode).group] || '#d3a956'}
            nodeVal={(node: object) => (node as MeloNode).group === 'core' ? 18 : (node as MeloNode).group === 'platform' ? 11 : 7}
            nodeRelSize={5}
            linkColor={(link: object) => (link as MeloLink).relation === 'separate' ? '#8d7860' : '#887c65'}
            linkOpacity={0.42}
            linkWidth={1}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleSpeed={0.004}
            onNodeClick={(node: object) => setSelected(node as MeloNode)}
            showNavInfo={false}
            enableNodeDrag
            cooldownTicks={120}
          />
          <div className="melo-map-instructions">Kéo để xoay · Cuộn để phóng to / thu nhỏ · Chọn một nút để xem mô tả</div>
        </div>

        <aside className="melo-map-details">
          <div className="melo-map-details-label">THÔNG TIN NÚT ĐANG CHỌN</div>
          {selected ? (
            <>
              <span className="melo-map-dot" style={{ background: COLORS[selected.group] }} />
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
              <div className="melo-map-scope">{selected.scope}</div>
            </>
          ) : (
            <p>Chọn một nút trên sơ đồ để xem thông tin.</p>
          )}
          <div className="melo-map-legend">
            <div><i style={{ background: COLORS.core }} />Nền tảng trung tâm</div>
            <div><i style={{ background: COLORS.platform }} />Nền tảng hệ sinh thái</div>
            <div><i style={{ background: COLORS.room }} />Phòng chức năng</div>
            <div><i style={{ background: COLORS.engine }} />Công cụ / lõi dùng chung</div>
            <div><i style={{ background: COLORS.workflow }} />Luồng dữ liệu</div>
            <div><i style={{ background: COLORS.separate }} />Dự án riêng</div>
          </div>
          <p className="melo-map-note">Đây là sơ đồ kiến trúc định hướng, không phải xác nhận rằng mọi phòng và luồng đã được triển khai hoàn chỉnh.</p>
        </aside>
      </div>
    </section>
  )
}
