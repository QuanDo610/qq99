/**
 * ====================================================================================
 * GOOGLE APPS SCRIPT - LUCKY QQ99 v3.1
 * Database chỉ lưu DỮ LIỆU NGUYÊN TỬ, mọi số tiền do website tự tính.
 *
 * TAB "CUOC" (8 cột chuẩn):
 *   A Ngày | B Khách | C Miền | D Đài | E Loại cược | F Số | G Điểm cược | H Trúng
 *
 *   Đài       : tên các đài đã chọn (VD: "TPHCM, Long An, Hậu Giang")
 *   Loại cược : "Bao Lô 2 số", "Bao Lô 3 số", "Bao Lô 4 số", "Đầu Đuôi", "Xỉu Chủ Đầu", "Xỉu Chủ Đuôi", "Xỉu Chủ Đầu Đuôi"
 *   Trúng     : rỗng = chưa dò | "-" = đã dò, trượt | "08x2 80" = số trúng
 * ====================================================================================
 */

var TAB = 'CUOC';
var LEGACY_TAB = 'KHÁCH';
var HEADERS = ['Ngày', 'Khách', 'Miền', 'Đài', 'Loại cược', 'Số', 'Điểm cược', 'Trúng'];
var LOAI_CUOC_LIST = [
  'Bao Lô 2 số',
  'Bao Lô 3 số',
  'Bao Lô 4 số',
  'Đầu Đuôi',
  'Xỉu Chủ Đầu',
  'Xỉu Chủ Đuôi',
  'Xỉu Chủ Đầu Đuôi'
];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB);
  if (!sh) throw new Error('Chưa có tab ' + TAB + '. Hãy chạy hàm setupCuoc() trước.');
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Tạo tab CUOC với 8 cột chuẩn, định dạng văn bản cho Đài/Loại cược/Số/Trúng */
function setupCuoc() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1e293b').setHorizontalAlignment('center');
  sh.setFrozenRows(1);

  var rows = 2000;
  sh.getRange(2, 1, rows, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, 4, rows, 3).setNumberFormat('@');          // Đài, Loại cược, Số = văn bản
  sh.getRange(2, 7, rows, 1).setNumberFormat('#,##0');      // Điểm cược
  sh.getRange(2, 8, rows, 1).setNumberFormat('@');          // Trúng = văn bản

  // Validation dropdown cho Miền và Loại cược
  sh.getRange(2, 3, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Nam', 'Trung', 'Bắc'], true).setAllowInvalid(false).build());
  sh.getRange(2, 5, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(LOAI_CUOC_LIST, true).setAllowInvalid(true).build());

  sh.setColumnWidth(1, 95);  // Ngày
  sh.setColumnWidth(2, 180); // Khách
  sh.setColumnWidth(3, 70);  // Miền
  sh.setColumnWidth(4, 250); // Đài
  sh.setColumnWidth(5, 140); // Loại cược
  sh.setColumnWidth(6, 220); // Số
  sh.setColumnWidth(7, 95);  // Điểm cược
  sh.setColumnWidth(8, 150); // Trúng

  SpreadsheetApp.getUi().alert('Đã thiết lập tab CUOC (8 cột: Ngày, Khách, Miền, Đài, Loại cược, Số, Điểm cược, Trúng).');
}

/** Chép dữ liệu từ tab KHÁCH cũ sang CUOC (mặc định loại cược là Bao Lô 2 số) */
function migrateFromKhach() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var old = ss.getSheetByName(LEGACY_TAB);
  if (!old) {
    SpreadsheetApp.getUi().alert('Không tìm thấy tab ' + LEGACY_TAB + ' để chép.');
    return;
  }
  var sh = getSheet_();
  var last = old.getLastRow();
  if (last < 2) return;
  var vals = old.getRange(2, 1, last - 1, 6).getValues(); // Date, Player, Miền, Đài, Số, Tiền
  var out = [];
  var lastDate = '';
  vals.forEach(function (r) {
    if (!r[1] && !r[4]) return;
    if (r[0]) lastDate = r[0]; else r[0] = lastDate;
    // Cột: Ngày, Khách, Miền, Đài, Loại cược, Số, Điểm cược, Trúng
    out.push([r[0], r[1], r[2], String(r[3]), 'Bao Lô 2 số', String(r[4]), r[5], '']);
  });
  if (!out.length) return;
  var start = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(start, 1, out.length, 8).setValues(out);
  SpreadsheetApp.getUi().alert('Đã chép ' + out.length + ' dòng sang tab CUOC với loại cược "Bao Lô 2 số".');
}

function toDate_(s) {
  var m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : s;
}

/**
 * GET ?action=kq&mien=MN|MT|MB&date=dd/mm/yyyy
 * GET ?action=ping
 */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'ping') return json_({ status: 'success', app: 'LUCKY QQ99', tab: TAB, version: '3.1' });

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
 *   {action:'add', rows:[{date,player,mien,dai,loaiCuoc,so,tien,trung}]}
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
        return [
          toDate_(r.date),
          r.player,
          r.mien,
          String(r.dai),
          String(r.loaiCuoc || 'Bao Lô 2 số'),
          String(r.so),
          Number(r.tien) || 0,
          String(r.trung || '')
        ];
      });
      sh.getRange(start, 1, rows.length, 8).setValues(rows);
      return json_({ status: 'success', added: rows.length, firstRow: start });
    }

    if (body.action === 'setTrung') {
      body.items.forEach(function (it) {
        var rowId = Number(it.rowId);
        if (rowId < 2) throw new Error('rowId không hợp lệ: ' + it.rowId);
        sh.getRange(rowId, 8).setNumberFormat('@').setValue(String(it.trung));
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
    .addItem('Tạo / Cập nhật tab CUOC (8 cột)', 'setupCuoc')
    .addItem('Chép dữ liệu từ tab KHÁCH cũ', 'migrateFromKhach')
    .addToUi();
}
