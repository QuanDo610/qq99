# HƯỚNG DẪN KẾT NỐI GOOGLE SHEET VỚI LUCKY QQ99 (v3.0)

> **Mô hình kiến trúc mới**: Database chỉ lưu **DỮ LIỆU NGUYÊN TỬ (Atomic Data)** trên 1 tab duy nhất. Toàn bộ tiền xác, tiền thưởng và lãi ròng do Website tự động tính toán 100% (không bao giờ lệch công thức).

---

## 1. CẤU TRÚC 7 CỘT NGUYÊN TỬ (TAB 'CUOC')

| Cột | Tên Cột | Định Dạng | Ví Dụ | Ý Nghĩa |
| :---: | :--- | :---: | :--- | :--- |
| **A** | **`Ngày`** | `dd/MM/yyyy` | `14/11/2026` | Ngày đánh |
| **B** | **`Khách`** | Văn bản | `Trần Thị Thùy Trang` | Tên khách hàng |
| **C** | **`Miền`** | Danh sách thả xuống | `Nam` / `Bắc` / `Trung` | Miền xổ số |
| **D** | **`Đài`** | Văn bản | `TPHCM, Long An, Hậu Giang` | Tên các đài đánh (cách nhau dấu phẩy) |
| **E** | **`Số`** | Văn bản (giữ số 0) | `08 80 09 90` | Các con số cược |
| **F** | **`Điểm cược`** | Số nguyên | `5000` | Số tiền VNĐ cược mỗi con |
| **G** | **`Trúng`** | Văn bản | `08x2 80` hoặc `-` | Rỗng: chưa có kết quả / `-`: trượt / `08x2 80`: số trúng |

> **Tại sao không lưu các cột tiền vào Sheet?**  
> Vì tiền xác khách (14k/21k), tiền xác nguồn (76% làm tròn bỏ lẻ nghìn), thưởng x72/x74 và lãi ròng của Bạn đều được tính toán tự động bằng công thức toán học chuẩn hóa từ 7 cột trên. Sheet sạch sẽ, không công thức nặng nề, không sợ ai vô tình sửa nhầm cell.

---

## 2. CÁCH CÀI ĐẶT APPS SCRIPT LÊN GOOGLE SHEETS (1 LẦN DUY NHẤT)

### Bước 1: Dán mã nguồn vào Apps Script
1. Mở trang Google Sheet của bạn: 👉 **[Google Sheet LUCKY QQ99](https://docs.google.com/spreadsheets/d/1WfZPzYlBQLvyO6Anrir7mQ5rlQmgQVFQamrWAu0VumY/edit?usp=sharing)**.
2. Trên thanh menu trên cùng, chọn: **Tiện ích mở rộng (Extensions)** $\rightarrow$ **Apps Script**.
3. Xóa hết toàn bộ mã cũ trong trình soạn thảo.
4. Mở file [`backend/google_apps_script.js`](file:///Users/admin/Desktop/LuckyQQ/backend/google_apps_script.js), sao chép toàn bộ nội dung và dán vào.
5. Bấm nút **💾 Lưu dự án (Save)** hoặc `Cmd + S` / `Ctrl + S`.

### Bước 2: Tạo tab CUOC và chép dữ liệu cũ sang
1. Trở lại Google Sheet và bấm F5 tải lại trang.
2. Trên thanh menu xuất hiện menu riêng: **🎰 LUCKY QQ99**.
3. Bấm **`Tạo tab CUOC (7 cột)`**: Hệ thống tự động tạo tab mới tên `CUOC` với đúng 7 cột, viền màu xám đậm đẹp mắt và định dạng chuẩn văn bản.
4. Bấm **`Chép dữ liệu từ tab KHÁCH cũ`**: Hệ thống sẽ sao chép toàn bộ các dòng cược cũ từ tab `KHÁCH` sang tab `CUOC` (giữ nguyên tab cũ làm dự phòng).

### Bước 3: Triển khai Ứng dụng web (Deploy Web App)
Apps Script v3.0 kiêm luôn vai trò Proxy vượt tường lửa CORS để lấy kết quả xổ số từ Minh Chính / Đại Phát và ghi cược trực tiếp:
1. Tại màn hình Apps Script, bấm nút màu xanh **Triển khai (Deploy)** ở góc trên bên phải $\rightarrow$ chọn **Bản triển khai mới (New deployment)**.
2. Bấm bánh răng ⚙️ $\rightarrow$ chọn **Ứng dụng web (Web app)**.
3. Thiết lập:
   - **Mô tả**: `LUCKY QQ99 v3.0`
   - **Thực thi dưới dạng (Execute as)**: **`Tôi (Me)`**
   - **Người có quyền truy cập (Who has access)**: **`Bất kỳ ai (Anyone)`** *(Bắt buộc chọn Anyone để web gọi được API mà không cần đăng nhập Google)*.
4. Bấm **Triển khai (Deploy)** $\rightarrow$ **Cấp quyền (Authorize access)** $\rightarrow$ chọn tài khoản Google của bạn $\rightarrow$ bấm **Nâng cao (Advanced)** $\rightarrow$ **Đi tới... (không an toàn)** $\rightarrow$ **Cho phép (Allow)**.
5. Sao chép đường dẫn **URL ứng dụng web** (dạng `https://script.google.com/macros/s/AKfycb.../exec`).

### Bước 4: Dán URL vào cấu hình Website
1. Mở file [`assets/js/config.js`](file:///Users/admin/Desktop/LuckyQQ/assets/js/config.js).
2. Dán URL vừa sao chép vào trường `webAppUrl`:
   ```javascript
   window.LUCKY_CONFIG = {
     sheetId: '1WfZPzYlBQLvyO6Anrir7mQ5rlQmgQVFQamrWAu0VumY',
     sheetTab: 'CUOC',
     legacyTab: 'KHÁCH',
     webAppUrl: 'https://script.google.com/macros/s/AKfycb.../exec'
   };
   ```
3. Lưu file lại. Từ thời điểm này, dải banner màu vàng trên web sẽ tự biến mất và chuyển sang chế độ **Ghi trực tiếp vào Sheet**!

---

## 3. CÁCH SỬ DỤNG TRÊN WEBSITE

- **Xem trực quan**: Mở [`index.html`](file:///Users/admin/Desktop/LuckyQQ/index.html) hoặc chạy `python3 backend/dev_server.py` để mở `http://localhost:8089`.
- **Thêm mua số**: Bấm **`➕ Thêm Mua Số`**. Chọn ngày $\rightarrow$ Các đài xổ hôm đó tự động hiện ra dưới dạng các chip nút bấm (VD: Thứ 7 có đủ 4 đài TPHCM, Long An, Bình Phước, Hậu Giang). Bấm vào chip để bỏ bớt đài nếu khách chỉ đánh 2 hoặc 3 đài. Tiền xác và tiền lãi dự kiến cập nhật theo thời gian thực!
- **Dò kết quả tự động**: Sau 16h30 (MN), 17h30 (MT), 18h30 (MB), chỉ cần bấm **`🔎 Dò Tự Động`**:
  - Hệ thống tự lấy bảng xổ số từ nguồn xosodaiphat.com.
  - Phân tích 18 lô (MN/MT) hoặc 27 lô (MB) theo từng đài mà khách đã chọn.
  - Tự điền số trúng vào cột **Trúng** (VD: `08 80 90` hoặc `15 51x2`) và tự động lưu ngược về Sheet!
- **Sửa tay nếu cần**: Bấm biểu tượng cây bút `✎` cạnh số nháy của từng dòng để chỉnh sửa nhanh.
