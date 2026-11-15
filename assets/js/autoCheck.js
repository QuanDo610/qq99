/**
 * =========================================================
 * AUTOCHECK.JS - DÒ SỐ TỰ ĐỘNG & THỦ CÔNG (LUCKY QQ99)
 * 1. Tự động: lấy kết quả từ xosodaiphat -> điền cột "Trúng"
 * 2. Thủ công: dán/nhập số trúng (19.3, 19x3, 19 19 19...)
 * Cột "Trúng": rỗng = chưa dò | "-" = đã dò, trượt | "08x2 80" = các số trúng
 * =========================================================
 */
const AutoChecker = {
  /**
   * Dò tự động các vé CHƯA DÒ (cột Trúng rỗng).
   * @param {Array} tickets      toàn bộ vé
   * @param {Function} filter    (ticket) => boolean, mặc định tất cả
   * @returns {Promise<{settled:Array, waiting:Array<{group:string,reason:string,count:number}>, errors:string[]}>}
   */
  async autoCheck(tickets, filter = () => true) {
    const pending = tickets.filter(t => t.trungState === 'pending' && filter(t));
    const groups = {};
    pending.forEach(t => {
      const k = `${t.mien}|${t.date}`;
      (groups[k] = groups[k] || []).push(t);
    });

    const settled = [];
    const waiting = [];
    const errors = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (const [k, list] of Object.entries(groups)) {
      const [mien, date] = k.split('|');
      const label = `${mien === 'Bắc' ? 'Miền Bắc' : 'Miền ' + mien} ${date}`;
      const d = Stations.parseDate(date);
      if (!d) { errors.push(`${label}: ngày không hợp lệ`); continue; }
      if (d > today) { waiting.push({ group: label, reason: 'Chưa tới ngày xổ', count: list.length }); continue; }

      let kq;
      try {
        kq = await Results.get(mien, date);
      } catch (e) {
        errors.push(`${label}: ${e.message}`);
        continue;
      }

      list.forEach(t => {
        const r = Results.settle(t, kq);
        if (!r.ready) {
          waiting.push({ group: `${label} - ${t.player}`, reason: r.reason, count: 1 });
          return;
        }
        settled.push({ ticket: t, trung: Results.hitsToTrung(r.hits) });
      });
    }
    return { settled, waiting, errors };
  },

  /**
   * Dò thủ công bằng bản đồ số trúng (áp cho mọi đài của vé).
   * @returns {Array<{ticket, trung}>}
   */
  manualSettle(tickets, winningMap, filter = () => true) {
    const out = [];
    tickets.forEach(t => {
      if (!filter(t)) return;
      const hits = {};
      [...new Set(Calculator.parseNumbers(t.so))].forEach(n => { if (winningMap[n]) hits[n] = winningMap[n]; });
      out.push({ ticket: t, trung: Results.hitsToTrung(hits) });
    });
    return out;
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = AutoChecker;
