/**
 * =========================================================
 * CALCULATOR.JS - BỘ TÍNH TOÁN CƯỢC 3 BÊN (LUCKY QQ99)
 * Xử lý dữ liệu nguyên tử (atomic) -> tự động tính toán toàn bộ
 * Chuẩn hóa 100% khớp theo Google Sheet 'CUOC' (8 cột)
 * Hỗ trợ đa dạng loại cược: Bao Lô 2, 3, 4 số; Đầu Đuôi; Xỉu Chủ
 * =========================================================
 */

const Calculator = {
  /** Cấu hình các loại cược, số lô, tỷ lệ thu/trả */
  BET_CONFIG: {
    'Bao Lô 2 số': {
      name: 'Bao Lô 2 số',
      digitLength: 2,
      prizes: { Nam: 18, Trung: 18, 'Bắc': 27 },
      rateKhach: { Nam: 14000, Trung: 14000, 'Bắc': 21000 },
      multiplierKhach: 72,
      multiplierNguon: 74
    },
    'Bao Lô 3 số': {
      name: 'Bao Lô 3 số',
      digitLength: 3,
      prizes: { Nam: 17, Trung: 17, 'Bắc': 23 },
      rateKhach: { Nam: 17000, Trung: 17000, 'Bắc': 23000 },
      multiplierKhach: 600,
      multiplierNguon: 650
    },
    'Bao Lô 4 số': {
      name: 'Bao Lô 4 số',
      digitLength: 4,
      prizes: { Nam: 16, Trung: 16, 'Bắc': 20 },
      rateKhach: { Nam: 16000, Trung: 16000, 'Bắc': 20000 },
      multiplierKhach: 5000,
      multiplierNguon: 5500
    },
    'Đầu Đuôi': {
      name: 'Đầu Đuôi',
      digitLength: 2,
      prizes: { Nam: 2, Trung: 2, 'Bắc': 5 },
      rateKhach: { Nam: 2000, Trung: 2000, 'Bắc': 5000 },
      multiplierKhach: 72,
      multiplierNguon: 74
    },
    'Xỉu Chủ Đầu': {
      name: 'Xỉu Chủ Đầu',
      digitLength: 3,
      prizes: { Nam: 1, Trung: 1, 'Bắc': 1 },
      rateKhach: { Nam: 1000, Trung: 1000, 'Bắc': 1000 },
      multiplierKhach: 620,
      multiplierNguon: 650
    },
    'Xỉu Chủ Đuôi': {
      name: 'Xỉu Chủ Đuôi',
      digitLength: 3,
      prizes: { Nam: 1, Trung: 1, 'Bắc': 1 },
      rateKhach: { Nam: 1000, Trung: 1000, 'Bắc': 1000 },
      multiplierKhach: 620,
      multiplierNguon: 650
    },
    'Xỉu Chủ Đầu Đuôi': {
      name: 'Xỉu Chủ Đầu Đuôi',
      digitLength: 3,
      prizes: { Nam: 2, Trung: 2, 'Bắc': 2 },
      rateKhach: { Nam: 2000, Trung: 2000, 'Bắc': 2000 },
      multiplierKhach: 620,
      multiplierNguon: 650
    }
  },

  /**
   * Lấy cấu hình loại cược, chuẩn hóa fallback về 'Bao Lô 2 số'
   */
  getBetConfig(loaiCuoc) {
    if (!loaiCuoc) return this.BET_CONFIG['Bao Lô 2 số'];
    const key = Object.keys(this.BET_CONFIG).find(k => k.toLowerCase() === String(loaiCuoc).trim().toLowerCase());
    return this.BET_CONFIG[key] || this.BET_CONFIG['Bao Lô 2 số'];
  },

  /**
   * Độ dài chữ số mong muốn của loại cược (2, 3 hoặc 4)
   */
  getDigitLength(loaiCuoc) {
    return this.getBetConfig(loaiCuoc).digitLength;
  },

  /**
   * Tách danh sách số đánh từ chuỗi bất kỳ (khoảng trắng, dấu '-', phẩy, chấm...)
   * Chuẩn hóa về độ dài chữ số tương ứng (2 chữ số: '5' -> '05'; 3 chữ số: '7' -> '007')
   * @param {string} raw - Chuỗi nhập vào ví dụ "08 80" hoặc "123-456"
   * @param {number} digitLength - Số chữ số chuẩn hóa (2, 3, hoặc 4)
   * @returns {string[]} Danh sách các số sạch
   */
  parseNumbers(raw, digitLength = 2) {
    if (!raw) return [];
    const len = Number(digitLength) || 2;
    return String(raw)
      .split(/[\s,;.\-_/]+/)
      .map(s => s.trim())
      .filter(s => /^\d+$/.test(s))
      .map(s => s.length < len ? s.padStart(len, '0') : s.slice(-len));
  },

  /**
   * Phân tích chuỗi số trúng thưởng linh hoạt (Hỗ trợ nhiều nháy: 19.3, 19x3, 19 19 19...)
   * @param {string} text - Chuỗi số trúng (vd: "19.3 52 08x2 44:1 77 77" hoặc dán cả bảng lô Minh Chính)
   * @param {number} digitLength - Số chữ số chuẩn hóa (2, 3, hoặc 4)
   * @returns {Object.<string, number>} Bản đồ tần suất số trúng { '19': 3, '52': 1, '08': 2, ... }
   */
  parseWinningNumbers(text, digitLength = 2) {
    const freq = {};
    if (!text) return freq;
    const len = Number(digitLength) || 2;

    const tokens = String(text).trim().split(/[\s,;]+/);
    tokens.forEach(token => {
      if (!token) return;

      // Kiểu 1: 19.3 hoặc 19x3 hoặc 19*3 hoặc 19:3 hoặc 19-3
      const multMatch = token.match(/^(\d+)[\.xX\*\:\-](\d+)$/);
      if (multMatch) {
        let num = multMatch[1];
        if (num.length < len) num = num.padStart(len, '0');
        else if (num.length > len) num = num.slice(-len);
        const count = parseInt(multMatch[2], 10) || 1;
        freq[num] = (freq[num] || 0) + count;
        return;
      }

      // Kiểu 2: Các chữ số thuần túy (ví dụ "19", "08", hoặc lô dài như "2536", "953606")
      if (/^\d+$/.test(token)) {
        let num = token.length < len ? token.padStart(len, '0') : token.slice(-len);
        freq[num] = (freq[num] || 0) + 1;
      }
    });

    return freq;
  },

  /**
   * Đếm số nháy trúng thưởng cho một vé dựa trên bản đồ số trúng
   * @param {string|string[]} ticketNumbers - Số của vé (dạng chuỗi hoặc mảng)
   * @param {Object.<string, number>} winningMap - Bản đồ số trúng từ parseWinningNumbers
   * @param {number} digitLength - Độ dài chữ số (2, 3, 4)
   * @returns {{ totalHits: number, hitDetails: Array<{ num: string, hits: number }> }}
   */
  countTicketMatches(ticketNumbers, winningMap, digitLength = 2) {
    const list = Array.isArray(ticketNumbers) ? ticketNumbers : this.parseNumbers(ticketNumbers, digitLength);
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
   * @param {string} loaiCuoc - Loại cược ('Bao Lô 2 số', 'Bao Lô 3 số', 'Đầu Đuôi'...)
   * @returns {{ thuKhach: number, nguonThu: number, laiXac: number }}
   */
  calculateCosts(region, numStations, numNumbers, amountVND, loaiCuoc = 'Bao Lô 2 số') {
    const cfg = this.getBetConfig(loaiCuoc);
    const mien = typeof Stations !== 'undefined' ? Stations.normMien(region) : (String(region).includes('Bắc') || region === 'MB' ? 'Bắc' : 'Nam');
    const isMB = mien === 'Bắc';
    const stations = isMB ? 1 : Math.max(Number(numStations) || 1, 1);
    const count = Math.max(Number(numNumbers) || 1, 1);
    const amt = Number(amountVND) || 1000;

    const rateKhachPerUnit = cfg.rateKhach[mien] || cfg.rateKhach.Nam;
    const numPrizes = cfg.prizes[mien] || cfg.prizes.Nam;

    // 1. Tiền thu KHÁCH: (Điểm / 1000) * Đơn giá khách * Số đài * Số con
    const thuKhach = (amt / 1000) * rateKhachPerUnit * stations * count;

    // 2. NGUỒN thu (Công thức 76% làm tròn bỏ lẻ nghìn)
    // Formula: (Điểm * Số lô * 76 * Số đài * Số con) / 100
    const rawNguon = (amt * numPrizes * 76 * stations * count) / 100;
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
   * @param {string} loaiCuoc - Loại cược ('Bao Lô 2 số', 'Bao Lô 3 số', 'Đầu Đuôi'...)
   * @returns {{ khachTrung: number, qTrung: number, khachLoi: number, qLoi: number, laiThuong: number }}
   */
  calculateSettlement(amountVND, hitMatches, thuKhach, nguonThu, loaiCuoc = 'Bao Lô 2 số') {
    const cfg = this.getBetConfig(loaiCuoc);
    const amt = Number(amountVND) || 1000;
    const matches = Math.max(Number(hitMatches) || 0, 0);

    // Tiền thưởng Khách ăn
    const khachTrung = matches * amt * cfg.multiplierKhach;

    // Tiền thưởng Nguồn trả Q
    const qTrung = matches * amt * cfg.multiplierNguon;

    // Chênh lệch thưởng Q ăn
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
  hitsFromTrung(trungStr, numbersList, digitLength = 2) {
    const freq = this.parseWinningNumbers(trungStr, digitLength);
    let total = 0;
    (numbersList || []).forEach(n => { total += freq[n] || 0; });
    return total;
  },

  /**
   * LÀM GIÀU VÉ: từ 7 dữ liệu nguyên tử + cột Trúng -> tự tính toàn bộ số tiền.
   * Atomic : date, player, mien, dai, loaiCuoc, so, tien, trung
   * Derived: thuKhach, nguonThu, khachTrung, qTrung, khachLoi, qLoi, trungNLo ...
   */
  enrichTicket(rawTicket) {
    const mien = typeof Stations !== 'undefined' ? Stations.normMien(rawTicket.mien) : (rawTicket.mien || 'Nam');
    const date = rawTicket.date || '';
    const loaiCuoc = rawTicket.loaiCuoc || 'Bao Lô 2 số';
    const digitLen = this.getDigitLength(loaiCuoc);
    const numbersList = this.parseNumbers(rawTicket.so, digitLen);
    const daiList = typeof Stations !== 'undefined' ? Stations.parseDai(rawTicket.dai, mien, date) : [rawTicket.dai || '1'];
    const tien = Number(rawTicket.tien) || 1000;

    const trung = String(rawTicket.trung == null ? '' : rawTicket.trung).trim();
    const trungState = trung === '' ? 'pending' : 'done';
    const trungNLo = trungState === 'done' ? this.hitsFromTrung(trung, numbersList, digitLen) : 0;

    const costs = this.calculateCosts(mien, daiList.length || 1, numbersList.length, tien, loaiCuoc);
    const settlement = this.calculateSettlement(tien, trungNLo, costs.thuKhach, costs.nguonThu, loaiCuoc);

    return {
      rowId: rawTicket.rowId || null,
      date: date,
      player: rawTicket.player || 'Khách',
      mien: mien,
      dai: typeof Stations !== 'undefined' ? Stations.joinDai(daiList) : String(rawTicket.dai || ''),
      daiList: daiList,
      soDai: daiList.length || 1,
      loaiCuoc: loaiCuoc,
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
