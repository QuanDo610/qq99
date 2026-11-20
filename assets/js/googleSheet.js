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

  _fetchJsonp(tab) {
    return new Promise((resolve, reject) => {
      const cbName = '_gviz_cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      const script = document.createElement('script');
      let isDone = false;

      const timeout = setTimeout(() => {
        if (isDone) return;
        isDone = true;
        cleanup();
        reject(new Error('Hết thời gian chờ kết nối Google Sheet (Timeout 15s)'));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function(response) {
        if (isDone) return;
        isDone = true;
        cleanup();
        if (response && response.status === 'error') {
          const errMsg = response.errors && response.errors[0] ? response.errors[0].message : 'Google Sheet báo lỗi';
          reject(new Error(errMsg));
        } else if (response && response.table) {
          resolve(response.table);
        } else {
          reject(new Error('Dữ liệu Google Sheet không đúng định dạng'));
        }
      };

      script.onerror = function() {
        if (isDone) return;
        isDone = true;
        cleanup();
        reject(new Error('Không kết nối được Google Sheet (Vui lòng kiểm tra kết nối mạng)'));
      };

      script.src = `https://docs.google.com/spreadsheets/d/${this.cfg.sheetId}/gviz/tq?tqx=responseHandler:${cbName}&sheet=${encodeURIComponent(tab)}&t=${Date.now()}`;
      document.head.appendChild(script);
    });
  },

  async _gviz(tab) {
    // 1. Thử qua JSONP trước (hoạt động 100% tại local, file://, localhost mà không bị chặn CORS)
    try {
      return await this._fetchJsonp(tab);
    } catch (errJsonp) {
      console.warn('[GoogleSheet] JSONP không thành công, thử fetch thường:', errJsonp.message);
    }

    // 2. Dự phòng: Fetch thông thường nếu chạy qua môi trường web/proxy
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
    const m = raw.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `${String(m[3]).padStart(2, '0')}/${String(Number(m[2]) + 1).padStart(2, '0')}/${m[1]}`;
    return raw;
  },

  /**
   * Đọc toàn bộ cược. Tự nhận biết tab CUOC (mới) hay tab KHÁCH (cũ).
   * Tự động thử tab phụ nếu tab chính lỗi.
   */
  async fetchSheetData() {
    let table;
    try {
      table = await this._gviz(this.cfg.sheetTab || 'CUOC');
    } catch (e) {
      if (this.cfg.legacyTab) {
        console.warn(`[GoogleSheet] Không đọc được tab ${this.cfg.sheetTab}, thử tab cũ ${this.cfg.legacyTab}:`, e.message);
        table = await this._gviz(this.cfg.legacyTab);
      } else {
        throw e;
      }
    }
    const labels = (table.cols || []).map(c => this._norm(c.label));
    const idx = (names, def) => {
      for (const n of names) {
        const normN = this._norm(n);
        const i = labels.indexOf(normN);
        if (i >= 0) return i;
      }
      return def;
    };

    const isLegacy = labels.includes('player') || labels.includes('thukhach');
    this.mode = isLegacy ? 'legacy' : 'cuoc';

    const iDate = idx(['ngay', 'date'], 0);
    const iPlayer = isLegacy ? idx(['player', 'khachhang'], 1) : idx(['khach', 'khachhang', 'player'], 1);
    const iMien = idx(['mien'], 2);
    const iDai = idx(['dai', 'sodai'], 3);
    const iLoai = idx(['loaicuoc', 'loai', 'loaicược', 'loạicược', 'theloai', 'type', 'loai_cuoc'], -1);
    const iSo = idx(['so', 'sodanh'], iLoai >= 0 ? 5 : 4);
    const iTien = idx(['diemcuoc', 'tien'], iLoai >= 0 ? 6 : 5);
    const iTrung = isLegacy ? idx(['trungnlo', 'nhaytrung'], 8) : idx(['trung'], iLoai >= 0 ? 7 : 6);

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

      const rawLoai = iLoai >= 0 ? this._cellStr(c[iLoai]) : '';
      const loaiCuoc = rawLoai || Calculator.inferLoaiCuoc(so, 'Bao Lô 2 số');

      const rec = {
        rowId: i + 2,
        date,
        player,
        mien: this._cellStr(c[iMien]) || 'Nam',
        dai: this._cellStr(c[iDai]),
        loaiCuoc,
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

  /** Thêm cược mới (8 cột nguyên tử, Trúng để trống = chưa dò) */
  addRow(t) {
    return this._post({
      action: 'add',
      rows: [{
        date: t.date,
        player: t.player,
        mien: t.mien,
        dai: t.dai,
        loaiCuoc: t.loaiCuoc || 'Bao Lô 2 số',
        so: t.so,
        tien: t.tien,
        trung: t.trung || ''
      }]
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
