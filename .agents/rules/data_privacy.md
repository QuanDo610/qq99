# NGUYÊN TẮC BẢO MẬT & PHÂN TÁCH DỮ LIỆU (LUCKY QQ99)

> **Mục tiêu**: Tuyệt đối bảo vệ bí mật kinh doanh, giá vốn nộp Nguồn và lợi nhuận của Q trước Khách Hàng.

---

## 1. DỮ LIỆU XUẤT CHO KHÁCH HÀNG (CUSTOMER-FACING)
Khi sao chép hoặc gửi tin nhắn cho Khách Hàng:
- **ĐƯỢC PHÉP CHỨA**:
  1. Ngày đánh (`Date`)
  2. Tên khách (`Player`)
  3. Miền & Số đài (`Miền`, `Đài`)
  4. Các số đã chọn (`Số`)
  5. Điểm cược (`Tiền`)
  6. Tiền xác thu khách (`thu KHÁCH`)
  7. Kết quả số nháy (`Trúng N Lô`)
  8. Tiền thưởng trả khách (`KHÁCH TRÚNG`)
  9. Lời / Lỗ của khách (`KHÁCH`)
- **TUYỆT ĐỐI CẤM (NEVER INCLUDE)**:
  - `NGUỒN thu` (Tiền nộp Nguồn)
  - `Q TRÚNG` (Tiền Nguồn trả Q)
  - `Q Lời` (Lợi nhuận của Q)
  - Tỷ lệ 76% hoặc chênh lệch hoa hồng $74 - 72$.

---

## 2. DỮ LIỆU XUẤT CHO CHỦ NGUỒN (SOURCE-FACING)
Khi xuất phơi nộp Chủ Nguồn:
- **CHỈ CHỨA**:
  1. Ngày (`Date`)
  2. Miền & Đài (`Miền`, `Đài`)
  3. Số cược & Điểm (`Số`, `Tiền`)
  4. Xác nộp Nguồn (`NGUỒN thu` - 76%)
  5. Thưởng Nguồn trả (`Q TRÚNG` - $\times 74$)
- Không chứa tên người chơi thật nếu không cần thiết.
