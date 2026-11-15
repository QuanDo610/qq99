# HƯỚNG DẪN DÀNH CHO GEMINI (AI ASSISTANT)

> **Dự án**: Quản lý cược và tra cứu kết quả Xổ Số 3 Miền (LUCKY QQ99 - BẢO TRÂN QQ)  
> **Nguồn kết quả**: Website Xổ Số Minh Chính (`https://www.minhchinh.com/ket-qua-xo-so-mien-nam.html`)  
> **Mô hình**: Quản lý 2 tầng giá (**Khách Hàng** $\leftrightarrow$ **Tôi (Q)** $\leftrightarrow$ **Chủ Nguồn**).  
> **Google Sheet Database**: Tab `KHÁCH` (Duy nhất 1 tab, 13 cột chuẩn hóa, không dùng Mã Vé).  
> **Tài liệu luật chơi gốc**: Xem tại [LUAT_CHOI.md](./LUAT_CHOI.md)

---

## 1. CẤU TRÚC DỮ LIỆU (SHEET 'KHÁCH' - 1 TAB DUY NHẤT)
Hệ thống phân tách rõ 2 nhóm dữ liệu:

### A. Dữ liệu nguyên tử (Atomic Data - Cần thiết nhập vào)
1. `Date`: Ngày đánh (VD: `04/11/2026`)
2. `Player`: Tên khách hàng (VD: `Trần Thị Thùy Trang`)
3. `Miền`: `Nam`, `Bắc`, `Trung`
4. `Đài`: Số lượng đài (VD: `3`, `1`)
5. `Số`: Các con số đánh, cách nhau khoảng trắng hoặc dấu gạch (VD: `08 80 09 90` hoặc `15-51`)
6. `Tiền`: Điểm cược mỗi con (VD: `5000`)
7. `Trúng N Lô`: Số nháy trúng thưởng (VD: `0`, `1`, `2`, `3`...)

### B. Dữ liệu tính toán tự động (Derived / Calculated Data - App tự tính 100%, không cần viết công thức phức tạp trong Sheet)
8. `thu KHÁCH`: Tiền xác thu từ khách hàng
9. `NGUỒN thu`: Tiền xác nộp cho Chủ Nguồn (76% làm tròn bỏ lẻ nghìn)
10. `KHÁCH TRÚNG`: Tiền thưởng trả khách ($\times 72$)
11. `Q TRÚNG`: Tiền thưởng Nguồn trả Tôi ($\times 74$)
12. `KHÁCH`: Lời / Lỗ của khách ($= \text{KHÁCH TRÚNG} - \text{thu KHÁCH}$)
13. `Q Lời`: Lợi nhuận ròng của Tôi ($= (\text{thu KHÁCH} - \text{NGUỒN thu}) + (\text{Q TRÚNG} - \text{KHÁCH TRÚNG})$)

---

## 2. QUY TẮC NHẬP SỐ TRÚNG THƯỞNG (HỖ TRỢ NHIỀU NHÁY)
Khi người dùng nhập số trúng, hệ thống hỗ trợ linh hoạt các định dạng:
- Dạng số lần: `19.3` hoặc `19x3` hoặc `19*3` hoặc `19:3` (số 19 về 3 nháy).
- Dạng lặp lại: `19 19 19` (số 19 về 3 nháy).
- Dạng kết hợp: `19.3 52 08x2 44` (19 ba nháy, 52 một nháy, 08 hai nháy, 44 một nháy).
- Dạng dán bảng lô Minh Chính: Tự động bóc tách 2 số đuôi của tất cả các lô.
- Ngoài ra, người dùng có thể bấm trực tiếp nút `+` / `-` trên từng dòng trong bảng để tăng giảm số nháy trúng tức thì.

---

## 3. NGUYÊN TẮC BẢO MẬT & TÁCH BẠCH DỮ LIỆU
- **Khi xuất tin nhắn gửi Khách Hàng**:
  - CHỈ chứa: `Date`, `Player`, `Miền`, `Đài`, `Số`, `Tiền cược`, `thu KHÁCH`, `Kết quả`, `KHÁCH TRÚNG`, `KHÁCH Lời/Lỗ`.
  - **TUYỆT ĐỐI KHÔNG** được có `NGUỒN thu`, `Q TRÚNG`, hay `Q Lời`.
- **Khi xuất phơi nộp Nguồn**:
  - CHỈ chứa: `Date`, `Miền`, `Đài`, `Số`, `Tiền`, `NGUỒN thu`, `Q TRÚNG`.

---

## 4. QUY TẮC CỐT LÕI (KHÁCH vs NGUỒN)

### A. Miền Nam & Miền Trung (MN & MT - 18 lô/đài)
* **Bao Lô 2 số**:
  * **Thu Khách**: Xác $1\text{k} = 14\text{k}$/đài. Khách trúng ăn **$\times 72$** ($1\text{k} \rightarrow 72\text{k}$).
  * **Nộp Nguồn**: $\text{Xác} = \lfloor (\text{Điểm} \times 18 \times 76 \times \text{Số đài} \times \text{Số con}) / 100 / 1000 \rfloor \times 1000$.
    * $1\text{k}$ (1 đài) $\rightarrow \mathbf{13\text{k}}$ xác.
    * $1\text{k}$ (3 đài) $\rightarrow \mathbf{41\text{k}}$ xác.
    * $5\text{k}$ (3 đài - 4 con) $\rightarrow \mathbf{820\text{k}}$ xác.
  * **Nguồn trả thưởng**: Ăn **$\times 74$** ($1\text{k} \rightarrow 74\text{k}$).
  * **Lợi nhuận của Tôi**:
    * Tiền xác: Hưởng chênh lệch $\text{Xác Khách} - \text{Xác Nguồn}$.
    * Tiền trúng: Hưởng chênh lệch $74 - 72 = \mathbf{+2\text{k}}$ trên mỗi 1k điểm trúng.

### B. Miền Bắc (MB - 27 lô - 1 đài)
* **Bao Lô 2 số MB**:
  * **Thu Khách**: Xác $1\text{k} = 21\text{k}$. Khách trúng ăn **$\times 72$**.
  * **Nộp Nguồn**: $\text{Xác} = \lfloor (\text{Điểm} \times 27 \times 76 \times \text{Số con}) / 100 / 1000 \rfloor \times 1000$.
    * $1\text{k} \rightarrow \mathbf{20\text{k}}$ xác.
    * $5\text{k} \rightarrow \mathbf{102\text{k}}$ xác.
  * **Nguồn trả thưởng**: Ăn **$\times 74$**.
  * **Lợi nhuận của Tôi**: Chênh lệch xác + Chênh lệch trúng $\times 2$.
