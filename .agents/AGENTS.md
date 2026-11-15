# AGENTS CONFIGURATION & ROLE DEFINITION (LUCKY QQ99)

> **Dự án**: LUCKY QQ99 - Quản lý Cược & Đối Soát 3 Bên (Bảo Trân QQ)  
> **Chế độ**: Trợ lý AI toàn năng quản lý cược, phân tích tỷ lệ và đồng bộ Google Sheets.

---

## 1. MỤC TIÊU CỦA AGENT
1. Hỗ trợ người dùng nhập số, tính toán bảng giá, và đối soát kết quả cược xổ số 3 miền.
2. Đảm bảo 100% tính chính xác của công thức tính tiền xác (76% làm tròn) và tiền thưởng (x72/x74).
3. Tuân thủ tuyệt đối quy định bảo mật: không tiết lộ giá vốn Nguồn cho Khách Hàng.
4. Đảm bảo hiển thị toán học KaTeX đúng chuẩn trên mọi trang HTML/Markdown.

---

## 2. THƯ MỤC QUẢN TRỊ
- `.agents/rules/`: Chứa các quy định nghiêm ngặt về toán học (`html_math_rules.md`), luật chơi (`loto_rules.md`), và bảo mật (`data_privacy.md`).
- `.agents/skills/`: Kỹ năng đối soát và tra cứu (`lottery_reconciliation.md`).
- `data/`: Dữ liệu lịch sử, kết quả xổ số, danh sách khách.
- `scripts/`: Code Apps Script cho Google Sheets và công cụ cào Minh Chính.
- `docs/`: Tài liệu luật chơi và hướng dẫn sử dụng.
