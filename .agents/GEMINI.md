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
> **Quy định xác 2, 3, 4 số**: Đồng nhất **14k xác** cho MN/MT và **21k xác** cho MB trên mỗi 1k điểm cược!

### A. Miền Nam & Miền Trung (MN & MT)
* **Bao Lô 2, 3, 4 số**:
  * **Thu Khách**: Điểm $\times 14\text{k} \times \text{Số đài} \times \text{Số con}$.
  * **Nộp Nguồn (76%)**: $\text{Xác} = \lfloor (\text{Điểm} \times \text{Số lô} \times 76 \times \text{Số đài} \times \text{Số con}) / 100 / 1000 \rfloor \times 1000$. (2 số = 18 lô; 3 số = 17 lô; 4 số = 16 lô).
  * **Trả thưởng Khách**: 2 số ăn $\times 72$; 3 số ăn $\times 620$; 4 số ăn $\times 5.000$.
  * **Nguồn trả Q**: 2 số ăn $\times 74$; 3 số ăn $\times 650$; 4 số ăn $\times 5.500$.
* **Đầu Đuôi & Xỉu Chủ**:
  * **Đầu Đuôi (G8 + ĐB)**: 10k cược $\rightarrow$ 16k xác. Ăn $\times 72$.
  * **Xỉu Chủ (G7 & ĐB)**: 1k cược $\rightarrow$ 2k xác. Ăn $\times 620$ (Nguồn $\times 650$).

### B. Miền Bắc (MB - 27 lô - 1 đài)
* **Bao Lô 2, 3, 4 số MB**:
  * **Thu Khách**: Điểm $\times 21\text{k} \times \text{Số con}$.
  * **Nộp Nguồn (76%)**: $\text{Xác} = \lfloor (\text{Điểm} \times \text{Số lô} \times 76 \times \text{Số con}) / 100 / 1000 \rfloor \times 1000$. (2 số = 27 lô; 3 số = 23 lô; 4 số = 20 lô).
  * **Trả thưởng**: 2 số ăn $\times 72$ (Nguồn $\times 74$); 3 số ăn $\times 620$ (Nguồn $\times 650$); 4 số ăn $\times 5.000$ (Nguồn $\times 5.500$).
* **Đầu Đuôi & Xỉu Chủ MB**:
  * **Đầu Đuôi MB (4 số G7 + ĐB - 5 lô)**: 10k cược $\rightarrow$ 40k xác (4k/1k). Ăn $\times 72$.
  * **Xỉu Chủ MB (3 số G6 + ĐB - 4 lô)**: 10k cược $\rightarrow$ 32k xác (Hệ số 3.2). Ăn $\times 620$ (Nguồn $\times 650$).
