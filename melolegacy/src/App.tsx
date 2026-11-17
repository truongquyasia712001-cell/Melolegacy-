import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import './App.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type PdfFile = { name: string; size: number; url: string }

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [file, setFile] = useState<PdfFile | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'recognition' | 'notes'>('recognition')

  useEffect(() => {
    let cancelled = false
    async function renderPage() {
      if (!pdf || !canvasRef.current) return
      setLoading(true)
      try {
        const pdfPage = await pdf.getPage(page)
        const viewport = pdfPage.getViewport({ scale: zoom * Math.min(1.5, window.devicePixelRatio || 1) })
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d')
        if (!canvas || !context || cancelled) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`
        canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`
        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise
      } catch {
        if (!cancelled) setError('Không thể hiển thị trang PDF này. Anh thử tệp PDF khác nhé.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void renderPage()
    return () => { cancelled = true }
  }, [pdf, page, zoom])

  async function openPdf(selected: File) {
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Vui lòng chọn tệp PDF.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer())
      const task = pdfjsLib.getDocument({ data: bytes })
      const loaded = await task.promise
      setPdf(loaded)
      setPage(1)
      setZoom(1)
      setFile({ name: selected.name, size: selected.size, url: URL.createObjectURL(selected) })
    } catch {
      setError('Không đọc được tệp PDF. Tệp có thể bị lỗi hoặc được bảo vệ bằng mật khẩu.')
      setPdf(null)
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  function formatSize(bytes: number) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <main className="studio">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Melo Legacy">
          <span className="brand-mark">M</span>
          <span><strong>MELO LEGACY</strong><small>MUSIC NOTES ROOM</small></span>
        </a>
        <div className="top-actions">
          <span className="save-state"><i /> Làm việc trên thiết bị</span>
          <button className="avatar" aria-label="Tài khoản">Q</button>
        </div>
      </header>

      <section className="workspace-heading">
        <div>
          <div className="eyebrow">PHÒNG SOẠN NHẠC · BẢN THỬ NGHIỆM</div>
          <h1>Nhận dạng bản nhạc</h1>
          <p>Mở PDF bản nhạc, kiểm tra từng trang và chuẩn bị chuyển đổi sang MusicXML.</p>
        </div>
        <label className="primary-button upload-button">
          <span>＋</span> Mở PDF
          <input type="file" accept="application/pdf,.pdf" onChange={e => { const selected = e.target.files?.[0]; if (selected) void openPdf(selected); e.currentTarget.value = '' }} />
        </label>
      </section>

      <div className="toolbar">
        <div className="document-name">
          <span className="pdf-icon">PDF</span>
          <div><strong>{file?.name ?? 'Chưa có bản nhạc'}</strong><small>{file ? formatSize(file.size) + ' · ' + (pdf?.numPages ?? 0) + ' trang' : 'Tải lên một tệp PDF để bắt đầu'}</small></div>
        </div>
        <div className="view-tools">
          <button disabled={!pdf || page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="Trang trước">‹</button>
          <span className="page-count">{pdf ? page : '–'} <em>/ {pdf?.numPages ?? '–'}</em></span>
          <button disabled={!pdf || page >= (pdf?.numPages ?? 1)} onClick={() => setPage(p => Math.min(pdf?.numPages ?? 1, p + 1))} aria-label="Trang sau">›</button>
          <span className="tool-divider" />
          <button disabled={!pdf} onClick={() => setZoom(z => Math.max(.5, +(z - .1).toFixed(1)))} aria-label="Thu nhỏ">−</button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          <button disabled={!pdf} onClick={() => setZoom(z => Math.min(2, +(z + .1).toFixed(1)))} aria-label="Phóng to">＋</button>
        </div>
      </div>

      <div className="main-grid">
        <section className="pdf-stage" aria-label="Trình xem PDF">
          {!file ? (
            <label className="empty-state">
              <span className="upload-art">↑</span>
              <strong>Kéo thả bản nhạc PDF vào đây</strong>
              <span>hoặc chọn tệp từ thiết bị của anh</span>
              <span className="choose-file">Chọn tệp PDF</span>
              <small>PDF · Xử lý trực tiếp trên trình duyệt</small>
              <input type="file" accept="application/pdf,.pdf" onChange={e => { const selected = e.target.files?.[0]; if (selected) void openPdf(selected); e.currentTarget.value = '' }} />
            </label>
          ) : (
            <div className="page-wrap">
              <div className="page-caption">TRANG {page} / {pdf?.numPages}</div>
              {loading && <div className="loading-label">Đang tải trang…</div>}
              <canvas ref={canvasRef} className="pdf-canvas" />
            </div>
          )}
          {error && <div className="error-message" role="alert">{error}</div>}
        </section>

        <aside className="inspector">
          <div className="inspector-tabs">
            <button className={activeTab === 'recognition' ? 'selected' : ''} onClick={() => setActiveTab('recognition')}>Nhận dạng</button>
            <button className={activeTab === 'notes' ? 'selected' : ''} onClick={() => setActiveTab('notes')}>Ghi chú</button>
          </div>
          {activeTab === 'recognition' ? (
            <div className="inspector-content">
              <div className="section-title">QUY TRÌNH NHẬN DẠNG</div>
              <div className="pipeline">
                <div className="pipeline-step done"><span>✓</span><div><strong>Nhập tài liệu PDF</strong><small>{file ? 'Đã mở tài liệu' : 'Đang chờ tệp PDF'}</small></div></div>
                <div className="pipeline-line" />
                <div className="pipeline-step current"><span>2</span><div><strong>Phân tích khuông nhạc</strong><small>Chưa kết nối bộ máy OMR</small></div></div>
                <div className="pipeline-line" />
                <div className="pipeline-step"><span>3</span><div><strong>Nhận dạng ký hiệu</strong><small>Nốt, dấu hóa, trường độ, nhịp</small></div></div>
                <div className="pipeline-line" />
                <div className="pipeline-step"><span>4</span><div><strong>Xuất MusicXML</strong><small>Sau khi kiểm định kết quả</small></div></div>
              </div>
              <div className="notice"><strong>Đang xây dựng bộ máy OMR</strong><p>Trình xem PDF đã sẵn sàng. Kết quả nhận dạng chưa được giả lập; hệ thống sẽ chỉ hiển thị nốt nhạc khi bộ máy OMR thực sự xử lý và kiểm định được.</p></div>
              <div className="section-title quality-title">NGUYÊN TẮC KIỂM ĐỊNH</div>
              <ul className="quality-list"><li>Đối chiếu với bản PDF gốc</li><li>Đánh dấu ký hiệu chưa chắc chắn</li><li>Không tự đoán khi hình ảnh không rõ</li><li>Cho phép sửa trước khi xuất MusicXML</li></ul>
            </div>
          ) : (
            <div className="inspector-content notes-content">
              <div className="section-title">GHI CHÚ TÀI LIỆU</div>
              <p className="muted">Khu vực ghi chú cho quá trình kiểm tra bản nhạc.</p>
              <textarea placeholder="Ghi lại những vị trí cần kiểm tra, ví dụ: ô nhịp 4, dấu hóa ở bè trên…" />
              <small>Ghi chú hiện chỉ tồn tại trong phiên làm việc này.</small>
            </div>
          )}
        </aside>
      </div>

      <footer className="statusbar"><span><i /> PDF Workspace sẵn sàng</span><span>Giai đoạn 1 · Nhập và xem PDF</span><span>MELO LEGACY ©</span></footer>
    </main>
  )
}

export default App
