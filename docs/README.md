# 🎰 LUCKY QQ99 - HỆ THỐNG QUẢN LÝ CƯỢC & ĐỐI SOÁT 3 BÊN

Hệ thống quản lý cược, đối soát kết quả xổ số 3 miền và tính toán lợi nhuận 3 bên chuẩn hóa (**Khách Hàng $\leftrightarrow$ Tôi (Q) $\leftrightarrow$ Chủ Nguồn**). Đồng bộ trực tiếp với **Google Sheet (Tab: `CUOC` - 7 cột nguyên tử)**.

---

## 📁 CẤU TRÚC THƯ MỤC CHUẨN HÓA (BEST PRACTICE FOLDER STRUCTURE)

```text
LuckyQQ/
├── index.html                  # Giao diện chính duy nhất ở thư mục gốc (Mở trực tiếp trên Chrome/Safari)
├── assets/                     # Toàn bộ tài nguyên tĩnh của website
│   ├── css/
│   │   └── style.css           # Định dạng giao diện, KaTeX, số liệu mono-num
│   ├── js/
│   │   ├── config.js           # File cấu hình duy nhất: sheetId, sheetTab, legacyTab, webAppUrl
│   │   ├── stations.js         # Lịch đài cố định 3 miền theo thứ, chuẩn hóa tên đài, alias
│   │   ├── calculator.js       # Bộ tính toán 76% làm tròn, tự động làm giàu từ 7 dữ liệu nguyên tử
│   │   ├── results.js          # Lấy & phân tích kết quả xổ số từ xosodaiphat.com
│   │   ├── googleSheet.js      # Đọc/ghi Google Sheet (tab CUOC mới hoặc KHÁCH cũ)
│   │   ├── autoCheck.js        # Dò số tự động theo ngày/miền/đài & dò số thủ công
│   │   └── app.js              # Điều khiển Dashboard, View Mode, Accordion 3 bên, Form modal
│   └── img/
│       └── banking/            # Các hình ảnh mã QR chuyển khoản Vietcombank
├── backend/                    # Toàn bộ xử lý backend & công cụ hỗ trợ
│   ├── dev_server.py           # Server chạy local (python3 backend/dev_server.py -> localhost:8089)
│   ├── google_apps_script.js   # Duy nhất 1 file Google Apps Script v3.0 đưa lên Google Sheets
│   └── check_ket_qua.py        # Script Python cào trực tiếp MinhChinh.com
├── tests/                      # Bộ kiểm thử tự động
│   └── test.html               # 18 bài test tự động trên dữ liệu thật (mở /tests/test.html)
├── data/                       # Dữ liệu cục bộ và bộ nhớ đệm
│   ├── ket_qua_xo_so.json      # Bộ nhớ đệm kết quả xổ số
│   ├── lich_su_danh.csv        # File lịch sử đánh
│   └── nguoi_choi.json         # Danh sách người chơi
├── docs/                       # Toàn bộ tài liệu hướng dẫn và luật chơi
│   ├── README.md               # Tài liệu tổng quan dự án & hướng dẫn triển khai
│   ├── LUAT_CHOI.md            # Bảng quy định luật chơi & cơ chế giá 2 tầng
│   ├── HUONG_DAN_GOOGLE_SHEET.md # Hướng dẫn tích hợp Google Sheet v3.0 (tab CUOC)
│   └── luat_choi.html          # Trang HTML tham khảo luật chơi
└── .agents/                    # Toàn bộ cấu hình, rules và skills cho trợ lý AI
    ├── AGENTS.md               # Cấu hình vai trò của trợ lý AI
    ├── GEMINI.md               # Quy tắc hoạt động cho Gemini Assistant
    ├── rules/
    │   ├── html_math_rules.md  # Quy định bắt buộc hiển thị toán học KaTeX trên HTML
    │   ├── loto_rules.md       # Quy tắc tính tiền xác 76% và trả thưởng x72/x74
    │   └── data_privacy.md     # Quy tắc bảo mật tách bạch Khách vs Nguồn
    └── skills/
        └── lottery_reconciliation.md # Kỹ năng phân tích số trúng và đối soát
```

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI GOOGLE APPS SCRIPT (v3.0)

Để tự động đồng bộ vé mới từ Web App vào Google Sheet:

1. **Mở Google Sheet của bạn**:
   - Truy cập trang tính: [Google Sheets - Tab CUOC / KHÁCH](https://docs.google.com/spreadsheets/d/1WfZPzYlBQLvyO6Anrir7mQ5rlQmgQVFQamrWAu0VumY/edit?usp=sharing).
2. **Mở Trình Chỉnh Sửa Apps Script**:
   - Trên thanh menu của Google Sheet, bấm vào **Tiện ích mở rộng (Extensions)** $\rightarrow$ chọn **Apps Script**.
3. **Dán Mã Nguồn Mới**:
   - Xóa toàn bộ mã cũ trong file `Code.gs`.
   - Mở file [backend/google_apps_script.js](file:///Users/admin/Desktop/LuckyQQ/backend/google_apps_script.js), sao chép toàn bộ nội dung và dán vào.
   - Bấm biểu tượng **💾 Lưu dự án (Save)**.
4. **Tạo Tab CUOC và Chép Dữ Liệu Cũ**:
   - Tải lại Google Sheet (F5) $\rightarrow$ trên menu chọn **`🎰 LUCKY QQ99`**:
     - Bấm **`Tạo tab CUOC (7 cột)`** để tạo tab mới.
     - Bấm **`Chép dữ liệu từ tab KHÁCH cũ`** để chép 14 dòng cũ sang.
5. **Triển Khai Phiên Bản Mới (Deploy New Version)**:
   - Bấm vào nút màu xanh **Triển khai (Deploy)** ở góc trên bên phải $\rightarrow$ chọn **Bản triển khai mới (New deployment)**.
   - Chọn loại: **Ứng dụng web (Web app)**.
   - Cấu hình:
     - **Mô tả**: `LUCKY QQ99 v3.0`
     - **Thực thi dưới dạng (Execute as)**: `Tôi (Me)`
     - **Người có quyền truy cập (Who has access)**: `Bất kỳ ai (Anyone)` *(Rất quan trọng để Web App có thể gửi dữ liệu)*.
   - Bấm **Triển khai (Deploy)** $\rightarrow$ **Cấp quyền (Authorize access)** $\rightarrow$ chọn tài khoản Google $\rightarrow$ **Nâng cao (Advanced)** $\rightarrow$ **Đi tới dự án** $\rightarrow$ **Cho phép (Allow)**.
6. **Cập Nhật Web App URL Vào Website**:
   - Sao chép đường dẫn **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
   - Mở file [assets/js/config.js](file:///Users/admin/Desktop/LuckyQQ/assets/js/config.js), dán URL vừa copy vào biến `webAppUrl`.
     ```javascript
     webAppUrl: 'https://script.google.com/macros/s/.../exec',
     ```
6. **Sử Dụng Menu Tự Động Trên Sheet**:
   - Khi bạn mở lại Google Sheet và tải lại trang (F5), trên thanh menu sẽ xuất hiện thêm menu:
     `🎰 LUCKY QQ99`
     - `🔄 Tính Lại Toàn Bộ Cột & Lợi Nhuận`: Tự động tính toán lại 100% các cột tiền xác, tiền thưởng và lãi ròng cho tất cả các dòng.
     - `✨ Định Dạng & Trang Trí Bảng Đẹp Mắt`: Tự động căn lề, kẻ khung, đổi màu header và định dạng tiền tệ `#,##0 đ`.
     - `ℹ️ Xem Bảng Giá & Tỷ Lệ (Luật 76%)`: Xem tóm tắt quy định giá.

---

## 🎯 CÁCH SỬ DỤNG WEB APP LUCKY QQ99

1. Mở file [index.html](file:///Users/admin/Desktop/LuckyQQ/index.html) bằng bất kỳ trình duyệt nào (Chrome, Safari, Edge).
2. Vào thẳng màn hình **Dashboard** tổng kết doanh thu và bảng đối soát 13 cột.
3. Bấm **`➕ Thêm Mua Số (Add)`** để nhập đơn cược mới cho khách với xem trước tiền xác và tiền lãi dự kiến.
4. Bấm **`🎯 Nhập Số Trúng & Dò Vé`** để nhập số trúng thưởng linh hoạt (hỗ trợ `19.3`, `19x3`, `19 19 19` hoặc dán thẳng bảng kết quả Minh Chính).
5. Hoặc bấm trực tiếp **`[-]`** / **`[+]`** tại cột **Trúng N Lô** trên từng hàng để cập nhật nháy trúng tức thì.
6. Sao chép tin nhắn gửi riêng cho Khách hoặc phơi cược cho Nguồn bằng 2 nút riêng biệt, bảo mật tuyệt đối.
