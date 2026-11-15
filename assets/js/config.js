/**
 * =========================================================
 * CONFIG.JS - CẤU HÌNH DUY NHẤT CỦA LUCKY QQ99
 * Sửa tại đây, không phải sửa trong các file js khác.
 * =========================================================
 */
window.LUCKY_CONFIG = {
  // Google Sheet làm database
  sheetId: '1WfZPzYlBQLvyO6Anrir7mQ5rlQmgQVFQamrWAu0VumY',

  // Tab mới (chỉ 7 cột): Ngày | Khách | Miền | Đài | Số | Điểm cược | Trúng
  sheetTab: 'CUOC',

  // Tab cũ (chỉ dùng để đọc tạm khi chưa tạo tab CUOC)
  legacyTab: 'KHÁCH',

  // URL Web App của Apps Script (backend/google_apps_script.js sau khi Deploy).
  // Dùng để: ghi cược/kết quả vào Sheet + lấy HTML kết quả xổ số (proxy).
  // Dạng: https://script.google.com/macros/s/XXXX/exec
  webAppUrl: 'https://script.google.com/macros/s/AKfycbyTZ77qbp1BXDTB3TcIC3hnJIGbppIt-T99MmEEcrizX9SiMVzDNx8_9NvatuWsRna9/exec'
};
