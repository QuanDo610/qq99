/**
 * ====================================================================================
 * GOOGLE APPS SCRIPT - LUCKY QQ99 v3.0
 * Database chỉ lưu DỮ LIỆU NGUYÊN TỬ, mọi số tiền do website tự tính.
 *
 * TAB "CUOC" (7 cột):
 *   A Ngày | B Khách | C Miền | D Đài | E Số | F Điểm cược | G Trúng
 *
 *   Đài   : tên các đài đã chọn, cách nhau dấu phẩy. VD: "TPHCM, Long An, Hậu Giang"
 *   Trúng : rỗng = chưa dò | "-" = đã dò, trượt | "08x2 80" = số trúng (08 về 2 nháy, 80 về 1)
 *
 * CÁCH DÙNG (1 lần):
 *   1. Dán file này vào Apps Script của Sheet, Lưu.
 *   2. Chạy hàm  setupCuoc()  (tạo tab CUOC).
 *   3. (Tùy chọn) Chạy  migrateFromKhach()  để chép 14 dòng cũ sang CUOC (cột Trúng để trống,
 *      sau đó bấm "Dò Tự Động" trên web để điền lại).
 *   4. Deploy > Ứng dụng web > Execute as: Me, Access: Anyone > copy URL > dán vào
 *      assets/js/config.js (webAppUrl).
 * ====================================================================================
 */

var TAB = 'CUOC';
var LEGACY_TAB = 'KHÁCH';
var HEADERS = ['Ngày', 'Khách', 'Miền', 'Đài', 'Số', 'Điểm cược', 'Trúng'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB);
  if (!sh) throw new Error('Chưa có tab ' + TAB + '. Hãy chạy hàm setupCuoc() trước.');
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Tạo tab CUOC với 7 cột chuẩn, định dạng văn bản cho cột Đài/Số/Trúng (giữ số 0 đầu như "08") */
function setupCuoc() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1e293b').setHorizontalAlignment('center');
  sh.setFrozenRows(1);

  var rows = 2000;
  sh.getRange(2, 1, rows, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, 4, rows, 2).setNumberFormat('@');          // Đài, Số = văn bản
  sh.getRange(2, 6, rows, 1).setNumberFormat('#,##0');      // Điểm cược
  sh.getRange(2, 7, rows, 1).setNumberFormat('@');          // Trúng = văn bản

  sh.getRange(2, 3, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Nam', 'Trung', 'Bắc'], true).setAllowInvalid(false).build());

  // Gợi ý danh sách đài: Sheets không cho tạo dropdown "chọn nhiều" bằng code.
  // Muốn chọn nhiều ngay trong Sheet: bôi đen cột D > Chèn > Danh sách thả xuống > bật "Chọn nhiều mục".
  sh.setColumnWidths(1, 1, 95); sh.setColumnWidth(2, 190); sh.setColumnWidth(3, 70);
  sh.setColumnWidth(4, 260); sh.setColumnWidth(5, 260); sh.setColumnWidth(6, 95); sh.setColumnWidth(7, 150);
  SpreadsheetApp.getUi().alert('Đã tạo tab CUOC (7 cột). Bước tiếp: Deploy Web App và dán URL vào config.js.');
}

/** Chép dữ liệu nguyên tử từ tab KHÁCH cũ sang CUOC. Cột Trúng để trống để web dò lại. */
function migrateFromKhach() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var old = ss.getSheetByName(LEGACY_TAB);
  var sh = getSheet_();
  var last = old.getLastRow();
  if (last < 2) return;
  var vals = old.getRange(2, 1, last - 1, 6).getValues(); // Date, Player, Miền, Đài, Số, Tiền
  var out = [];
  var lastDate = '';
  vals.forEach(function (r) {
    if (!r[1] && !r[4]) return;
    if (r[0]) lastDate = r[0]; else r[0] = lastDate;
    out.push([r[0], r[1], r[2], String(r[3]), String(r[4]), r[5], '']);
  });
  if (!out.length) return;
  var start = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(start, 1, out.length, 7).setValues(out);
  SpreadsheetApp.getUi().alert('Đã chép ' + out.length + ' dòng. Cột Đài đang là SỐ LƯỢNG (kiểu cũ), web sẽ tự hiểu là N đài đầu của ngày đó; hãy kiểm tra lại các dòng có đài khác.');
}

function toDate_(s) {
  var m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : s;
}

/**
 * GET ?action=kq&mien=MN|MT|MB&date=dd/mm/yyyy
 *   -> proxy lấy HTML kết quả từ xosodaiphat.com (website không gọi thẳng được vì CORS)
 * GET ?action=ping
 */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'ping') return json_({ status: 'success', app: 'LUCKY QQ99', tab: TAB });

    if (p.action === 'kq') {
      var slug = { MN: 'xsmn', MT: 'xsmt', MB: 'xsmb' }[String(p.mien).toUpperCase()];
      var m = String(p.date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!slug || !m) return json_({ status: 'error', message: 'Tham số mien/date không hợp lệ' });
      var pad = function (n) { return ('0' + n).slice(-2); };
      var url = 'https://xosodaiphat.com/' + slug + '-' + pad(m[1]) + '-' + pad(m[2]) + '-' + m[3] + '.html';
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.getResponseCode() !== 200) return json_({ status: 'error', message: 'Nguồn trả HTTP ' + res.getResponseCode() });
      return json_({ status: 'success', url: url, html: res.getContentText() });
    }
    return json_({ status: 'error', message: 'action không hợp lệ' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  }
}

/**
 * POST (text/plain, JSON):
 *   {action:'add', rows:[{date,player,mien,dai,so,tien,trung}]}
 *   {action:'setTrung', items:[{rowId, trung}]}
 *   {action:'delete', rowId}
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    var sh = getSheet_();

    if (body.action === 'add') {
      var start = Math.max(sh.getLastRow(), 1) + 1;
      var rows = body.rows.map(function (r) {
        return [toDate_(r.date), r.player, r.mien, String(r.dai), String(r.so), Number(r.tien) || 0, String(r.trung || '')];
      });
      sh.getRange(start, 1, rows.length, 7).setValues(rows);
      return json_({ status: 'success', added: rows.length, firstRow: start });
    }

    if (body.action === 'setTrung') {
      body.items.forEach(function (it) {
        var rowId = Number(it.rowId);
        if (rowId < 2) throw new Error('rowId không hợp lệ: ' + it.rowId);
        sh.getRange(rowId, 7).setNumberFormat('@').setValue(String(it.trung));
      });
      return json_({ status: 'success', updated: body.items.length });
    }

    if (body.action === 'delete') {
      var id = Number(body.rowId);
      if (id < 2) throw new Error('rowId không hợp lệ');
      sh.deleteRow(id);
      return json_({ status: 'success', deleted: id });
    }

    return json_({ status: 'error', message: 'action không hợp lệ' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎰 LUCKY QQ99')
    .addItem('Tạo tab CUOC (7 cột)', 'setupCuoc')
    .addItem('Chép dữ liệu từ tab KHÁCH cũ', 'migrateFromKhach')
    .addToUi();
}
