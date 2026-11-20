# HƯỚNG DẪN KẾT NỐI GOOGLE SHEET VỚI LUCKY QQ99 (v3.1)

> **Mô hình kiến trúc mới**: Database chỉ lưu **DỮ LIỆU NGUYÊN TỬ (Atomic Data)** trên 1 tab duy nhất. Toàn bộ tiền xác, tiền thưởng và lãi ròng do Website tự động tính toán 100% (không bao giờ lệch công thức).

---

## 1. CẤU TRÚC 8 CỘT NGUYÊN TỬ CHUẨN (TAB 'CUOC')

| Cột | Tên Cột | Định Dạng | Ví Dụ | Ý Nghĩa |
| :---: | :--- | :---: | :--- | :--- |
| **A** | **`Ngày`** | `dd/MM/yyyy` | `14/11/2026` | Ngày đánh |
| **B** | **`Khách`** | Văn bản | `Trần Thị Thùy Trang` | Tên khách hàng |
| **C** | **`Miền`** | Danh sách thả xuống | `Nam` / `Bắc` / `Trung` | Miền xổ số |
| **D** | **`Đài`** | Văn bản | `TPHCM, Long An, Hậu Giang` | Tên các đài đánh (cách nhau dấu phẩy) |
| **E** | **`Loại cược`** | Danh sách thả xuống | `Bao Lô 2 số`, `Bao Lô 3 số`, `Xỉu Chủ`... | Phân định rõ loại cược (Bao Lô 2/3/4 số, Đầu Đuôi, Xỉu Chủ...) |
| **F** | **`Số`** | Văn bản (giữ số 0) | `08 80` hoặc `406` hoặc `1234` | Các con số cược |
| **G** | **`Điểm cược`** | Số nguyên | `5000` | Số tiền VNĐ cược mỗi con |
| **H** | **`Trúng`** | Văn bản | `08x2 80` hoặc `-` | Rỗng: chưa có kết quả / `-`: trượt / `08x2 80`: số trúng |

> **Tại sao cần có cột Loại cược?**  
> Để hệ thống phân biệt chính xác 100% giữa các thể loại cược khác nhau:
> - **Bao Lô 2 số**: 1k ăn 72k (khách) / 74k (nguồn)
> - **Bao Lô 3 số** (3 càng): 1k ăn 600k (khách) / 650k (nguồn)
> - **Bao Lô 4 số** (4 càng): 1k ăn 5000k (khách) / 5500k (nguồn)
> - **Đầu Đuôi**: 1k ăn 72k / 74k (chỉ tính 2 lô đầu/đuôi)
> - **Xỉu Chủ** (Đầu / Đuôi / Đầu Đuôi): 1k ăn 620k / 650k

---

## 2. CÁCH NÂNG CẤP HOẶC CÀI ĐẶT APPS SCRIPT LÊN GOOGLE SHEETS

### Bước 1: Dán mã nguồn vào Apps Script
1. Mở trang Google Sheet của bạn: 👉 **[Google Sheet LUCKY QQ99](https://docs.google.com/spreadsheets/d/1WfZPzYlBQLvyO6Anrir7mQ5rlQmgQVFQamrWAu0VumY/edit?usp=sharing)**.
2. Trên thanh menu trên cùng, chọn: **Tiện ích mở rộng (Extensions)** $\rightarrow$ **Apps Script**.
3. Xóa hết toàn bộ mã cũ trong trình soạn thảo.
4. Mở file [`backend/google_apps_script.js`](file:///c:/Users/X/Desktop/qq99/backend/google_apps_script.js), sao chép toàn bộ nội dung và dán vào.
5. Bấm nút **💾 Lưu dự án (Save)** (`Ctrl + S` hoặc `Cmd + S`).

### Bước 2: Nâng cấp tab CUOC hiện tại lên 8 cột (Không mất dữ liệu)
1. Trở lại Google Sheet và bấm F5 tải lại trang.
2. Trên thanh menu xuất hiện menu riêng: **🎰 LUCKY QQ99**.
3. Bấm: **`⚡ Nâng cấp tab CUOC lên 8 cột (Thêm Loại cược)`**:
   - Hệ thống tự động chèn cột `Loại cược` vào vị trí Cột E.
   - Toàn bộ các dòng cược cũ sẽ được tự động phân loại thông minh (số 3 chữ số như `406` thành `Bao Lô 3 số`, số 2 chữ số thành `Bao Lô 2 số`).
   - Tạo sẵn danh sách chọn dropdown chuẩn cho cột E.
4. *(Nếu bạn muốn tạo tab hoàn toàn mới)*: Bấm **`Tạo mới / Định dạng lại tab CUOC (8 cột)`**.

### Bước 3: Triển khai Ứng dụng web (Deploy Web App)
Apps Script v3.1 kiêm luôn vai trò Proxy vượt tường lửa CORS để lấy kết quả xổ số từ Minh Chính / Đại Phát và ghi cược trực tiếp:
1. Tại màn hình Apps Script, bấm nút màu xanh **Triển khai (Deploy)** ở góc trên bên phải $\rightarrow$ chọn **Quản lý bản triển khai (Manage deployments)**.
2. Bấm biểu tượng cây bút ✏️ để chỉnh sửa $\rightarrow$ Ở mục Phiên bản chọn **Phiên bản mới (New version)** $\rightarrow$ Bấm **Triển khai (Deploy)**.
3. Sao chép đường dẫn **URL ứng dụng web** (dạng `https://script.google.com/macros/s/AKfycb.../exec`).

### Bước 4: Kiểm tra URL trong cấu hình Website
1. Mở file [`assets/js/config.js`](file:///c:/Users/X/Desktop/qq99/assets/js/config.js).
2. Kiểm tra `webAppUrl` đã trùng khớp với URL vừa triển khai:
   ```javascript
   window.LUCKY_CONFIG = {
     sheetId: '1WfZPzYlBQLvyO6Anrir7mQ5rlQmgQVFQamrWAu0VumY',
     sheetTab: 'CUOC',
     legacyTab: 'KHÁCH',
     webAppUrl: 'https://script.google.com/macros/s/AKfycbyTZ77qbp1BXDTB3TcIC3hnJIGbppIt-T99MmEEcrizX9SiMVzDNx8_9NvatuWsRna9/exec'
   };
   ```

---

## 3. CÁCH SỬ DỤNG TRÊN WEBSITE

- **Xem trực quan**: Mở trực tiếp file `index.html` trên bất kỳ trình duyệt nào. Mọi tính năng (đọc/ghi Google Sheet, dò tự động kết quả) đều chạy trực tiếp qua Apps Script Web App mà không cần cài đặt thêm gì.
- **Thêm mua số**: Bấm **`➕ Thêm Mua Số`**. Chọn loại cược (Bao Lô 2 số, Bao Lô 3 số, Đầu Đuôi, Xỉu Chủ...) $\rightarrow$ Các đài xổ hôm đó tự động hiện ra dưới dạng các chip nút bấm. Tiền xác và tiền lãi dự kiến cập nhật theo thời gian thực!
- **Dò kết quả tự động**: Sau giờ xổ, chỉ cần bấm **`🔎 Dò Tự Động`**:
   - Hệ thống tự lấy bảng xổ số từ nguồn xosodaiphat.com.
   - Phân tích 18 lô (MN/MT) hoặc 27 lô (MB), các giải 3 số (cho Bao Lô 3 số & Xỉu Chủ), hoặc 2 số đầu/đuôi (cho Đầu Đuôi).
   - Tự điền số trúng vào cột **Trúng** (VD: `08 80 90` hoặc `406x2`) và tự động lưu ngược về Sheet!
