/**
 * =========================================================
 * RESULTS.JS - LẤY & PHÂN TÍCH KẾT QUẢ XỔ SỐ (xosodaiphat.com)
 * - Lấy HTML qua proxy (dev_server.py khi chạy local, hoặc Apps Script)
 * - Bóc 2 số đuôi của TẤT CẢ giải (18 lô MN/MT, 27 lô MB) theo từng đài
 * - Đếm số nháy của từng con số theo đài mà khách đã chọn
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

  /** Lấy HTML thô qua proxy. Trả về chuỗi HTML. */
  async fetchHtml(mien, dateStr) {
    const m = Stations.normMien(mien);
    const code = { Nam: 'MN', Trung: 'MT', 'Bắc': 'MB' }[m];
    const q = `mien=${code}&date=${encodeURIComponent(dateStr)}`;
    const host = location.hostname;
    const isLocal = (host === 'localhost' || host === '127.0.0.1') && location.protocol.startsWith('http');
    const cfg = window.LUCKY_CONFIG || {};

    let url;
    if (isLocal) {
      url = `/api/kq?${q}`;
    } else if (cfg.webAppUrl) {
      url = `${cfg.webAppUrl}?action=kq&${q}`;
    } else {
      throw new Error('Chưa có proxy lấy kết quả: hãy chạy `python3 backend/dev_server.py` hoặc điền webAppUrl trong assets/js/config.js');
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Proxy lỗi HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success' || !json.html) throw new Error(json.message || 'Proxy không trả HTML');
    return json.html;
  },

  /**
   * Bóc kết quả từ HTML.
   * @returns {{mien:string, stations:Array<{name:string,key:string,tails:string[],complete:boolean}>}}
   */
  parseHtml(html, mien) {
    const m = Stations.normMien(mien);
    const expected = this.EXPECTED[m];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tailsOf = (el) => [...el.querySelectorAll('span')]
      .map(s => s.textContent.trim())
      .filter(t => /^\d{2,6}$/.test(t))
      .map(t => t.slice(-2));
    const isPrizeRow = (tr) => /^(G\.)?(ĐB|\d)/.test((tr.querySelector('td')?.textContent || '').trim());

    let stations = [];
    if (m === 'Bắc') {
      const table = doc.querySelector('table.table-xsmb');
      const tails = [];
      if (table) table.querySelectorAll('tr').forEach(tr => {
        if (!isPrizeRow(tr)) return;
        const tds = tr.querySelectorAll('td');
        for (let i = 1; i < tds.length; i++) tails.push(...tailsOf(tds[i]));
      });
      stations = [{ name: 'Miền Bắc', tails }];
    } else {
      const table = doc.querySelector('table.table-xsmn, table.table-xsmt');
      if (table) {
        const names = [...table.querySelectorAll('thead th a')].map(a => a.textContent.trim());
        stations = names.map(name => ({ name, tails: [] }));
        table.querySelectorAll('tbody tr').forEach(tr => {
          if (!isPrizeRow(tr)) return;
          const cells = tr.querySelectorAll('td.tn_prize');
          cells.forEach((td, i) => { if (stations[i]) stations[i].tails.push(...tailsOf(td)); });
        });
      }
    }

    stations.forEach(s => {
      s.name = Stations.canonical(s.name) || s.name;
      s.key = Stations.key(s.name);
      s.complete = s.tails.length === expected;
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
   * Dò 1 vé với kết quả.
   * @returns {{ready:boolean, reason?:string, hits:Object<string,number>}}
   */
  settle(ticket, kq) {
    const need = ticket.daiList && ticket.daiList.length ? ticket.daiList : [];
    if (!need.length) return { ready: false, reason: 'Vé chưa chọn đài', hits: {} };

    const hits = {};
    const numbers = [...new Set(Calculator.parseNumbers(ticket.so))];

    for (const name of need) {
      const st = kq.stations.find(s => s.key === Stations.key(name));
      if (!st) return { ready: false, reason: `Ngày này không có đài ${name}`, hits: {} };
      if (!st.complete) return { ready: false, reason: `${name} chưa xổ xong (${st.tails.length}/${this.EXPECTED[kq.mien]} giải)`, hits: {} };
      numbers.forEach(n => {
        const c = st.tails.filter(t => t === n).length;
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
