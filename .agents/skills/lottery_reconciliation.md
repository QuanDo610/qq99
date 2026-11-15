# KỸ NĂNG ĐỐI SOÁT & TRA CỨU KẾT QUẢ XỔ SỐ (LUCKY QQ99)

> **Mô tả**: Hướng dẫn xử lý dữ liệu xổ số 3 miền, bóc tách số trúng nhiều nháy và tính toán đối soát tự động.

---

## 1. PHÂN TÍCH CÚ PHÁP SỐ TRÚNG THƯỞNG
Khi nhận dữ liệu trúng thưởng từ người dùng hoặc website:
1. **Dạng nhân nháy**: `19.3`, `19x3`, `19*3`, `19:3` $\rightarrow$ Số `19` trúng 3 nháy.
2. **Dạng lặp lại**: `19 19 19` $\rightarrow$ Số `19` trúng 3 nháy.
3. **Dạng dán cả bảng lô Minh Chính**:
   - Tách lấy 2 số đuôi của toàn bộ các giải trong ngày (18 lô với MN/MT, 27 lô với MB).
   - Đếm số lần xuất hiện của từng cặp số đuôi (00-99).

---

## 2. NGUYÊN TẮC TÍNH TOÁN DỮ LIỆU PHÁI SINH (DERIVED DATA)
Trong cơ sở dữ liệu Google Sheet, chỉ cần 7 trường dữ liệu nguyên tử (Atomic Data):
- `Date`, `Player`, `Miền`, `Đài`, `Số`, `Tiền`, `Trúng N Lô`.

Các trường còn lại được tự động làm giàu (`enrichTicket`) qua `Calculator`:
- $\text{thu KHÁCH} = \text{Tiền} \times \text{Rate Khách} \times \text{Đài} \times \text{Số con}$
- $\text{NGUỒN thu} = \lfloor (\text{Tiền} \times \text{Lô} \times 76 \times \text{Đài} \times \text{Con}) / 100 / 1000 \rfloor \times 1000$
- $\text{KHÁCH TRÚNG} = \text{Nháy} \times \text{Tiền} \times 72$
- $\text{Q TRÚNG} = \text{Nháy} \times \text{Tiền} \times 74$
- $\text{KHÁCH} = \text{KHÁCH TRÚNG} - \text{thu KHÁCH}$
- $\text{Q Lời} = (\text{thu KHÁCH} - \text{NGUỒN thu}) + (\text{Q TRÚNG} - \text{KHÁCH TRÚNG})$
