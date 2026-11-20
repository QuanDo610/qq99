/**
 * =========================================================
 * APP.JS - ỨNG DỤNG ĐIỀU HÀNH CHÍNH LUCKY QQ99
 * Tương thích 100% với Google Sheet 'KHÁCH' (1 Tab duy nhất)
 * Tự động tính toán các cột phi-nguyên tử (Derived columns)
 * =========================================================
 */

// Trạng thái ứng dụng
const AppState = {
  tickets: [],
  currentPage: 1,
  pageSize: 30, // Mặc định 30 dòng / trang
  currentDetailIndex: null,
  currentDetailTab: 'khach',
  formDai: new Set(),
  isLoading: false
};

/** Sắp xếp vé từ ngày mới nhất đến cũ nhất */
function sortTicketsByDateDesc(tickets) {
  return tickets.sort((a, b) => {
    const da = Stations.parseDate(a.date);
    const db = Stations.parseDate(b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db - da;
  });
}
window.sortTicketsByDateDesc = sortTicketsByDateDesc;

// Khởi tạo khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
  initDateFilters();
  await loadDataFromSheetOrStorage();
  renderDashboard();
});

/**
 * 1. Khởi tạo bộ lọc ngày (Mặc định chọn ngày hôm nay)
 */
function initDateFilters() {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, '0');
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  const todayStr = `${y}-${m}-${d}`;

  const fromInput = document.getElementById('filterDateFrom');
  const toInput = document.getElementById('filterDateTo');
  if (fromInput && !fromInput.value) fromInput.value = todayStr;
  if (toInput && !toInput.value) toInput.value = todayStr;
}

/** Chuyển đổi định dạng Date sang YYYY-MM-DD */
function formatDateIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Sự kiện khi thay đổi ngày Từ hoặc Đến */
function onDateRangeChange() {
  const chkAll = document.getElementById('chkViewAll');
  const fromInput = document.getElementById('filterDateFrom');
  const toInput = document.getElementById('filterDateTo');

  // Nếu người dùng chọn ngày thì bỏ tick "Tất cả"
  if (event && event.target !== chkAll && (fromInput?.value || toInput?.value)) {
    if (chkAll) chkAll.checked = false;
  }

  AppState.currentPage = 1;
  renderDashboard();
}
window.onDateRangeChange = onDateRangeChange;

/** Các nút chọn nhanh khoảng ngày */
function setDateRangeQuick(type) {
  const fromInput = document.getElementById('filterDateFrom');
  const toInput = document.getElementById('filterDateTo');
  const chkAll = document.getElementById('chkViewAll');
  const today = new Date();

  if (type === 'all') {
    if (chkAll) chkAll.checked = true;
  } else {
    if (chkAll) chkAll.checked = false;
    if (type === 'today') {
      const s = formatDateIso(today);
      if (fromInput) fromInput.value = s;
      if (toInput) toInput.value = s;
    } else if (type === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = formatDateIso(y);
      if (fromInput) fromInput.value = s;
      if (toInput) toInput.value = s;
    } else if (type === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      if (fromInput) fromInput.value = formatDateIso(past);
      if (toInput) toInput.value = formatDateIso(today);
    } else if (type === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      if (fromInput) fromInput.value = formatDateIso(start);
      if (toInput) toInput.value = formatDateIso(today);
    }
  }

  AppState.currentPage = 1;
  renderDashboard();
}
window.setDateRangeQuick = setDateRangeQuick;

/**
 * 2. Tải dữ liệu từ Google Sheet (tab CUOC) hoặc LocalStorage dự phòng
 */
async function loadDataFromSheetOrStorage() {
  setLoadingState(true, 'Đang tải dữ liệu từ Google Sheet...');
  const syncIcon = document.getElementById('syncIcon');
  if (syncIcon) syncIcon.classList.add('animate-spin');

  try {
    const sheetRecords = await GoogleSheet.fetchSheetData();
    AppState.tickets = sortTicketsByDateDesc(sheetRecords.map(r => Calculator.enrichTicket(r)));
    saveToLocalStorage();

    const syncBadge = document.getElementById('lastSyncBadge');
    if (syncBadge && GoogleSheet.lastSyncTime) {
      syncBadge.innerText = `Đồng bộ: ${GoogleSheet.lastSyncTime}`;
      syncBadge.className = 'hidden sm:inline-block text-[11px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-1 rounded-md border border-emerald-500/40 font-bold';
    }
    showToast(`✅ Đã tải ${sheetRecords.length} dòng từ tab ${GoogleSheet.mode === 'cuoc' ? 'CUOC' : 'KHÁCH (cũ)'}!`);
  } catch (err) {
    console.warn('[Sync Warning] Không tải được từ online, dùng dữ liệu đã lưu:', err.message);
    loadFromLocalStorage();
    showToast('⚠️ Không kết nối được Sheet - đang dùng dữ liệu lưu tạm trong máy', 'warning');
  } finally {
    if (syncIcon) syncIcon.classList.remove('animate-spin');
    setLoadingState(false);
    updateStatusBanner();
    renderDashboard();
  }
}
window.loadDataFromSheetOrStorage = loadDataFromSheetOrStorage;

/** Dải thông báo trạng thái kết nối (cho dễ hiểu app đang ghi/đọc ở đâu) */
function updateStatusBanner() {
  const el = document.getElementById('statusBanner');
  if (!el) return;
  const msgs = [];
  if (GoogleSheet.mode === 'legacy') {
    msgs.push('📄 Chưa có tab <b>CUOC</b> - đang đọc tạm tab <b>KHÁCH</b> cũ (cột Trúng sẽ để trống, hãy bấm <b>Dò Tự Động</b>). Chạy <code>setupCuoc()</code> + <code>migrateFromKhach()</code> trong Apps Script để chuyển sang tab mới.');
  }
  if (!GoogleSheet.canWrite()) {
    msgs.push('🔒 <b>Chế độ chỉ đọc</b>: chưa điền <code>webAppUrl</code> trong <code>assets/js/config.js</code> nên cược mới và kết quả dò <b>chưa được lưu vào Sheet</b> (tải lại sẽ mất).');
  }
  el.innerHTML = msgs.map(m => `<div>${m}</div>`).join('');
  el.classList.toggle('hidden', msgs.length === 0);
}
window.updateStatusBanner = updateStatusBanner;

/** Chỉ lưu dữ liệu nguyên tử vào localStorage (số tiền luôn tính lại) */
function rawOf(t) {
  return {
    rowId: t.rowId,
    date: t.date,
    player: t.player,
    mien: t.mien,
    dai: t.dai,
    loaiCuoc: t.loaiCuoc || 'Bao Lô 2 số',
    so: t.so,
    tien: t.tien,
    trung: t.trung
  };
}

function loadFromLocalStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem('LOCAL_SHEET_BACKUP_V3') || '[]');
    AppState.tickets = sortTicketsByDateDesc(saved.map(r => Calculator.enrichTicket(r)));
  } catch (e) {
    AppState.tickets = [];
  }
}

function saveToLocalStorage() {
  localStorage.setItem('LOCAL_SHEET_BACKUP_V3', JSON.stringify(AppState.tickets.map(rawOf)));
}

/** Các vé đang hiển thị theo bộ lọc ngày hiện tại (hỗ trợ khoảng từ ngày đến ngày) */
function getFilteredTickets() {
  const chkAll = document.getElementById('chkViewAll')?.checked;
  if (chkAll) {
    return sortTicketsByDateDesc([...AppState.tickets]);
  }

  const fromVal = document.getElementById('filterDateFrom')?.value;
  const toVal = document.getElementById('filterDateTo')?.value;

  if (!fromVal && !toVal) {
    return sortTicketsByDateDesc([...AppState.tickets]);
  }

  let fromDate = null;
  let toDate = null;

  if (fromVal) {
    const [y, m, d] = fromVal.split('-').map(Number);
    fromDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  if (toVal) {
    const [y, m, d] = toVal.split('-').map(Number);
    toDate = new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  const list = AppState.tickets.filter(t => {
    if (!t.date) return true;
    const tDate = Stations.parseDate(t.date);
    if (!tDate) return true;
    if (fromDate && tDate < fromDate) return false;
    if (toDate && tDate > toDate) return false;
    return true;
  });

  return sortTicketsByDateDesc([...list]);
}
window.getFilteredTickets = getFilteredTickets;

// Tương thích ngược (nếu có lời gọi cũ)
function setViewMode(mode) {
  renderDashboard();
}
window.setViewMode = setViewMode;

/**
 * 4. Mở Popup Modal Chi Tiết Cược & Đối Soát 3 Bên (Khách <-> Tôi <-> Nguồn)
 */
function openTicketDetailModal(realIndex) {
  const t = AppState.tickets[realIndex];
  if (!t) return;
  AppState.currentDetailIndex = realIndex;

  const modal = document.getElementById('ticketDetailModal');
  if (!modal) return;

  const numbersStr = t.so || '';
  const digitLen = Calculator.getDigitLength(t.loaiCuoc);
  const numNumbers = Calculator.parseNumbers(numbersStr, digitLen).length || 1;
  const matches = Number(t.trungNLo) || 0;
  const pend = t.trungState === 'pending';
  const khachLoiNumber = Number(t.khachLoi) || 0;
  const ticketLaiXac = Number(t.thuKhach || 0) - Number(t.nguonThu || 0);
  const ticketLaiThuong = Number(t.qTrung || 0) - Number(t.khachTrung || 0);

  // Subtitle
  const subEl = document.getElementById('detailModalSubtitle');
  if (subEl) {
    subEl.innerText = `${t.player || 'Khách'} • Ngày: ${t.date || '-'} • Miền ${t.mien} (${t.soDai} đài: ${t.dai})`;
  }

  // Quick summary pills
  const pPlayer = document.getElementById('detailQuickPlayer');
  if (pPlayer) pPlayer.innerText = t.player || 'Khách';
  const pMien = document.getElementById('detailQuickMien');
  if (pMien) pMien.innerText = `${t.mien} (${t.soDai} đài)`;
  const pLoai = document.getElementById('detailQuickLoai');
  if (pLoai) pLoai.innerText = t.loaiCuoc || 'Bao Lô 2 số';
  const pSo = document.getElementById('detailQuickSo');
  if (pSo) pSo.innerText = `${numbersStr} (${numNumbers} con)`;
  const pDiem = document.getElementById('detailQuickDiem');
  if (pDiem) pDiem.innerText = `${Calculator.formatMoney(t.tien)} / con`;

  const statusEl = document.getElementById('detailQuickStatus');
  if (statusEl) {
    if (pend) {
      statusEl.innerHTML = `<span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold">⏳ Chờ kết quả dò</span>`;
    } else if (matches > 0) {
      statusEl.innerHTML = `<span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">🎯 Trúng ${matches} nháy (${t.trung})</span>`;
    } else {
      statusEl.innerHTML = `<span class="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 border border-slate-300 font-semibold">❌ Không trúng (Trượt)</span>`;
    }
  }

  // Luôn hiển thị đầy đủ cả 3 khối Đối Soát 3 Bên (Khách <-> Tôi <-> Nguồn)
  const boxKhach = document.getElementById('boxDetailKhach');
  const boxNguon = document.getElementById('boxDetailNguon');
  const boxQLoi = document.getElementById('boxDetailQLoi');

  if (boxNguon) boxNguon.classList.remove('hidden');
  if (boxQLoi) boxQLoi.classList.remove('hidden');
  if (boxKhach) boxKhach.classList.remove('md:col-span-2');

  // 1. VỚI KHÁCH HÀNG (THU & CHUNG KHÁCH)
  const khachThuEl = document.getElementById('detailKhachThu');
  if (khachThuEl) khachThuEl.innerText = `+${Calculator.formatMoney(t.thuKhach)}`;
  const rateDesc = t.mien === 'Bắc' ? '1k cược = 21k xác' : `1k cược = ${14 * (Number(t.soDai) || 1)}k xác (${t.soDai} đài)`;
  const khachThuFormEl = document.getElementById('detailKhachThuFormula');
  if (khachThuFormEl) khachThuFormEl.innerText = `Cược ${Calculator.formatMoney(t.tien)} × ${numNumbers} con • ${rateDesc}`;

  const khachTrungEl = document.getElementById('detailKhachTrung');
  if (khachTrungEl) khachTrungEl.innerText = pend ? 'Chờ kết quả' : (matches > 0 ? `-${Calculator.formatMoney(t.khachTrung)}` : '0 đ');
  const winMultiplier = (t.loaiCuoc === 'Bao Lô 3 số' || t.loaiCuoc === 'Xỉu Chủ' || (t.loaiCuoc || '').includes('Xỉu')) ? 'x620' : ((t.loaiCuoc === 'Bao Lô 4 số') ? 'x5200' : 'x72');
  const khachTrungFormEl = document.getElementById('detailKhachTrungFormula');
  if (khachTrungFormEl) khachTrungFormEl.innerText = pend ? 'Chưa mở thưởng' : (matches > 0 ? `Trúng ${matches} nháy × ${winMultiplier}` : 'Vé không trúng');

  const khachLoiEl = document.getElementById('detailKhachLoi');
  if (khachLoiEl) {
    if (pend) {
      khachLoiEl.innerText = '⏳ Chờ dò';
      khachLoiEl.className = 'text-base font-bold text-slate-500 font-mono-num';
    } else if (khachLoiNumber > 0) {
      khachLoiEl.innerText = `+${Calculator.formatMoney(khachLoiNumber)} (Khách Lời)`;
      khachLoiEl.className = 'text-base font-black text-emerald-700 font-mono-num';
    } else if (khachLoiNumber < 0) {
      khachLoiEl.innerText = `${Calculator.formatMoney(khachLoiNumber)} (Khách Lỗ)`;
      khachLoiEl.className = 'text-base font-black text-rose-600 font-mono-num';
    } else {
      khachLoiEl.innerText = '0 đ (Hòa tiền)';
      khachLoiEl.className = 'text-base font-bold text-slate-600 font-mono-num';
    }
  }

  // 2. VỚI CHỦ NGUỒN (NỘP & THU CỦA NGUỒN)
  const nguonThuEl = document.getElementById('detailNguonThu');
  if (nguonThuEl) nguonThuEl.innerText = `-${Calculator.formatMoney(t.nguonThu)}`;
  const nguonThuFormEl = document.getElementById('detailNguonThuFormula');
  if (nguonThuFormEl) nguonThuFormEl.innerText = `76% làm tròn bỏ lẻ nghìn • Gốc: ${Calculator.formatMoney(t.thuKhach)}`;

  const qTrungEl = document.getElementById('detailQTrung');
  if (qTrungEl) qTrungEl.innerText = pend ? 'Chờ kết quả' : (matches > 0 ? `+${Calculator.formatMoney(t.qTrung)}` : '0 đ');
  const qTrungFormEl = document.getElementById('detailQTrungFormula');
  if (qTrungFormEl) qTrungFormEl.innerText = matches > 0 ? `Thưởng Nguồn trả bạn theo tỷ lệ ăn x74 (+2k/1k)` : 'Không có thưởng';

  const nguonBalanceEl = document.getElementById('detailNguonBalance');
  if (nguonBalanceEl) {
    if (pend) {
      nguonBalanceEl.innerText = `Nộp xác: ${Calculator.formatMoney(t.nguonThu)} (Chờ đối soát)`;
    } else {
      const netNguon = Number(t.qTrung || 0) - Number(t.nguonThu || 0);
      nguonBalanceEl.innerText = netNguon >= 0 ? `Nguồn chung cho bạn ròng: +${Calculator.formatMoney(netNguon)}` : `Bạn nộp cho nguồn ròng: ${Calculator.formatMoney(Math.abs(netNguon))}`;
    }
  }

  // 3. LỢI NHUẬN CỦA TÔI
  const laiXacEl = document.getElementById('detailLaiXac');
  if (laiXacEl) laiXacEl.innerText = `+${Calculator.formatMoney(ticketLaiXac)}`;
  const laiXacSubEl = document.getElementById('detailLaiXacSub');
  if (laiXacSubEl) laiXacSubEl.innerText = `Thu khách ${Calculator.formatMoney(t.thuKhach)} - Nộp nguồn ${Calculator.formatMoney(t.nguonThu)}`;

  const laiThuongEl = document.getElementById('detailLaiThuong');
  if (laiThuongEl) laiThuongEl.innerText = `+${Calculator.formatMoney(ticketLaiThuong)}`;
  const laiThuongSubEl = document.getElementById('detailLaiThuongSub');
  if (laiThuongSubEl) laiThuongSubEl.innerText = matches > 0 ? `Lãi +2k/điểm trúng (${matches} nháy × ${Calculator.formatMoney(t.tien)})` : '0 đ (vé chưa trúng)';

  const qLoiTotalEl = document.getElementById('detailQLoiTotal');
  if (qLoiTotalEl) qLoiTotalEl.innerText = `+${Calculator.formatMoney(t.qLoi)}`;

  modal.classList.remove('hidden');
  renderKatexMath(modal);
}
window.openTicketDetailModal = openTicketDetailModal;

function closeTicketDetailModal() {
  const modal = document.getElementById('ticketDetailModal');
  if (modal) modal.classList.add('hidden');
}
window.closeTicketDetailModal = closeTicketDetailModal;

function switchDetailTab(tab) {
  // Không cần chuyển tab - giao diện đã hiển thị song song trực quan
}
window.switchDetailTab = switchDetailTab;

function copyDetailCustomer() {
  if (AppState.currentDetailIndex !== null) {
    copyCustomerMessage(AppState.currentDetailIndex);
  }
}
window.copyDetailCustomer = copyDetailCustomer;

function copyDetailSource() {
  if (AppState.currentDetailIndex !== null) {
    copySourceMessage(AppState.currentDetailIndex);
  }
}
window.copyDetailSource = copyDetailSource;

// Tương thích ngược
function toggleRowDetail(realIndex) {
  openTicketDetailModal(realIndex);
}
window.toggleRowDetail = toggleRowDetail;

function toggleAllDetails() {
  // Không cần mở rộng accordion inline nữa
}
window.toggleAllDetails = toggleAllDetails;

/**
 * 6. Render Dashboard: Thống Kê & Bảng Dữ Liệu Phân Trang
 */
function renderDashboard() {
  const filteredTickets = getFilteredTickets();

  // 1. Tính toán số liệu thống kê tổng hợp (toàn bộ các vé trong khoảng lọc)
  let totalThuKhach = 0;
  let totalNguonThu = 0;
  let totalKhachTrung = 0;
  let totalQTrung = 0;
  let totalQLoi = 0;

  filteredTickets.forEach(t => {
    totalThuKhach += Number(t.thuKhach) || 0;
    totalNguonThu += Number(t.nguonThu) || 0;
    totalKhachTrung += Number(t.khachTrung) || 0;
    totalQTrung += Number(t.qTrung) || 0;
    totalQLoi += Number(t.qLoi) || 0;
  });

  // Cập nhật lên các Card Thống Kê
  const elThuKhach = document.getElementById('statThuKhach');
  if (elThuKhach) elThuKhach.innerText = Calculator.formatMoney(totalThuKhach);
  const elNguonThu = document.getElementById('statNguonThu');
  if (elNguonThu) elNguonThu.innerText = Calculator.formatMoney(totalNguonThu);
  const elKhachTrung = document.getElementById('statKhachTrung');
  if (elKhachTrung) elKhachTrung.innerText = Calculator.formatMoney(totalKhachTrung);
  const elQTrung = document.getElementById('statQTrung');
  if (elQTrung) elQTrung.innerText = Calculator.formatMoney(totalQTrung);

  const qLoiEl = document.getElementById('statQLoi');
  if (qLoiEl) {
    qLoiEl.innerText = (totalQLoi >= 0 ? '+' : '') + Calculator.formatMoney(totalQLoi);
    qLoiEl.className = totalQLoi >= 0 ? 'text-2xl sm:text-3xl font-black text-amber-300 font-mono-num' : 'text-2xl sm:text-3xl font-black text-rose-400 font-mono-num';
  }

  // Hiển thị chi tiết hoa hồng
  const laiXac = totalThuKhach - totalNguonThu;
  const laiThuong = totalQTrung - totalKhachTrung;
  const detailEl = document.getElementById('statQLoiDetail');
  if (detailEl) {
    detailEl.innerText = `Lãi xác: +${Calculator.formatMoney(laiXac)} • Thưởng x2: +${Calculator.formatMoney(laiThuong)}`;
  }

  // Cập nhật huy hiệu tổng số dòng cược
  const badgeEl = document.getElementById('recordCountBadge');
  if (badgeEl) badgeEl.innerText = filteredTickets.length + ' dòng cược';

  // 2. Render Header bảng theo phong cách Riêng Tư Khách (Gọn gàng, sạch sẽ, bảo mật)
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  const emptyNotice = document.getElementById('emptyNotice');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (thead) {
    thead.innerHTML = `
      <tr class="bg-slate-900 text-slate-100 font-bold text-xs uppercase tracking-wider">
        <th class="py-3 px-3">Ngày</th>
        <th class="py-3 px-3">Khách Hàng</th>
        <th class="py-3 px-2 text-center">Miền / Đài</th>
        <th class="py-3 px-2 text-center">Loại Cược</th>
        <th class="py-3 px-3">Số Đánh</th>
        <th class="py-3 px-3 text-right">Điểm</th>
        <th class="py-3 px-3 text-right">Tiền Xác</th>
        <th class="py-3 px-2 text-center">Kết Quả</th>
        <th class="py-3 px-3 text-right">Tiền Trúng</th>
        <th class="py-3 px-3 text-right">Khách Lời / Lỗ</th>
      </tr>
    `;
  }

  if (filteredTickets.length === 0) {
    if (emptyNotice) emptyNotice.classList.remove('hidden');
    renderPagination(0, 0, 0, 1);
    return;
  }
  if (emptyNotice) emptyNotice.classList.add('hidden');

  // 3. Phân trang dữ liệu
  const totalRows = filteredTickets.length;
  const pageSize = AppState.pageSize === 'all' ? totalRows : (Number(AppState.pageSize) || 30);
  const totalPages = Math.max(1, Math.ceil(totalRows / (pageSize || 1)));

  if (AppState.currentPage > totalPages) AppState.currentPage = totalPages;
  if (AppState.currentPage < 1) AppState.currentPage = 1;

  const startIdx = (AppState.currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);
  const pagedTickets = filteredTickets.slice(startIdx, endIdx);

  // 4. Render từng dòng vé trong trang hiện tại
  pagedTickets.forEach((t) => {
    const realIndex = AppState.tickets.indexOf(t);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-emerald-50/60 transition border-b border-slate-100 cursor-pointer';
    tr.title = 'Bấm vào để mở popup chi tiết đối soát 3 bên';
    tr.onclick = (e) => {
      // Tránh mở modal khi bấm thẳng vào nút sửa nháy con
      if (e.target.closest('button')) return;
      openTicketDetailModal(realIndex);
    };

    const numbersStr = t.so || '';
    const pend = t.trungState === 'pending';
    const khachLoiNumber = Number(t.khachLoi) || 0;
    const khachLoiClass = khachLoiNumber > 0 ? 'text-emerald-700 font-black' : (khachLoiNumber < 0 ? 'text-rose-600 font-black' : 'text-slate-500 font-bold');
    const loaiBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap">${t.loaiCuoc || 'Bao Lô 2 số'}</span>`;

    tr.innerHTML = `
      <td class="py-3 px-3 font-mono text-xs text-slate-700 whitespace-nowrap">${t.date || '-'}</td>
      <td class="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
        ${t.player || 'Khách'}
      </td>
      <td class="py-3 px-2 text-center text-xs font-semibold whitespace-nowrap">
        <span class="px-2 py-0.5 rounded ${t.mien === 'Bắc' ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'} font-bold">${t.mien} (${t.soDai} đài)</span>
      </td>
      <td class="py-3 px-2 text-center whitespace-nowrap">${loaiBadge}</td>
      <td class="py-3 px-3 font-mono font-bold text-slate-900">
        <span class="text-emerald-950 font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${numbersStr}</span>
      </td>
      <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-700 text-right whitespace-nowrap">${Calculator.formatMoney(t.tien)}</td>
      <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-900 text-right whitespace-nowrap">${Calculator.formatMoney(t.thuKhach)}</td>
      <td class="py-2 px-2 text-center whitespace-nowrap">${nhayCell(t, realIndex)}</td>
      <td class="py-3 px-3 font-mono-num text-xs font-bold text-orange-700 text-right whitespace-nowrap">${Calculator.formatMoney(t.khachTrung)}</td>
      <td class="py-3 px-3 font-mono-num text-xs text-right whitespace-nowrap ${khachLoiClass}">
        ${pend ? '—' : (khachLoiNumber > 0 ? '+' : '') + Calculator.formatMoney(t.khachLoi)}
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Cập nhật giao diện phân trang
  renderPagination(totalRows, startIdx, endIdx, totalPages);

  // Re-render KaTeX math nếu có biểu thức toán học
  if (typeof renderKatexMath === 'function') {
    renderKatexMath(tbody);
  }
}
window.renderDashboard = renderDashboard;

/**
 * 7. Phân Trang (Pagination)
 */
function renderPagination(totalRows, startIdx, endIdx, totalPages) {
  const infoEl = document.getElementById('paginationInfo');
  const indEl = document.getElementById('pageCurrentIndicator');
  const btnFirst = document.getElementById('btnPageFirst');
  const btnPrev = document.getElementById('btnPagePrev');
  const btnNext = document.getElementById('btnPageNext');
  const btnLast = document.getElementById('btnPageLast');
  const select = document.getElementById('pageSizeSelect');

  if (select) select.value = String(AppState.pageSize);

  if (infoEl) {
    if (totalRows === 0) {
      infoEl.innerText = '0 / 0 dòng cược';
    } else {
      infoEl.innerText = `Hiển thị ${startIdx + 1} - ${endIdx} / ${totalRows} dòng cược`;
    }
  }

  if (indEl) {
    indEl.innerText = `Trang ${AppState.currentPage} / ${totalPages}`;
  }

  const isFirst = AppState.currentPage <= 1;
  const isLast = AppState.currentPage >= totalPages;

  if (btnFirst) btnFirst.disabled = isFirst;
  if (btnPrev) btnPrev.disabled = isFirst;
  if (btnNext) btnNext.disabled = isLast;
  if (btnLast) btnLast.disabled = isLast;
}

function changePageSize(val) {
  AppState.pageSize = val === 'all' ? 'all' : (Number(val) || 30);
  AppState.currentPage = 1;
  renderDashboard();
}
window.changePageSize = changePageSize;

function goToPage(p) {
  const filtered = getFilteredTickets();
  const pageSize = AppState.pageSize === 'all' ? filtered.length : (Number(AppState.pageSize) || 30);
  const totalPages = Math.max(1, Math.ceil(filtered.length / (pageSize || 1)));

  if (p === 'last') p = totalPages;
  AppState.currentPage = Math.max(1, Math.min(totalPages, Number(p) || 1));
  renderDashboard();
}
window.goToPage = goToPage;

function prevPage() {
  if (AppState.currentPage > 1) {
    AppState.currentPage--;
    renderDashboard();
  }
}
window.prevPage = prevPage;

function nextPage() {
  const filtered = getFilteredTickets();
  const pageSize = AppState.pageSize === 'all' ? filtered.length : (Number(AppState.pageSize) || 30);
  const totalPages = Math.max(1, Math.ceil(filtered.length / (pageSize || 1)));
  if (AppState.currentPage < totalPages) {
    AppState.currentPage++;
    renderDashboard();
  }
}
window.nextPage = nextPage;



/**
 * Render Bảng Tổng Kết Lời / Lỗ Theo Từng Ngày
 */
function renderDailySummary() {}
window.filterByDateAndSwitch = function() {};

/**
 * Render Bảng Đối Soát Theo Từng Khách Hàng
 */
function renderPlayerSummary() {}

/**
 * 4. Tăng / Giảm số nháy trúng thưởng trực tiếp trên từng vé
 */
function nhayCell(t, idx) {
  const n = Number(t.trungNLo) || 0;
  const editBtn = `<button type="button" onclick="editTrung(${idx})" title="Sửa tay số trúng" class="ml-1 w-5 h-5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 text-[10px] align-middle">✎</button>`;
  if (t.trungState === 'pending') {
    return `<span class="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 whitespace-nowrap">⏳ Chưa dò</span>${editBtn}`;
  }
  const detail = t.trung === '-' ? 'trượt' : t.trung;
  return `<span class="inline-flex flex-col items-center align-middle leading-tight">
    <span class="font-mono font-black text-xs ${n > 0 ? 'text-emerald-700' : 'text-slate-400'}">${n} nháy</span>
    <span class="text-[10px] font-mono text-slate-500">${detail}</span>
  </span>${editBtn}`;
}
window.nhayCell = nhayCell;

/**
 * 4. Ghi kết quả dò (cột Trúng) cho nhiều vé: cập nhật bộ nhớ + Sheet + vẽ lại
 * @param {Array<{ticket, trung}>} list
 */
async function commitTrung(list) {
  if (!list.length) return { saved: 0, sheetError: null };
  list.forEach(({ ticket, trung }) => {
    Object.assign(ticket, Calculator.enrichTicket({ ...rawOf(ticket), trung }));
  });
  saveToLocalStorage();
  renderDashboard();

  let sheetError = null;
  if (GoogleSheet.canWrite()) {
    const items = list.filter(x => x.ticket.rowId).map(x => ({ rowId: x.ticket.rowId, trung: x.trung }));
    try { await GoogleSheet.setTrung(items); } catch (e) { sheetError = e.message; }
  }
  return { saved: list.length, sheetError };
}

/** Sửa tay cột Trúng của 1 vé (VD: 08x2 80 | - | để trống = chưa dò) */
async function editTrung(realIndex) {
  const t = AppState.tickets[realIndex];
  if (!t) return;
  const input = window.prompt(
    `[${t.player}] ${t.date} - số: ${t.so}\n\nNhập các số TRÚNG (08x2 80 hoặc 19.3 hoặc 19 19 19)\n"-" = đã dò, trượt\nđể trống = chưa dò`,
    t.trung
  );
  if (input === null) return;
  const clean = input.trim();
  const trung = clean === '' ? '' : (clean === '-' ? '-' : Results.hitsToTrung(Calculator.parseWinningNumbers(clean)));
  const r = await commitTrung([{ ticket: t, trung }]);
  showToast(r.sheetError ? `⚠️ Đã cập nhật trên web nhưng chưa ghi được Sheet: ${r.sheetError}` : '✅ Đã cập nhật số trúng', r.sheetError ? 'warning' : 'success');
}
window.editTrung = editTrung;

/** DÒ TỰ ĐỘNG: lấy kết quả xổ số cho các vé đang chờ dò trong phạm vi ngày đang lọc */
async function runAutoCheck() {
  const btn = document.getElementById('btnAutoCheck');
  const report = document.getElementById('checkReport');

  const filteredTickets = getFilteredTickets();
  const targetPending = filteredTickets.filter(t => t.trungState === 'pending');

  if (!targetPending.length) {
    showToast('Không có vé nào đang chờ dò trong danh sách đang lọc', 'warning');
    return;
  }

  const distinctDates = [...new Set(targetPending.map(t => t.date))].join(', ');

  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="inline-block animate-spin">⏳</span> Đang dò ${targetPending.length} vé...`; }
  try {
    const { settled, waiting, errors } = await AutoChecker.autoCheck(AppState.tickets, t => targetPending.includes(t));
    const r = await commitTrung(settled);

    const lines = [];
    lines.push(`<b>Đã dò xong ${settled.length}/${targetPending.length} vé (${distinctDates}).</b>`);
    if (r.sheetError) lines.push(`⚠️ Chưa ghi được vào Sheet: ${r.sheetError}`);
    else if (settled.length && !GoogleSheet.canWrite()) lines.push('🔒 Chưa kết nối Apps Script nên kết quả dò chỉ lưu tạm trên web.');
    waiting.forEach(w => lines.push(`⏳ ${w.group}: ${w.reason}${w.count > 1 ? ` (${w.count} vé)` : ''}`));
    errors.forEach(e => lines.push(`❌ ${e}`));
    if (report) { report.innerHTML = lines.map(l => `<div>${l}</div>`).join(''); report.classList.remove('hidden'); }
    showToast(`🔎 Đã dò: ${settled.length}/${targetPending.length} vé` + (waiting.length || errors.length ? ' (xem chi tiết)' : ''), settled.length ? 'success' : 'warning');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>🔎</span> Dò Tự Động'; }
  }
}
window.runAutoCheck = runAutoCheck;

/**
 * 5. Mở / Đóng Modal Thêm Số Mới
 */
function openAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) {
    modal.classList.remove('hidden');
    const fromInput = document.getElementById('filterDateFrom');
    const toInput = document.getElementById('filterDateTo');
    const targetDate = toInput?.value || fromInput?.value;
    if (targetDate) {
      document.getElementById('inputDate').value = targetDate;
    } else {
      const n = new Date();
      document.getElementById('inputDate').value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }
    refreshDaiChips();
    onInputLoaiCuocChange();
    document.getElementById('inputPlayer').focus();
  }
}
window.openAddModal = openAddModal;

function closeAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) modal.classList.add('hidden');
}
window.closeAddModal = closeAddModal;

function onInputLoaiCuocChange() {
  const loai = document.getElementById('inputLoaiCuoc')?.value || 'Bao Lô 2 số';
  const digitLen = Calculator.getDigitLength(loai);
  const inputSo = document.getElementById('inputSo');
  if (inputSo) {
    if (digitLen === 4) {
      inputSo.placeholder = 'Ví dụ: 1234 5678 (mỗi số 4 chữ số, cách nhau khoảng trắng)';
    } else if (digitLen === 3) {
      inputSo.placeholder = 'Ví dụ: 123 456 789 (mỗi số 3 chữ số, cách nhau khoảng trắng)';
    } else {
      inputSo.placeholder = 'Ví dụ: 08 80 09 90 hoặc 15-51 (2 chữ số, cách nhau khoảng trắng)';
    }
  }
  updateModalPreview();
}
window.onInputLoaiCuocChange = onInputLoaiCuocChange;

/** Ngày đang chọn trong form dạng dd/mm/yyyy */
function formDateStr() {
  const v = document.getElementById('inputDate').value;
  if (!v) return '';
  const [y, m, d] = v.split('-');
  return `${d}/${m}/${y}`;
}

/** Vẽ lại các chip đài theo miền + thứ trong tuần của ngày đã chọn (mặc định chọn hết) */
function refreshDaiChips() {
  const mien = document.getElementById('inputMien').value;
  const date = formDateStr();
  const list = Stations.forDay(mien, date);
  AppState.formDai = new Set(list);

  const label = document.getElementById('inputDaiLabel');
  if (label) label.innerText = date ? `${Stations.weekdayName(date)} • ${list.length} đài xổ` : '';

  const box = document.getElementById('inputDaiChips');
  box.innerHTML = '';
  list.forEach(name => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.name = name;
    b.onclick = () => toggleDai(name);
    b.disabled = mien === 'Bắc';
    box.appendChild(b);
  });
  paintDaiChips();
  updateModalPreview();
}
window.refreshDaiChips = refreshDaiChips;

function toggleDai(name) {
  if (AppState.formDai.has(name)) AppState.formDai.delete(name); else AppState.formDai.add(name);
  paintDaiChips();
  updateModalPreview();
}
window.toggleDai = toggleDai;

function paintDaiChips() {
  document.querySelectorAll('#inputDaiChips button').forEach(b => {
    const on = AppState.formDai.has(b.dataset.name);
    b.className = 'px-3 py-1.5 rounded-lg text-xs font-bold border transition ' +
      (on ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-400 border-slate-300 line-through');
    b.innerText = (on ? '✓ ' : '') + b.dataset.name;
  });
}

/** Danh sách đài đã chọn, giữ đúng thứ tự lịch xổ */
function selectedDai() {
  return Stations.forDay(document.getElementById('inputMien').value, formDateStr()).filter(n => AppState.formDai.has(n));
}

/**
 * 6. Tính toán xem trước trong Form
 */
function updateModalPreview() {
  const mien = document.getElementById('inputMien').value;
  const dai = selectedDai().length || 0;
  const loaiCuoc = document.getElementById('inputLoaiCuoc')?.value || 'Bao Lô 2 số';
  const digitLen = Calculator.getDigitLength(loaiCuoc);
  const rawSo = document.getElementById('inputSo').value;
  const numbers = Calculator.parseNumbers(rawSo, digitLen);
  const tien = Number(document.getElementById('inputTien').value) || 1000;

  const tagsContainer = document.getElementById('inputSoTags');
  tagsContainer.innerHTML = '';
  numbers.forEach(n => {
    const span = document.createElement('span');
    span.className = 'px-2 py-0.5 bg-slate-100 text-slate-800 font-mono text-xs rounded border border-slate-300 font-bold';
    span.innerText = n;
    tagsContainer.appendChild(span);
  });
  document.getElementById('inputSoCount').innerText = numbers.length + ' con';

  const { thuKhach, nguonThu, laiXac } = Calculator.calculateCosts(mien, Math.max(dai, 1), numbers.length, tien, loaiCuoc);
  const empty = dai === 0 || numbers.length === 0;
  document.getElementById('previewThuKhach').innerText = Calculator.formatMoney(empty ? 0 : thuKhach);
  document.getElementById('previewNguonThu').innerText = Calculator.formatMoney(empty ? 0 : nguonThu);
  document.getElementById('previewLaiXac').innerText = '+' + Calculator.formatMoney(empty ? 0 : laiXac);
}
window.updateModalPreview = updateModalPreview;

function setModalTien(val) {
  document.getElementById('inputTien').value = val;
  updateModalPreview();
}
window.setModalTien = setModalTien;

function onInputMienChange() { refreshDaiChips(); }
window.onInputMienChange = onInputMienChange;

/**
 * 7. Lưu vé mới (8 cột nguyên tử) vào Google Sheet
 */
async function saveNewTicket() {
  const player = document.getElementById('inputPlayer').value.trim();
  if (!player) { showToast('⚠️ Vui lòng nhập tên khách hàng!', 'warning'); return; }

  const loaiCuoc = document.getElementById('inputLoaiCuoc')?.value || 'Bao Lô 2 số';
  const digitLen = Calculator.getDigitLength(loaiCuoc);
  const numbers = Calculator.parseNumbers(document.getElementById('inputSo').value, digitLen);
  if (numbers.length === 0) { showToast('⚠️ Vui lòng nhập ít nhất 1 con số đánh!', 'warning'); return; }

  const dai = selectedDai();
  if (dai.length === 0) { showToast('⚠️ Hãy chọn ít nhất 1 đài!', 'warning'); return; }

  const mien = document.getElementById('inputMien').value;
  const rawTicket = {
    date: formDateStr(),
    player,
    mien,
    dai: Stations.joinDai(dai),
    loaiCuoc,
    so: numbers.join(' '),
    tien: Number(document.getElementById('inputTien').value) || 1000,
    trung: ''
  };
  const newTicket = Calculator.enrichTicket(rawTicket);

  AppState.tickets.unshift(newTicket);
  sortTicketsByDateDesc(AppState.tickets);
  saveToLocalStorage();
  renderDashboard();
  closeAddModal();
  document.getElementById('inputSo').value = '';
  updateModalPreview();

  if (!GoogleSheet.canWrite()) {
    showToast(`⚠️ Đã thêm vé của [${player}] nhưng CHƯA lưu Sheet (chưa điền webAppUrl)`, 'warning');
    return;
  }
  try {
    await GoogleSheet.addRow(newTicket);
    showToast(`🎉 Đã lưu vé của [${player}] vào Sheet!`);
    await loadDataFromSheetOrStorage(); // lấy lại để có số dòng (rowId)
  } catch (e) {
    showToast(`⚠️ Chưa ghi được Sheet: ${e.message}`, 'warning');
  }
}
window.saveNewTicket = saveNewTicket;

/**
 * 8. MODAL NHẬP SỐ TRÚNG THƯỞNG LINH HOẠT (19.3, 19x3, 19 19 19...)
 */
// Chức năng nhập số trúng tay đã được gỡ bỏ


/**
 * 10. SAO CHÉP TIN NHẮN CHO KHÁCH (TUYỆT ĐỐI KHÔNG DÍNH NGUỒN & LỢI NHUẬN)
 */
function copyCustomerMessage(idx) {
  const t = AppState.tickets[idx];
  if (!t) return;

  const matches = Number(t.trungNLo) || 0;
  const pend = t.trungState === 'pending';
  const statusStr = pend ? '⏳ CHƯA CÓ KẾT QUẢ' : (matches > 0 ? `🎉 TRÚNG ${matches} NHÁY` : '❌ CHƯA TRÚNG');
  const khachLoiNumber = Number(t.khachLoi) || 0;

  const msg = `🎰 LUCKY QQ99 - THÔNG BÁO VÉ CƯỢC\n----------------------------------\n• Ngày: ${t.date || 'Hôm nay'}\n• Khách hàng: ${t.player}\n• Miền: ${t.mien} - Đài: ${t.dai}\n• Loại cược: ${t.loaiCuoc || 'Bao Lô 2 số'}\n• Số đánh: [ ${t.so} ]\n• Điểm cược: ${Calculator.formatMoney(t.tien)} / con\n• TIỀN XÁC: ${Calculator.formatMoney(t.thuKhach)}\n----------------------------------\n• KẾT QUẢ: ${statusStr}\n• TIỀN THƯỞNG: ${Calculator.formatMoney(t.khachTrung)}\n• QUÝ KHÁCH: ${pend ? 'chờ kết quả' : (khachLoiNumber >= 0 ? '+' : '') + Calculator.formatMoney(t.khachLoi)}\n----------------------------------\n(Nguồn tra cứu kết quả: xosodaiphat.com)`;

  navigator.clipboard.writeText(msg).then(() => {
    showToast('✅ Đã copy tin nhắn gửi KHÁCH HÀNG (Tuyệt đối an toàn)!');
  });
}
window.copyCustomerMessage = copyCustomerMessage;

/**
 * 11. SAO CHÉP PHƠI CƯỢC NỘP NGUỒN
 */
function copySourceMessage(idx) {
  const t = AppState.tickets[idx];
  if (!t) return;

  const msg = `📤 LUCKY QQ99 - PHƠI CƯỢC (NỘP NGUỒN)\n----------------------------------\n• Ngày: ${t.date}\n• Miền: ${t.mien} - Đài: ${t.dai}\n• Loại cược: ${t.loaiCuoc || 'Bao Lô 2 số'}\n• Số đánh: [ ${t.so} ] - ${Calculator.formatMoney(t.tien)}\n• XÁC NỘP NGUỒN (76%): ${Calculator.formatMoney(t.nguonThu)}\n• NGUỒN TRẢ: ${Calculator.formatMoney(t.qTrung)}\n----------------------------------`;

  navigator.clipboard.writeText(msg).then(() => {
    showToast('✅ Đã copy phơi nộp CHỦ NGUỒN!');
  });
}
window.copySourceMessage = copySourceMessage;

/**
 * 12. Mở / Đóng Modal Luật Chơi
 */
function openRulesModal() {
  const modal = document.getElementById('rulesModal');
  if (modal) {
    modal.classList.remove('hidden');
    renderKatexMath(modal);
  }
}
window.openRulesModal = openRulesModal;

function closeRulesModal() {
  const modal = document.getElementById('rulesModal');
  if (modal) modal.classList.add('hidden');
}
window.closeRulesModal = closeRulesModal;

/**
 * Toast Thông Báo
 */
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  toastMsg.innerText = msg;
  toastIcon.innerText = type === 'warning' ? '⚠️' : '✅';
  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');

  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 2800);
}
window.showToast = showToast;

function setLoadingState(loading, text = '') {
  AppState.isLoading = loading;
  const syncBtn = document.getElementById('btnSyncSheet');
  if (syncBtn) {
    syncBtn.innerHTML = loading ? `<span class="inline-block animate-spin">⏳</span> ${text}` : `<span id="syncIcon">🔄</span> Tải Lại Sheet`;
    syncBtn.disabled = loading;
  }
}
window.setLoadingState = setLoadingState;

/**
 * Render công thức Toán KaTeX (Tuân thủ .agents/rules/html_math_rules.md)
 */
function renderKatexMath(element = document.body) {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }
}
window.renderKatexMath = renderKatexMath;

document.addEventListener('DOMContentLoaded', () => {
  renderKatexMath();
});

// Đóng các modal khi bấm phím Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeTicketDetailModal();
    closeAddModal();
    closeWinningNumbersModal();
    closeRulesModal();
  }
});

window.addEventListener('load', () => {
  renderKatexMath();
});
