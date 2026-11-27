/**
 * =========================================================
 * RESULTS.JS - LẤY & PHÂN TÍCH KẾT QUẢ XỔ SỐ (xosodaiphat.com)
 * - Lấy HTML qua Google Apps Script Web App (proxy trực tiếp, không cần backend server)
 * - Bóc kết quả đầy đủ (lô 2 số, lô 3 số, lô 4 số, đầu đuôi, xỉu chủ) theo từng đài
 * - Đếm số nháy của từng con số theo đài & loại cược mà khách đã chọn
 * =========================================================
 */
const Results = {
  SLUG: { Nam: 'xsmn', Trung: 'xsmt', 'Bắc': 'xsmb' },
  EXPECTED: { Nam: 18, Trung: 18, 'Bắc': 27 },

  /** Địa chỉ trang nguồn (để hiển thị / debug) */
  sourceUrl(mien, dateStr) {
    const m = Stations.normMien(mien);
    return `https://xosodaiphat.com/${this.SLUG[m]}-${dateStr.replace(/\//g, '-')}.html`;
  },

  cacheKey(mien, dateStr) {
    return `KQ_${Stations.normMien(mien)}_${dateStr.replace(/\//g, '')}`;
  },

  /** Lấy HTML thô qua Google Apps Script proxy. Trả về chuỗi HTML. */
  async fetchHtml(mien, dateStr) {
    const m = Stations.normMien(mien);
    const code = { Nam: 'MN', Trung: 'MT', 'Bắc': 'MB' }[m];
    const q = `mien=${code}&date=${encodeURIComponent(dateStr)}`;
    const cfg = window.LUCKY_CONFIG || {};

    if (!cfg.webAppUrl) {
      throw new Error('Chưa điền webAppUrl trong assets/js/config.js');
    }

    const url = `${cfg.webAppUrl}?action=kq&${q}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Apps Script trả HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success' || !json.html) throw new Error(json.message || 'Không lấy được HTML kết quả');
    return json.html;
  },

  /**
   * Bóc kết quả từ HTML theo từng đài và theo từng loại cược.
   * @returns {{mien:string, stations:Array<{name:string,key:string,tails2:string[],tails3:string[],tails4:string[],dauDuoi:string[],xiuChuDau:string[],xiuChuDuoi:string[],xiuChuDauDuoi:string[],tails:string[],complete:boolean}>}}
   */
  parseHtml(html, mien) {
    const m = Stations.normMien(mien);
    const expected = this.EXPECTED[m];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const numbersOf = (el) => [...el.querySelectorAll('span')]
      .map(s => s.textContent.trim())
      .filter(t => /^\d{2,6}$/.test(t));
    const isPrizeRow = (tr) => /^(G\.)?(ĐB|\d)/i.test((tr.querySelector('td')?.textContent || '').trim());

    let stations = [];
    if (m === 'Bắc') {
      const table = doc.querySelector('table.table-xsmb');
      const allNumbers = [];
      const prizes = {};
      if (table) table.querySelectorAll('tr').forEach(tr => {
        const rowText = (tr.querySelector('td')?.textContent || '').trim();
        if (/mã đb/i.test(rowText)) return;
        if (!isPrizeRow(tr)) return;
        const tds = tr.querySelectorAll('td');
        const rowNums = [];
        for (let i = 1; i < tds.length; i++) rowNums.push(...numbersOf(tds[i]));

        let pKey = 'OTHER';
        if (/đb/i.test(rowText)) pKey = 'DB';
        else {
          const match = rowText.match(/(\d+)/);
          if (match) pKey = 'G' + match[1];
        }
        prizes[pKey] = (prizes[pKey] || []).concat(rowNums);
        allNumbers.push(...rowNums);
      });

      const tails2 = allNumbers.map(t => t.slice(-2));
      const tails3 = allNumbers.filter(t => t.length >= 3).map(t => t.slice(-3));
      const tails4 = allNumbers.filter(t => t.length >= 4).map(t => t.slice(-4));
      const dauDuoi = [
        ...(prizes['G7'] || []).map(t => t.slice(-2)),
        ...(prizes['DB'] || []).map(t => t.slice(-2))
      ];
      const xiuChuDau = (prizes['G6'] || []).map(t => t.slice(-3));
      const xiuChuDuoi = (prizes['DB'] || []).map(t => t.slice(-3));
      const xiuChuDauDuoi = [
        ...(prizes['G6'] || []).map(t => t.slice(-3)),
        ...(prizes['DB'] || []).map(t => t.slice(-3))
      ];

      stations = [{
        name: 'Miền Bắc',
        allNumbers,
        prizes,
        tails2,
        tails3,
        tails4,
        dauDuoi,
        xiuChuDau,
        xiuChuDuoi,
        xiuChuDauDuoi,
        tails: tails2
      }];
    } else {
      const table = doc.querySelector('table.table-xsmn, table.table-xsmt');
      if (table) {
        const names = [...table.querySelectorAll('thead th a')].map(a => a.textContent.trim());
        stations = names.map(name => ({
          name,
          allNumbers: [],
          prizes: {},
          tails2: [],
          tails3: [],
          tails4: [],
          dauDuoi: [],
          xiuChuDau: [],
          xiuChuDuoi: [],
          xiuChuDauDuoi: [],
          tails: []
        }));

        table.querySelectorAll('tbody tr').forEach(tr => {
          const rowText = (tr.querySelector('td')?.textContent || '').trim();
          if (!isPrizeRow(tr)) return;

          let pKey = 'OTHER';
          if (/đb/i.test(rowText)) pKey = 'DB';
          else {
            const match = rowText.match(/(\d+)/);
            if (match) pKey = 'G' + match[1];
          }

          const cells = tr.querySelectorAll('td.tn_prize');
          cells.forEach((td, i) => {
            if (stations[i]) {
              const nums = numbersOf(td);
              stations[i].allNumbers.push(...nums);
              stations[i].prizes[pKey] = (stations[i].prizes[pKey] || []).concat(nums);
            }
          });
        });

        stations.forEach(s => {
          s.tails2 = s.allNumbers.map(t => t.slice(-2));
          s.tails3 = s.allNumbers.filter(t => t.length >= 3).map(t => t.slice(-3));
          s.tails4 = s.allNumbers.filter(t => t.length >= 4).map(t => t.slice(-4));
          s.dauDuoi = [
            ...(s.prizes['G8'] || []).map(t => t.slice(-2)),
            ...(s.prizes['DB'] || []).map(t => t.slice(-2))
          ];
          s.xiuChuDau = (s.prizes['G7'] || []).map(t => t.slice(-3));
          s.xiuChuDuoi = (s.prizes['DB'] || []).map(t => t.slice(-3));
          s.xiuChuDauDuoi = [
            ...(s.prizes['G7'] || []).map(t => t.slice(-3)),
            ...(s.prizes['DB'] || []).map(t => t.slice(-3))
          ];
          s.tails = s.tails2;
        });
      }
    }

    stations.forEach(s => {
      s.name = Stations.canonical(s.name) || s.name;
      s.key = Stations.key(s.name);
      s.complete = (s.tails2 || []).length === expected;
    });
    return { mien: m, stations };
  },

  /** Đã lưu kết quả đầy đủ của (miền, ngày) chưa */
  getCached(mien, dateStr) {
    try {
      const raw = localStorage.getItem(this.cacheKey(mien, dateStr));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  /** Lấy kết quả (có cache). Chỉ lưu cache khi tất cả đài đã đủ giải. */
  async get(mien, dateStr, { force = false } = {}) {
    if (!force) {
      const cached = this.getCached(mien, dateStr);
      if (cached) return cached;
    }
    const html = await this.fetchHtml(mien, dateStr);
    const kq = this.parseHtml(html, mien);
    if (kq.stations.length && kq.stations.every(s => s.complete)) {
      try { localStorage.setItem(this.cacheKey(mien, dateStr), JSON.stringify(kq)); } catch (e) { /* đầy bộ nhớ */ }
    }
    return kq;
  },

  /**
   * Dò 1 vé với kết quả dựa trên đài và loại cược.
   * @returns {{ready:boolean, reason?:string, hits:Object<string,number>}}
   */
  settle(ticket, kq) {
    const need = ticket.daiList && ticket.daiList.length ? ticket.daiList : [];
    if (!need.length) return { ready: false, reason: 'Vé chưa chọn đài', hits: {} };

    const loaiCuoc = ticket.loaiCuoc || 'Bao Lô 2 số';
    const digitLen = Calculator.getDigitLength(loaiCuoc);
    const numbers = [...new Set(Calculator.parseNumbers(ticket.so, digitLen))];
    const hits = {};

    for (const name of need) {
      const st = kq.stations.find(s => s.key === Stations.key(name));
      if (!st) return { ready: false, reason: `Ngày này không có đài ${name}`, hits: {} };
      if (!st.complete) return { ready: false, reason: `${name} chưa xổ xong (${(st.tails2 || st.tails || []).length}/${this.EXPECTED[kq.mien]} giải)`, hits: {} };

      let pool = [];
      if (loaiCuoc === 'Bao Lô 2 số') {
        pool = st.tails2 || st.tails || [];
      } else if (loaiCuoc === 'Bao Lô 3 số') {
        pool = st.tails3 || [];
      } else if (loaiCuoc === 'Bao Lô 4 số') {
        pool = st.tails4 || [];
      } else if (loaiCuoc === 'Đầu Đuôi') {
        pool = st.dauDuoi || [];
      } else if (loaiCuoc === 'Xỉu Chủ Đầu') {
        pool = st.xiuChuDau || [];
      } else if (loaiCuoc === 'Xỉu Chủ Đuôi') {
        pool = st.xiuChuDuoi || [];
      } else if (loaiCuoc === 'Xỉu Chủ Đầu Đuôi') {
        pool = st.xiuChuDauDuoi || [];
      } else {
        pool = st.tails2 || st.tails || [];
      }

      numbers.forEach(n => {
        const c = pool.filter(t => t === n).length;
        if (c) hits[n] = (hits[n] || 0) + c;
      });
    }
    return { ready: true, hits };
  },

  /** { '08': 2, '80': 1 } -> "08x2 80" ; rỗng -> "-" (đã dò, trượt) */
  hitsToTrung(hits) {
    const parts = Object.entries(hits).sort().map(([n, c]) => (c > 1 ? `${n}x${c}` : n));
    return parts.length ? parts.join(' ') : '-';
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = Results;
