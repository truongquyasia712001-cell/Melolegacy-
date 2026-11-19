# Hợp đồng tích hợp OMR — ứng dụng MeloLegacy
Ngày cập nhật: 2026-11-20

MeloLegacy là một ứng dụng duy nhất. Repository này chứa phần ứng dụng PWA; tài liệu nghiên cứu và sổ đăng ký tài nguyên chi tiết nằm trong repository Studio:
https://github.com/truongquyasia712001-cell/Melolegacy-Studio-/blob/research/borrow-learn-build-own/docs/research-2026-11-20-switzerland-czech-omr.md

## Luồng ưu tiên
1. PDF → Audiveris 5.11.0 → MusicXML (lựa chọn chính đã chốt).
2. Ảnh scan/JPEG → Musibot/OmniOMR hoặc provider OMR tương thích → MusicXML.
3. Đối chiếu/benchmark nhận diện ký hiệu in bằng DeepScoresV2 (CC BY 4.0).
4. Nghiên cứu ký âm viết tay bằng MUSCIMA++ (CC BY-NC-SA 4.0; dataset riêng, không phải engine).
5. Âm thanh/micro → audio pitch/MIDI provider riêng; không coi OMR là audio pitch recognition.

## Hợp đồng tích hợp
- UI chỉ gọi một Melo OMR API/adapter, không gọi trực tiếp API của từng provider.
- Adapter nhận tệp và manifest: loại nguồn, checksum, chủ sở hữu/quyền xử lý, MIME, số trang.
- Job trả trạng thái queued/running/succeeded/partial/needs_review/failed.
- Đầu ra chuẩn: MusicXML và manifest chứa provider, engine/model version, confidence, warnings, provenance, rights.
- Giữ PDF/ảnh gốc bất biến; giữ kết quả máy riêng với bản giáo viên/người dùng đã sửa và bản đã xác minh.
- Tệp học sinh riêng tư không được gửi sang dịch vụ công cộng nếu chưa có sự đồng ý và xác minh retention/điều khoản.
- PWA không nhúng Python/TensorFlow/weights; model chạy ở worker/server hoặc provider từ xa. Có thể thay provider mà không đổi Notation Core.
- Mọi kết quả OMR phải mở được trong Composer Room và được giáo viên/người dùng soát lại; không tự động coi kết quả nhận dạng là chính xác.

## Trạng thái triển khai
Đây mới là hợp đồng tích hợp và chỉ dẫn kỹ thuật. Chưa có OMR API của Melo được triển khai, chưa kết nối giao diện upload, chưa cấu hình provider endpoint, chưa kiểm thử end-to-end và chưa có kết quả MusicXML được xác minh từ app. Không hiển thị trạng thái “đã tích hợp” cho tới khi hoàn thành build, kiểm thử upload → nhận dạng → tải MusicXML → mở Composer → phát lại/đối chiếu.

## Nguồn tài nguyên
- Audiveris: https://github.com/Audiveris/audiveris
- Musibot (mã Apache-2.0; dữ liệu/model có license riêng): https://github.com/OmniOMR/musibot
- Musibot public web UI (availability chưa được kiểm tra trực tiếp): https://quest.ms.mff.cuni.cz/musibot/
- Zeus code (MIT; model snapshots có license riêng): https://github.com/OmniOMR/zeus
- DeepScoresV2 dataset (CC BY 4.0): https://zenodo.org/records/4012193
- MUSCIMA++ dataset (CC BY-NC-SA 4.0): https://ufal.mff.cuni.cz/muscima
