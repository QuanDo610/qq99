# QUY TẮC CỐT LÕI TÍNH CƯỢC & ĐỐI SOÁT 3 BÊN (LUCKY QQ99)

> **Áp dụng**: Bắt buộc cho toàn bộ logic tính toán và đối soát vé cược.  
> **Chủ thể**: Khách Hàng $\leftrightarrow$ Tôi (Q) $\leftrightarrow$ Chủ Nguồn.

---

## 1. MIỀN NAM & MIỀN TRUNG (MN & MT - 18 LÔ/ĐÀI)

### A. Tiền Xác (Cost)
- **Thu Khách**: Điểm $\times 14\text{k} \times \text{Số đài} \times \text{Số con}$
- **Nộp Nguồn (76%)**:
  $$\text{Xác Nguồn} = \left\lfloor \frac{\text{Điểm (VNĐ)} \times 18 \times 76 \times \text{Số đài} \times \text{Số con}}{100 \times 1000} \right\rfloor \times 1000$$
  *(Làm tròn: Bỏ phần lẻ nghìn, lấy số nghìn nguyên).*
- **Ví dụ kiểm chứng**:
  - $1\text{k}$ (1 đài): $\lfloor 13.680 / 1000 \rfloor \times 1000 = \mathbf{13.000\text{ đ}}$.
  - $1\text{k}$ (3 đài): $\lfloor 41.040 / 1000 \rfloor \times 1000 = \mathbf{41.000\text{ đ}}$.
  - $5\text{k}$ (3 đài - 4 con): $\lfloor 820.800 / 1000 \rfloor \times 1000 = \mathbf{820.000\text{ đ}}$.

### B. Tiền Thưởng (Payout)
- **Khách Trúng**: $\text{Số nháy trúng} \times \text{Điểm} \times 72$ ($1\text{k} \rightarrow 72\text{k}$).
- **Nguồn Trả Q**: $\text{Số nháy trúng} \times \text{Điểm} \times 74$ ($1\text{k} \rightarrow 74\text{k}$).
- **Hoa hồng trúng Q nhận**: $\text{Số nháy} \times \text{Điểm} \times 2$ ($+2\text{k}$ cho mỗi 1k điểm).

---

## 2. MIỀN BẮC (MB - 27 LÔ - 1 ĐÀI)

### A. Tiền Xác (Cost)
- **Thu Khách**: Điểm $\times 21\text{k} \times \text{Số con}$
- **Nộp Nguồn (76%)**:
  $$\text{Xác Nguồn} = \left\lfloor \frac{\text{Điểm (VNĐ)} \times 27 \times 76 \times \text{Số con}}{100 \times 1000} \right\rfloor \times 1000$$
- **Ví dụ kiểm chứng**:
  - $1\text{k}$: $\lfloor 20.520 / 1000 \rfloor \times 1000 = \mathbf{20.000\text{ đ}}$.
  - $5\text{k}$: $\lfloor 102.600 / 1000 \rfloor \times 1000 = \mathbf{102.000\text{ đ}}$.

### B. Tiền Thưởng (Payout)
- **Khách Trúng**: $\times 72$
- **Nguồn Trả Q**: $\times 74$
- **Lợi nhuận Q**: Lãi xác + Hoa hồng trúng $\times 2$.

---

## 3. CÔNG THỨC LỢI NHUẬN RÒNG CỦA Q
$$\text{Q Lời} = (\text{thu KHÁCH} - \text{NGUỒN thu}) + (\text{Q TRÚNG} - \text{KHÁCH TRÚNG})$$
- Q luôn có lợi nhuận dương bất kể khách thắng hay thua khi chuyển vé lên Nguồn.
