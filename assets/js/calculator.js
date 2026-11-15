/**
 * =========================================================
 * CALCULATOR.JS - BỘ TÍNH TOÁN CƯỢC 3 BÊN (LUCKY QQ99)
 * Xử lý dữ liệu nguyên tử (atomic) -> tự động tính toán toàn bộ
 * Chuẩn hóa 100% khớp theo Google Sheet 'KHÁCH'
 * =========================================================
 */

const Calculator = {
  /**
   * Tách danh sách số đánh từ chuỗi bất kỳ (khoảng trắng, dấu '-', phẩy, chấm...)
   * Chuẩn hóa về 2 chữ số (ví dụ: '5' -> '05')
   * @param {string} raw - Chuỗi nhập vào ví dụ "08 80 09 90" hoặc "08-80-09-90"
   * @returns {string[]} Danh sách các số sạch (2 chữ số)
   */
  parseNumbers(raw) {
    if (!raw) return [];
    return String(raw)
      .split(/[\s,;.\-_/]+/)
      .map(s => s.trim())
      .filter(s => /^\d+$/.test(s))
      .map(s => s.length === 1 ? '0' + s : s.slice(-2));
  },

  /**
   * Phân tích chuỗi số trúng thưởng linh hoạt (Hỗ trợ nhiều nháy: 19.3, 19x3, 19 19 19...)
   * @param {string} text - Chuỗi số trúng (vd: "19.3 52 08x2 44:1 77 77" hoặc dán cả bảng lô Minh Chính)
   * @returns {Object.<string, number>} Bản đồ tần suất số trúng { '19': 3, '52': 1, '08': 2, ... }
   */
  parseWinningNumbers(text) {
    const freq = {};
    if (!text) return freq;

    const tokens = String(text).trim().split(/[\s,;]+/);
    tokens.forEach(token => {
      if (!token) return;

      // Kiểu 1: 19.3 hoặc 19x3 hoặc 19*3 hoặc 19:3 hoặc 19-3
      const multMatch = token.match(/^(\d{1,2})[\.xX\*\:\-](\d+)$/);
      if (multMatch) {
        let num = multMatch[1];
        if (num.length === 1) num = '0' + num;
        const count = parseInt(multMatch[2], 10) || 1;
        freq[num] = (freq[num] || 0) + count;
        return;
      }

      // Kiểu 2: Các chữ số thuần túy (ví dụ "19", "08", hoặc lô dài như "2536", "953606")
      if (/^\d+$/.test(token)) {
        let num = '';
        if (token.length <= 2) {
          num = token.length === 1 ? '0' + token : token;
        } else {
          // Lấy 2 số đuôi của lô
          num = token.slice(-2);
        }
        freq[num] = (freq[num] || 0) + 1;
      }
    });

    return freq;
  },

  /**
   * Đếm số nháy trúng thưởng cho một vé dựa trên bản đồ số trúng
   * @param {string|string[]} ticketNumbers - Số của vé (dạng chuỗi hoặc mảng)
   * @param {Object.<string, number>} winningMap - Bản đồ số trúng từ parseWinningNumbers
   * @returns {{ totalHits: number, hitDetails: Array<{ num: string, hits: number }> }}
   */
  countTicketMatches(ticketNumbers, winningMap) {
    const list = Array.isArray(ticketNumbers) ? ticketNumbers : this.parseNumbers(ticketNumbers);
    if (!winningMap || Object.keys(winningMap).length === 0 || list.length === 0) {
      return { totalHits: 0, hitDetails: [] };
    }

    let totalHits = 0;
    const hitDetails = [];

    list.forEach(num => {
      const hits = winningMap[num] || 0;
      if (hits > 0) {
        totalHits += hits;
        hitDetails.push({ num, hits });
      }
    });

    return { totalHits, hitDetails };
  },

  /**
   * Tính tiền xác thu Khách và nộp Nguồn
   * @param {string} region - 'Nam', 'Trung', 'Bắc' (hoặc MN, MT, MB)
   * @param {number} numStations - Số lượng đài (1, 2, 3, 4)
   * @param {number} numNumbers - Số lượng con số đánh
   * @param {number} amountVND - Điểm cược tính theo VNĐ (ví dụ 1000, 5000, 10000)
   * @returns {{ thuKhach: number, nguonThu: number, laiXac: number }}
   */
  calculateCosts(region, numStations, numNumbers, amountVND) {
    const isMB = region === 'Bắc' || region === 'MB';
    const stations = isMB ? 1 : Math.max(Number(numStations) || 1, 1);
    const count = Math.max(Number(numNumbers) || 1, 1);
    const amt = Number(amountVND) || 1000;

    let rateKhach = isMB ? 21 : 14; // Xác khách: MB 21k, MN/MT 14k
    let numPrizes = isMB ? 27 : 18; // MB 27 lô, MN/MT 18 lô

    // 1. Tiền thu KHÁCH
    const thuKhach = amt * rateKhach * stations * count;

    // 2. NGUỒN thu (Công thức 76% làm tròn bỏ lẻ nghìn)
    // Formula: (Điểm * Số lô * 76 * Số đài * Số con) / 100
    const rawNguon = (amt * numPrizes * 76 * stations * count) / 100;
    // Quy tắc làm tròn: Lấy phần nghìn nguyên (bỏ số lẻ hàng trăm, chục, đơn vị)
    const nguonThu = Math.floor(rawNguon / 1000) * 1000;

    // 3. Lãi xác của Q (Tôi)
    const laiXac = thuKhach - nguonThu;

    return {
      thuKhach,
      nguonThu,
      laiXac
    };
  },

  /**
   * Tính tiền thưởng trả khách, nhận từ nguồn và lợi nhuận của Q khi biết số nháy trúng
   * @param {number} amountVND - Điểm cược tính theo VNĐ (vd: 5000)
   * @param {number} hitMatches - Số nháy trúng (0, 1, 2, 3...)
   * @param {number} thuKhach - Tiền đã thu của khách
   * @param {number} nguonThu - Tiền đã nộp cho nguồn
   * @returns {{ khachTrung: number, qTrung: number, khachLoi: number, qLoi: number, laiThuong: number }}
   */
  calculateSettlement(amountVND, hitMatches, thuKhach, nguonThu) {
    const amt = Number(amountVND) || 1000;
    const matches = Math.max(Number(hitMatches) || 0, 0);

    // Khách ăn x72
    const khachTrung = matches * amt * 72;

    // Nguồn trả Q ăn x74
    const qTrung = matches * amt * 74;

    // Chênh lệch thưởng Q ăn (+2k trên mỗi 1k điểm)
    const laiThuong = qTrung - khachTrung;

    // Khách lời/lỗ ròng
    const khachLoi = khachTrung - thuKhach;

    // Lợi nhuận của Q (Tôi) = (thu Khách - Nguồn thu) + (Q trúng - Khách trúng)
    const qLoi = (thuKhach - nguonThu) + laiThuong;

    return {
      khachTrung,
      qTrung,
      khachLoi,
      qLoi,
      laiThuong
    };
  },

  /**
   * Số nháy từ cột "Trúng" (chuỗi liệt kê số trúng): "08x2 80" -> 08 trúng 2 nháy, 80 trúng 1 nháy.
   * Chỉ tính các số mà vé thực sự đánh. "-" hoặc rỗng = 0.
   */
  hitsFromTrung(trungStr, numbersList) {
    const freq = this.parseWinningNumbers(trungStr);
    let total = 0;
    (numbersList || []).forEach(n => { total += freq[n] || 0; });
    return total;
  },

  /**
   * LÀM GIÀU VÉ: từ 6 dữ liệu nguyên tử + cột Trúng -> tự tính toàn bộ số tiền.
   * Atomic : date, player, mien, dai, so, tien, trung
   * Derived: thuKhach, nguonThu, khachTrung, qTrung, khachLoi, qLoi, trungNLo ...
   * (KHÔNG tin bất kỳ số tiền nào đọc từ Sheet - luôn tính lại từ luật.)
   */
  enrichTicket(rawTicket) {
    const mien = Stations.normMien(rawTicket.mien);
    const date = rawTicket.date || '';
    const numbersList = this.parseNumbers(rawTicket.so);
    const daiList = Stations.parseDai(rawTicket.dai, mien, date);
    const tien = Number(rawTicket.tien) || 1000;

    const trung = String(rawTicket.trung == null ? '' : rawTicket.trung).trim();
    const trungState = trung === '' ? 'pending' : 'done';
    const trungNLo = trungState === 'done' ? this.hitsFromTrung(trung, numbersList) : 0;

    const costs = this.calculateCosts(mien, daiList.length || 1, numbersList.length, tien);
    const settlement = this.calculateSettlement(tien, trungNLo, costs.thuKhach, costs.nguonThu);

    return {
      rowId: rawTicket.rowId || null,
      date: date,
      player: rawTicket.player || 'Khách',
      mien: mien,
      dai: Stations.joinDai(daiList),
      daiList: daiList,
      soDai: daiList.length || 1,
      so: numbersList.join(' ') || rawTicket.so || '',
      tien: tien,
      trung: trung,
      trungState: trungState,
      trungNLo: trungNLo,
      thuKhach: costs.thuKhach,
      nguonThu: costs.nguonThu,
      laiXac: costs.laiXac,
      khachTrung: settlement.khachTrung,
      qTrung: settlement.qTrung,
      laiThuong: settlement.laiThuong,
      khachLoi: settlement.khachLoi,
      qLoi: settlement.qLoi,
      legacyHits: rawTicket.legacyHits
    };
  },

  /**
   * Định dạng tiền tệ VNĐ (ví dụ: 840000 -> "840.000 đ")
   */
  formatMoney(val) {
    const n = Number(val) || 0;
    return n.toLocaleString('vi-VN') + ' đ';
  }
};

// Export cho môi trường module hoặc gắn vào window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
}
