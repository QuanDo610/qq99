/**
 * =========================================================
 * STATIONS.JS - LỊCH ĐÀI XỔ SỐ CỐ ĐỊNH THEO THỨ (3 MIỀN)
 * Đã đối chiếu với xosodaiphat.com (tuần 08-14/11/2026).
 * Tên đài dùng đúng tên trên trang kết quả để dò khớp.
 * =========================================================
 */
const Stations = {
  // Chỉ số thứ theo Date.getDay(): 0 = Chủ nhật ... 6 = Thứ 7
  SCHEDULE: {
    Nam: {
      0: ['Tiền Giang', 'Kiên Giang', 'Đà Lạt'],
      1: ['TPHCM', 'Đồng Tháp', 'Cà Mau'],
      2: ['Bến Tre', 'Vũng Tàu', 'Bạc Liêu'],
      3: ['Đồng Nai', 'Cần Thơ', 'Sóc Trăng'],
      4: ['Tây Ninh', 'An Giang', 'Bình Thuận'],
      5: ['Vĩnh Long', 'Bình Dương', 'Trà Vinh'],
      6: ['TPHCM', 'Long An', 'Bình Phước', 'Hậu Giang']
    },
    Trung: {
      0: ['Khánh Hòa', 'Kon Tum', 'Huế'],
      1: ['Phú Yên', 'Huế'],
      2: ['Đắk Lắk', 'Quảng Nam'],
      3: ['Đà Nẵng', 'Khánh Hòa'],
      4: ['Quảng Bình', 'Bình Định', 'Quảng Trị'],
      5: ['Gia Lai', 'Ninh Thuận'],
      6: ['Đà Nẵng', 'Quảng Ngãi', 'Đắk Nông']
    },
    'Bắc': {
      0: ['Miền Bắc'], 1: ['Miền Bắc'], 2: ['Miền Bắc'], 3: ['Miền Bắc'],
      4: ['Miền Bắc'], 5: ['Miền Bắc'], 6: ['Miền Bắc']
    }
  },

  // Tên gõ tắt thường dùng (gõ trong Sheet cũng nhận được)
  ALIASES: {
    hcm: 'TPHCM', tphcm: 'TPHCM', saigon: 'TPHCM',
    la: 'Long An', bp: 'Bình Phước', hg: 'Hậu Giang',
    dt: 'Đồng Tháp', cm: 'Cà Mau', bt: 'Bến Tre', vt: 'Vũng Tàu', bl: 'Bạc Liêu',
    dn: 'Đồng Nai', ct: 'Cần Thơ', st: 'Sóc Trăng', tn: 'Tây Ninh', ag: 'An Giang',
    bth: 'Bình Thuận', vl: 'Vĩnh Long', bd: 'Bình Dương', tv: 'Trà Vinh',
    tg: 'Tiền Giang', kg: 'Kiên Giang', dl: 'Đà Lạt',
    hue: 'Huế', thuathienhue: 'Huế', py: 'Phú Yên', dlk: 'Đắk Lắk', qn: 'Quảng Nam',
    dng: 'Đà Nẵng', kh: 'Khánh Hòa', qb: 'Quảng Bình', bdinh: 'Bình Định', qt: 'Quảng Trị',
    gl: 'Gia Lai', nt: 'Ninh Thuận', qng: 'Quảng Ngãi', dno: 'Đắk Nông', kt: 'Kon Tum',
    mb: 'Miền Bắc', mienbac: 'Miền Bắc'
  },

  /** Bỏ dấu + chữ thường + bỏ ký tự lạ: "Đắk Lắk" -> "daklak" */
  key(name) {
    return String(name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  /** Đưa mọi cách gõ về tên chuẩn. Trả '' nếu không nhận ra. */
  canonical(name, mien, date) {
    const k = this.key(name);
    if (!k) return '';
    if (this.ALIASES[k]) return this.ALIASES[k];
    const all = this.allNames();
    return all.find(n => this.key(n) === k) || '';
  },

  allNames() {
    const set = new Set();
    Object.values(this.SCHEDULE).forEach(byDay => Object.values(byDay).forEach(l => l.forEach(n => set.add(n))));
    return [...set];
  },

  /** Chuẩn hóa tên miền: 'Nam' | 'Trung' | 'Bắc' */
  normMien(m) {
    const r = String(m || '').toLowerCase();
    if (r.includes('bắc') || r.includes('bac') || r === 'mb') return 'Bắc';
    if (r.includes('trung') || r === 'mt') return 'Trung';
    return 'Nam';
  },

  /** 'dd/mm/yyyy' -> Date (giờ địa phương) hoặc null */
  parseDate(str) {
    const m = String(str || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  },

  weekdayName(dateStr) {
    const d = this.parseDate(dateStr);
    return d ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()] : '';
  },

  /** Các đài xổ trong ngày đó của miền đó */
  forDay(mien, dateStr) {
    const d = this.parseDate(dateStr);
    if (!d) return [];
    const m = this.normMien(mien);
    return (this.SCHEDULE[m][d.getDay()] || []).slice();
  },

  /**
   * Đọc cột "Đài" thành danh sách tên chuẩn.
   * - "TPHCM, Long An" / "HCM, LA"  -> theo tên
   * - "3" (kiểu cũ, chỉ có số lượng) -> lấy N đài đầu của ngày đó
   */
  parseDai(raw, mien, dateStr) {
    const m = this.normMien(mien);
    if (m === 'Bắc') return ['Miền Bắc'];
    const text = String(raw == null ? '' : raw).trim();
    const day = this.forDay(m, dateStr);
    if (/^\d+$/.test(text)) {
      return day.slice(0, Math.max(1, Math.min(Number(text), day.length || Number(text))));
    }
    const list = [];
    text.split(/[,;\/|]+/).forEach(part => {
      const c = this.canonical(part.trim());
      if (c && !list.includes(c)) list.push(c);
    });
    return list;
  },

  /** Ghi list đài thành chuỗi lưu vào Sheet */
  joinDai(list) {
    return (list || []).join(', ');
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = Stations;
