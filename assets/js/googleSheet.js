/**
 * =========================================================
 * GOOGLE_SHEET.JS - ĐỌC / GHI GOOGLE SHEET (LUCKY QQ99)
 * Tab CUOC chỉ có 7 cột nguyên tử:
 *   Ngày | Khách | Miền | Đài | Số | Điểm cược | Trúng
 * - ĐỌC : gviz công khai (không cần deploy gì)
 * - GHI : Apps Script Web App (LUCKY_CONFIG.webAppUrl)
 * =========================================================
 */
const GoogleSheet = {
  get cfg() { return window.LUCKY_CONFIG || {}; },
  lastSyncTime: null,
  mode: 'cuoc', // 'cuoc' = đọc tab CUOC | 'legacy' = tạm đọc tab KHÁCH cũ

  canWrite() { return !!this.cfg.webAppUrl; },

  _norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  async _gviz(tab) {
    const url = `https://docs.google.com/spreadsheets/d/${this.cfg.sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}&t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Không kết nối được Google Sheet`);
    const text = await res.text();
    const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!m) throw new Error('Google Sheet trả dữ liệu không đúng định dạng');
    return JSON.parse(m[1]).table;
  },

  _cellStr(cell) {
    if (!cell || cell.v === null || cell.v === undefined) return '';
    return String(cell.v).trim();
  },

  _cellDate(cell) {
    if (!cell) return '';
    if (cell.f) return cell.f;
    const raw = cell.v == null ? '' : String(cell.v);
    const m = raw.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) return `${String(m[3]).padStart(2, '0')}/${String(Number(m[2]) + 1).padStart(2, '0')}/${m[1]}`;
    return raw;
  },

  /**
   * Đọc toàn bộ cược. Tự nhận biết tab CUOC (mới) hay tab KHÁCH (cũ).
   * Lưu ý: gviz nếu không thấy tab CUOC sẽ lặng lẽ trả tab đầu tiên -> phải kiểm tra tiêu đề.
   */
  async fetchSheetData() {
    const table = await this._gviz(this.cfg.sheetTab || 'CUOC');
    const labels = (table.cols || []).map(c => this._norm(c.label));
    const idx = (names, def) => {
      for (const n of names) { const i = labels.indexOf(n); if (i >= 0) return i; }
      return def;
    };

    const isLegacy = labels.includes('player') || labels.includes('thukhach');
    this.mode = isLegacy ? 'legacy' : 'cuoc';

    const iDate = idx(['ngay', 'date'], 0);
    const iPlayer = isLegacy ? idx(['player', 'khachhang'], 1) : idx(['khach', 'khachhang', 'player'], 1);
    const iMien = idx(['mien'], 2);
    const iDai = idx(['dai', 'sodai'], 3);
    const iSo = idx(['so', 'sodanh'], 4);
    const iTien = idx(['diemcuoc', 'tien'], 5);
    const iTrung = isLegacy ? idx(['trungnlo', 'nhaytrung'], 8) : idx(['trung'], 6);

    const records = [];
    let lastDate = '';

    (table.rows || []).forEach((r, i) => {
      const c = r.c || [];
      const player = this._cellStr(c[iPlayer]);
      const so = this._cellStr(c[iSo]);
      if (!player && !so) return;

      let date = this._cellDate(c[iDate]);
      if (isLegacy) { // tab cũ có dòng thiếu ngày -> lấy ngày dòng trên
        if (date) lastDate = date; else date = lastDate;
      }

      const rec = {
        rowId: i + 2,
        date,
        player,
        mien: this._cellStr(c[iMien]) || 'Nam',
        dai: this._cellStr(c[iDai]),
        so,
        tien: Number(c[iTien] && c[iTien].v) || 1000,
        trung: ''
      };

      if (isLegacy) {
        rec.legacyHits = Number(c[iTrung] && c[iTrung].v) || 0; // chỉ để đối chiếu
      } else {
        rec.trung = this._cellStr(c[iTrung]);
      }
      records.push(rec);
    });

    this.lastSyncTime = new Date().toLocaleTimeString('vi-VN');
    return records;
  },

  /** Gửi lệnh ghi lên Apps Script */
  async _post(payload) {
    if (!this.canWrite()) throw new Error('Chưa điền webAppUrl trong assets/js/config.js nên chưa ghi được vào Sheet');
    const res = await fetch(this.cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message || 'Apps Script báo lỗi');
    return json;
  },

  /** Thêm cược mới (7 cột nguyên tử, Trúng để trống = chưa dò) */
  addRow(t) {
    return this._post({
      action: 'add',
      rows: [{ date: t.date, player: t.player, mien: t.mien, dai: t.dai, so: t.so, tien: t.tien, trung: t.trung || '' }]
    });
  },

  /** Ghi cột Trúng cho nhiều dòng: items = [{rowId, trung}] */
  setTrung(items) {
    return this._post({ action: 'setTrung', items });
  },

  deleteRow(rowId) {
    return this._post({ action: 'delete', rowId });
  }
};
