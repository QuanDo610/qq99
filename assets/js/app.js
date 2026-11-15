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
  selectedDate: 'ALL', // 'ALL' hoặc 'DD/MM/YYYY'
  viewMode: 'standard', // 'standard' | 'full' | 'privacy'
  mainTab: 'tickets', // 'tickets' | 'daily' | 'players'
  expandedRowIds: new Set(),
  formDai: new Set(),
  isLoading: false
};

// Khởi tạo khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
  initDateFilters();
  await loadDataFromSheetOrStorage();
  renderDashboard();
});

/**
 * 1. Khởi tạo bộ lọc ngày
 */
function initDateFilters() {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, '0');
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  const dateInput = document.getElementById('filterDate');
  if (dateInput) {
    dateInput.value = `${y}-${m}-${d}`;
    AppState.selectedDate = `${d}/${m}/${y}`;
  }
}

/**
 * 2. Tải dữ liệu từ Google Sheet (tab CUOC) hoặc LocalStorage dự phòng
 */
async function loadDataFromSheetOrStorage() {
  setLoadingState(true, 'Đang tải dữ liệu từ Google Sheet...');
  const syncIcon = document.getElementById('syncIcon');
  if (syncIcon) syncIcon.classList.add('animate-spin');

  try {
    const sheetRecords = await GoogleSheet.fetchSheetData();
    AppState.tickets = sheetRecords.map(r => Calculator.enrichTicket(r));
    AppState.expandedRowIds.clear();
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
  return { rowId: t.rowId, date: t.date, player: t.player, mien: t.mien, dai: t.dai, so: t.so, tien: t.tien, trung: t.trung };
}

function loadFromLocalStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem('LOCAL_SHEET_BACKUP_V3') || '[]');
    AppState.tickets = saved.map(r => Calculator.enrichTicket(r));
  } catch (e) {
    AppState.tickets = [];
  }
}

function saveToLocalStorage() {
  localStorage.setItem('LOCAL_SHEET_BACKUP_V3', JSON.stringify(AppState.tickets.map(rawOf)));
}

/** Các vé đang hiển thị theo bộ lọc ngày hiện tại */
function getFilteredTickets() {
  const filterInput = document.getElementById('filterDate');
  let selected = '';
  if (filterInput && filterInput.value) {
    const [y, m, d] = filterInput.value.split('-');
    selected = `${d}/${m}/${y}`;
  }
  const isViewAll = document.getElementById('chkViewAll')?.checked || false;
  return isViewAll ? AppState.tickets : AppState.tickets.filter(t => !selected || t.date === selected || !t.date);
}

/**
 * 3. Chuyển đổi Chế Độ Xem (View Mode)
 * - 'standard': Mặc định hiển thị quan hệ Khách Hàng và Lợi Nhuận của Bạn (Q). Ẩn Nguồn để gọn gàng.
 * - 'full': Hiển thị đủ 13 cột chuẩn hóa (bao gồm cả Nguồn thu & Thưởng Nguồn trả).
 * - 'privacy': Chế độ riêng tư (chỉ hiện dữ liệu Khách Hàng, ẩn toàn bộ Nguồn và Lợi Nhuận Q).
 */
function setViewMode(mode) {
  AppState.viewMode = mode;

  const btnStandard = document.getElementById('btnViewStandard');
  const btnFull = document.getElementById('btnViewFull');
  const btnPrivacy = document.getElementById('btnViewPrivacy');

  const activeClass = 'px-3 py-1.5 rounded-lg transition bg-white text-emerald-900 font-bold shadow-xs';
  const inactiveClass = 'px-3 py-1.5 rounded-lg transition text-slate-600 hover:text-slate-900';

  if (btnStandard) btnStandard.className = mode === 'standard' ? activeClass : inactiveClass;
  if (btnFull) btnFull.className = mode === 'full' ? activeClass : inactiveClass;
  if (btnPrivacy) btnPrivacy.className = mode === 'privacy' ? activeClass : inactiveClass;

  // Nếu chọn chế độ riêng tư, ẩn các thẻ Nguồn và Q trên Dashboard
  const cardNguonThu = document.getElementById('cardNguonThu');
  const cardQTrung = document.getElementById('cardQTrung');
  const cardQLoi = document.getElementById('cardQLoi');

  if (mode === 'privacy') {
    if (cardNguonThu) cardNguonThu.classList.add('hidden');
    if (cardQTrung) cardQTrung.classList.add('hidden');
    if (cardQLoi) cardQLoi.classList.add('hidden');
  } else {
    if (cardNguonThu) cardNguonThu.classList.remove('hidden');
    if (cardQTrung) cardQTrung.classList.remove('hidden');
    if (cardQLoi) cardQLoi.classList.remove('hidden');
  }

  renderDashboard();
}
window.setViewMode = setViewMode;

/**
 * 4. Bung / Thu gọn Chi Tiết 3 Bên (Khách <-> Tôi <-> Nguồn) của từng dòng
 */
function toggleRowDetail(realIndex) {
  if (AppState.expandedRowIds.has(realIndex)) {
    AppState.expandedRowIds.delete(realIndex);
  } else {
    AppState.expandedRowIds.add(realIndex);
  }
  renderDashboard();
}
window.toggleRowDetail = toggleRowDetail;

/**
 * 5. Bung / Thu gọn toàn bộ các dòng đang hiển thị
 */
function toggleAllDetails() {
  const filterInput = document.getElementById('filterDate');
  let selectedDateFormatted = 'ALL';
  if (filterInput && filterInput.value) {
    const [y, m, d] = filterInput.value.split('-');
    selectedDateFormatted = `${d}/${m}/${y}`;
  }
  const isViewAll = document.getElementById('chkViewAll')?.checked || false;
  const filteredTickets = isViewAll
    ? AppState.tickets
    : AppState.tickets.filter(t => !selectedDateFormatted || t.date === selectedDateFormatted || !t.date);

  const visibleIndices = filteredTickets.map(t => AppState.tickets.indexOf(t));
  if (visibleIndices.length === 0) return;

  const allAreExpanded = visibleIndices.every(idx => AppState.expandedRowIds.has(idx));
  if (allAreExpanded) {
    visibleIndices.forEach(idx => AppState.expandedRowIds.delete(idx));
    showToast('Thu gọn toàn bộ chi tiết');
  } else {
    visibleIndices.forEach(idx => AppState.expandedRowIds.add(idx));
    showToast(`Đã bung chi tiết ${visibleIndices.length} dòng`);
  }
  renderDashboard();
}
window.toggleAllDetails = toggleAllDetails;

/**
 * 6. Render Dashboard: Thống Kê & Bảng Dữ Liệu
 */
function renderDashboard() {
  const filterInput = document.getElementById('filterDate');
  let selectedDateFormatted = 'ALL';

  if (filterInput && filterInput.value) {
    const [y, m, d] = filterInput.value.split('-');
    selectedDateFormatted = `${d}/${m}/${y}`;
  }

  const isViewAll = document.getElementById('chkViewAll')?.checked || false;

  const filteredTickets = isViewAll
    ? AppState.tickets
    : AppState.tickets.filter(t => !selectedDateFormatted || t.date === selectedDateFormatted || !t.date);

  // 1. Tính toán số liệu thống kê tổng hợp
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
  document.getElementById('statThuKhach').innerText = Calculator.formatMoney(totalThuKhach);
  document.getElementById('statNguonThu').innerText = Calculator.formatMoney(totalNguonThu);
  document.getElementById('statKhachTrung').innerText = Calculator.formatMoney(totalKhachTrung);
  document.getElementById('statQTrung').innerText = Calculator.formatMoney(totalQTrung);

  const qLoiEl = document.getElementById('statQLoi');
  qLoiEl.innerText = (totalQLoi >= 0 ? '+' : '') + Calculator.formatMoney(totalQLoi);
  qLoiEl.className = totalQLoi >= 0 ? 'text-2xl sm:text-3xl font-black text-amber-400 font-mono-num' : 'text-2xl sm:text-3xl font-black text-rose-400 font-mono-num';

  // Hiển thị chi tiết hoa hồng
  const laiXac = totalThuKhach - totalNguonThu;
  const laiThuong = totalQTrung - totalKhachTrung;
  document.getElementById('statQLoiDetail').innerText = `Lãi xác: +${Calculator.formatMoney(laiXac)} • Thưởng x2: +${Calculator.formatMoney(laiThuong)}`;

  // Cập nhật số lượng trên các tab chính
  const distinctDates = [...new Set(AppState.tickets.map(t => t.date).filter(Boolean))];
  const distinctPlayers = [...new Set(AppState.tickets.map(t => t.player).filter(Boolean))];

  const elCountTickets = document.getElementById('tabCountTickets');
  if (elCountTickets) elCountTickets.innerText = filteredTickets.length;
  const elCountDaily = document.getElementById('tabCountDaily');
  if (elCountDaily) elCountDaily.innerText = distinctDates.length;
  const elCountPlayers = document.getElementById('tabCountPlayers');
  if (elCountPlayers) elCountPlayers.innerText = distinctPlayers.length;

  // Luôn cập nhật sẵn cả bảng Ngày và Khách Hàng
  renderDailySummary();
  renderPlayerSummary();

  // 2. Render Header bảng theo Chế Độ Xem (View Mode)
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  const emptyNotice = document.getElementById('emptyNotice');
  tbody.innerHTML = '';

  document.getElementById('recordCountBadge').innerText = filteredTickets.length + ' dòng cược';

  let colSpan = 11;
  if (AppState.viewMode === 'full') {
    colSpan = 14;
    thead.innerHTML = `
      <tr class="bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider">
        <th class="py-3 px-3">Ngày</th>
        <th class="py-3 px-3">Khách Hàng</th>
        <th class="py-3 px-2 text-center">Miền</th>
        <th class="py-3 px-2 text-center">Đài</th>
        <th class="py-3 px-3">Số Đánh</th>
        <th class="py-3 px-3 text-right">Điểm Cược</th>
        <th class="py-3 px-3 text-right bg-emerald-900/60 text-emerald-200">Tiền Xác Khách</th>
        <th class="py-3 px-3 text-right bg-indigo-900/60 text-indigo-200">Tiền Xác Nguồn</th>
        <th class="py-3 px-2 text-center bg-teal-900/60 text-teal-200">Nháy Trúng</th>
        <th class="py-3 px-3 text-right bg-orange-950/60 text-orange-200">Thưởng Trả Khách</th>
        <th class="py-3 px-3 text-right bg-amber-950/60 text-amber-200">Thưởng Nguồn Trả</th>
        <th class="py-3 px-3 text-right">Khách Lời / Lỗ</th>
        <th class="py-3 px-3 text-right bg-emerald-800 text-amber-300 font-black">Lợi Nhuận Q</th>
        <th class="py-3 px-3 text-center">Chi Tiết / Phơi</th>
      </tr>
    `;
  } else if (AppState.viewMode === 'privacy') {
    colSpan = 10;
    thead.innerHTML = `
      <tr class="bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider">
        <th class="py-3 px-3">Ngày</th>
        <th class="py-3 px-3">Khách Hàng</th>
        <th class="py-3 px-2 text-center">Miền / Đài</th>
        <th class="py-3 px-3">Số Đánh</th>
        <th class="py-3 px-3 text-right">Điểm Cược</th>
        <th class="py-3 px-3 text-right bg-emerald-900/60 text-emerald-200">Tiền Xác</th>
        <th class="py-3 px-2 text-center">Nháy Trúng</th>
        <th class="py-3 px-3 text-right text-orange-200">Tiền Trúng (x72)</th>
        <th class="py-3 px-3 text-right">Khách Lời / Lỗ</th>
        <th class="py-3 px-3 text-center">Gửi Khách</th>
      </tr>
    `;
  } else {
    // Mode 'standard' (Mặc định: Tập trung Khách & Lợi Nhuận của Tôi)
    colSpan = 11;
    thead.innerHTML = `
      <tr class="bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider">
        <th class="py-3 px-3">Ngày</th>
        <th class="py-3 px-3">Khách Hàng</th>
        <th class="py-3 px-2 text-center">Miền / Đài</th>
        <th class="py-3 px-3">Số Đánh</th>
        <th class="py-3 px-3 text-right">Điểm Cược</th>
        <th class="py-3 px-3 text-right bg-emerald-900/60 text-emerald-200">Tiền Xác Khách</th>
        <th class="py-3 px-2 text-center bg-teal-900/60 text-teal-200">Nháy Trúng</th>
        <th class="py-3 px-3 text-right bg-orange-950/60 text-orange-200">Thưởng Trả Khách</th>
        <th class="py-3 px-3 text-right">Khách Lời / Lỗ</th>
        <th class="py-3 px-3 text-right bg-emerald-800 text-amber-300 font-black">Lợi Nhuận Q</th>
        <th class="py-3 px-3 text-center">Chi Tiết / Phơi</th>
      </tr>
    `;
  }

  if (filteredTickets.length === 0) {
    emptyNotice.classList.remove('hidden');
    return;
  }
  emptyNotice.classList.add('hidden');

  // 3. Render từng dòng dữ liệu + Hàng bung chi tiết (Accordion Drill-Down)
  filteredTickets.forEach((t) => {
    const realIndex = AppState.tickets.indexOf(t);
    const isExpanded = AppState.expandedRowIds.has(realIndex);

    const tr = document.createElement('tr');
    tr.className = `cursor-pointer transition border-b border-slate-100 ${isExpanded ? 'bg-emerald-50/40 font-medium' : 'hover:bg-slate-50'}`;
    tr.title = 'Bấm để bung/thu gọn chi tiết đối soát 3 bên';
    tr.onclick = (e) => {
      // Tránh bung khi bấm nút điều khiển nháy hoặc nút sao chép
      if (e.target.closest('button')) return;
      toggleRowDetail(realIndex);
    };

    const numbersStr = t.so || '';
    const numNumbers = Calculator.parseNumbers(numbersStr).length || 1;
    const matches = Number(t.trungNLo) || 0;
    const pend = t.trungState === 'pending';

    const khachLoiNumber = Number(t.khachLoi) || 0;
    const khachLoiClass = khachLoiNumber > 0 ? 'text-emerald-700 font-black' : (khachLoiNumber < 0 ? 'text-rose-600 font-black' : 'text-slate-500');

    const ticketLaiXac = Number(t.thuKhach || 0) - Number(t.nguonThu || 0);
    const ticketLaiThuong = Number(t.qTrung || 0) - Number(t.khachTrung || 0);

    // Xây dựng các cột theo từng chế độ xem
    if (AppState.viewMode === 'full') {
      tr.innerHTML = `
        <td class="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">${t.date || '-'}</td>
        <td class="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
          <span class="inline-block transition-transform mr-1 text-[10px] ${isExpanded ? 'text-emerald-600 font-black' : 'text-slate-400'}">${isExpanded ? '▼' : '▶'}</span>
          ${t.player || 'Khách'}
        </td>
        <td class="py-3 px-2 text-center text-xs font-semibold whitespace-nowrap">
          <span class="px-2 py-0.5 rounded ${t.mien === 'Bắc' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">${t.mien}</span>
        </td>
        <td class="py-3 px-2 text-center text-xs font-bold text-slate-700 whitespace-nowrap" title="${t.dai}">${t.soDai} đài</td>
        <td class="py-3 px-3 font-mono font-bold text-slate-900 bg-slate-50 rounded">
          <span class="text-emerald-950 font-black">${numbersStr}</span>
        </td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-700 text-right whitespace-nowrap">${Calculator.formatMoney(t.tien)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-900 text-right bg-emerald-50/30 whitespace-nowrap">${Calculator.formatMoney(t.thuKhach)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-semibold text-indigo-900 text-right bg-indigo-50/30 whitespace-nowrap">${Calculator.formatMoney(t.nguonThu)}</td>
        <td class="py-2 px-2 text-center whitespace-nowrap">${nhayCell(t, realIndex)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-orange-600 text-right whitespace-nowrap">${Calculator.formatMoney(t.khachTrung)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-amber-700 text-right whitespace-nowrap">${Calculator.formatMoney(t.qTrung)}</td>
        <td class="py-3 px-3 font-mono-num text-xs text-right whitespace-nowrap ${khachLoiClass}">
          ${pend ? '—' : (khachLoiNumber > 0 ? '+' : '') + Calculator.formatMoney(t.khachLoi)}
        </td>
        <td class="py-3 px-3 font-mono-num text-sm font-black text-emerald-600 text-right bg-emerald-50/60 whitespace-nowrap">
          +${Calculator.formatMoney(t.qLoi)}
        </td>
        <td class="py-3 px-3 whitespace-nowrap text-center">
          <div class="flex items-center justify-center gap-1">
            <button type="button" onclick="copyCustomerMessage(${realIndex})" title="Sao chép gửi Khách Hàng (Tuyệt đối an toàn)" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-xs active:scale-95 transition">👤 Khách</button>
            <button type="button" onclick="copySourceMessage(${realIndex})" title="Sao chép nộp Chủ Nguồn" class="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs font-bold shadow-xs active:scale-95 transition">🏢 Nguồn</button>
          </div>
        </td>
      `;
    } else if (AppState.viewMode === 'privacy') {
      tr.innerHTML = `
        <td class="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">${t.date || '-'}</td>
        <td class="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
          <span class="inline-block transition-transform mr-1 text-[10px] ${isExpanded ? 'text-emerald-600 font-black' : 'text-slate-400'}">${isExpanded ? '▼' : '▶'}</span>
          ${t.player || 'Khách'}
        </td>
        <td class="py-3 px-2 text-center text-xs font-semibold whitespace-nowrap">
          <span class="px-2 py-0.5 rounded ${t.mien === 'Bắc' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">${t.mien} (${t.soDai} đài)</span>
        </td>
        <td class="py-3 px-3 font-mono font-bold text-slate-900 bg-slate-50 rounded">
          <span class="text-emerald-950 font-black">${numbersStr}</span>
        </td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-700 text-right whitespace-nowrap">${Calculator.formatMoney(t.tien)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-900 text-right bg-emerald-50/30 whitespace-nowrap">${Calculator.formatMoney(t.thuKhach)}</td>
        <td class="py-2 px-2 text-center whitespace-nowrap">${nhayCell(t, realIndex)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-orange-600 text-right whitespace-nowrap">${Calculator.formatMoney(t.khachTrung)}</td>
        <td class="py-3 px-3 font-mono-num text-xs text-right whitespace-nowrap ${khachLoiClass}">
          ${pend ? '—' : (khachLoiNumber > 0 ? '+' : '') + Calculator.formatMoney(t.khachLoi)}
        </td>
        <td class="py-3 px-3 whitespace-nowrap text-center">
          <button type="button" onclick="copyCustomerMessage(${realIndex})" title="Sao chép gửi Khách Hàng (Tuyệt đối an toàn)" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition">👤 Gửi Khách</button>
        </td>
      `;
    } else {
      // Standard Mode
      tr.innerHTML = `
        <td class="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">${t.date || '-'}</td>
        <td class="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
          <span class="inline-block transition-transform mr-1 text-[10px] ${isExpanded ? 'text-emerald-600 font-black' : 'text-slate-400'}">${isExpanded ? '▼' : '▶'}</span>
          ${t.player || 'Khách'}
        </td>
        <td class="py-3 px-2 text-center text-xs font-semibold whitespace-nowrap">
          <span class="px-2 py-0.5 rounded ${t.mien === 'Bắc' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">${t.mien} (${t.soDai} đài)</span>
        </td>
        <td class="py-3 px-3 font-mono font-bold text-slate-900 bg-slate-50/80 rounded">
          <span class="text-emerald-950 font-black">${numbersStr}</span>
        </td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-slate-700 text-right whitespace-nowrap">${Calculator.formatMoney(t.tien)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-emerald-900 text-right bg-emerald-50/40 whitespace-nowrap">${Calculator.formatMoney(t.thuKhach)}</td>
        <td class="py-2 px-2 text-center whitespace-nowrap">${nhayCell(t, realIndex)}</td>
        <td class="py-3 px-3 font-mono-num text-xs font-bold text-orange-600 text-right whitespace-nowrap">${Calculator.formatMoney(t.khachTrung)}</td>
        <td class="py-3 px-3 font-mono-num text-xs text-right whitespace-nowrap ${khachLoiClass}">
          ${pend ? '—' : (khachLoiNumber > 0 ? '+' : '') + Calculator.formatMoney(t.khachLoi)}
        </td>
        <td class="py-3 px-3 font-mono-num text-sm font-black text-emerald-700 text-right bg-emerald-50/70 whitespace-nowrap">
          +${Calculator.formatMoney(t.qLoi)}
        </td>
        <td class="py-3 px-3 whitespace-nowrap text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button type="button" onclick="toggleRowDetail(${realIndex})" title="Bung chi tiết đối soát 3 bên" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold border border-slate-200 shadow-2xs transition">
              ${isExpanded ? 'Thu Gọn' : '👁️ Chi Tiết'}
            </button>
            <button type="button" onclick="copyCustomerMessage(${realIndex})" title="Sao chép kết quả gửi Khách Hàng (Tuyệt đối an toàn)" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-xs active:scale-95 transition">
              👤 Gửi Khách
            </button>
          </div>
        </td>
      `;
    }

    tbody.appendChild(tr);

    // NẾU DÒNG ĐƯỢC CHỌN MỞ RỘNG (ACCORDION DRILL-DOWN 3 BÊN)
    if (isExpanded) {
      const detailTr = document.createElement('tr');
      detailTr.id = `detail-row-${realIndex}`;
      detailTr.className = 'detail-row-anim bg-slate-50/95 border-b-2 border-emerald-300';

      detailTr.innerHTML = `
        <td colspan="${colSpan}" class="p-3 sm:p-5">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            
            <!-- THẺ 1: KHÁCH HÀNG (QUAN HỆ: KHÁCH <-> BẠN) -->
            <div class="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs space-y-2.5">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span class="font-black text-emerald-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <span>👤</span> 1. Khách Hàng
                </span>
                <span class="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">${t.player}</span>
              </div>
              <div class="space-y-1.5 text-slate-600">
                <div class="flex justify-between">
                  <span>Đài (${t.soDai}):</span>
                  <span class="font-semibold text-slate-800 text-right">${t.dai}</span>
                </div>
                <div class="flex justify-between">
                  <span>Số đánh (${numNumbers} con):</span>
                  <span class="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">${numbersStr}</span>
                </div>
                <div class="flex justify-between">
                  <span>Điểm cược:</span>
                  <span class="font-mono font-bold text-slate-900">${Calculator.formatMoney(t.tien)} / con</span>
                </div>
                <div class="flex justify-between">
                  <span>Tiền xác thu khách:</span>
                  <span class="font-mono font-bold text-emerald-700">${Calculator.formatMoney(t.thuKhach)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Kết quả:</span>
                  <span class="font-bold ${pend ? 'text-amber-600' : (matches > 0 ? 'text-emerald-700' : 'text-slate-400')}">${pend ? '⏳ Chưa dò' : (matches > 0 ? `🎯 Trúng ${matches} nháy (${t.trung})` : 'Trượt')}</span>
                </div>
                <div class="flex justify-between">
                  <span>Thưởng trả khách (x72):</span>
                  <span class="font-mono font-bold text-orange-600">${Calculator.formatMoney(t.khachTrung)}</span>
                </div>
                <div class="flex justify-between pt-1 border-t border-slate-100 font-bold">
                  <span>Khách Lời / Lỗ:</span>
                  <span class="font-mono ${pend ? 'text-slate-400' : (khachLoiNumber > 0 ? 'text-emerald-700' : (khachLoiNumber < 0 ? 'text-rose-600' : 'text-slate-500'))}">
                    ${pend ? 'chờ kết quả' : (khachLoiNumber > 0 ? '+' : '') + Calculator.formatMoney(t.khachLoi)}
                  </span>
                </div>
              </div>
              <button type="button" onclick="copyCustomerMessage(${realIndex})" class="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs">
                <span>📋</span> Sao Chép Gửi Khách (Bảo Mật)
              </button>
            </div>

            <!-- THẺ 2: CHỦ NGUỒN (QUAN HỆ: BẠN <-> NGUỒN) -->
            ${AppState.viewMode === 'privacy' ? '' : `
            <div class="bg-white rounded-xl p-4 border border-indigo-200 shadow-xs space-y-2.5">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span class="font-black text-indigo-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <span>🏢</span> 2. Chủ Nguồn
                </span>
                <span class="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">Nội Bộ</span>
              </div>
              <div class="space-y-1.5 text-slate-600">
                <div class="flex justify-between">
                  <span>Quy tắc xác nộp:</span>
                  <span class="text-[11px] text-indigo-700 font-bold">76% (làm tròn bỏ lẻ nghìn)</span>
                </div>
                <div class="flex justify-between">
                  <span>Miền / Số đài:</span>
                  <span class="font-semibold text-slate-800">${t.mien} (${t.soDai} đài)</span>
                </div>
                <div class="flex justify-between">
                  <span>Tiền xác nộp nguồn:</span>
                  <span class="font-mono font-bold text-indigo-900">${Calculator.formatMoney(t.nguonThu)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Thưởng Nguồn trả bạn (x74):</span>
                  <span class="font-mono font-bold text-amber-600">${Calculator.formatMoney(t.qTrung)}</span>
                </div>
                <div class="flex justify-between pt-1 border-t border-slate-100 text-slate-500">
                  <span>Trạng thái phơi cược:</span>
                  <span class="font-semibold text-emerald-700">Đã khớp phơi</span>
                </div>
              </div>
              <button type="button" onclick="copySourceMessage(${realIndex})" class="w-full mt-2 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs">
                <span>📤</span> Sao Chép Phơi Nộp Nguồn
              </button>
            </div>

            <!-- THẺ 3: LỢI NHUẬN CỦA BẠN (Q) -->
            <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl p-4 border border-emerald-500/40 shadow-md space-y-2.5">
              <div class="flex items-center justify-between pb-2 border-b border-slate-700">
                <span class="font-black text-amber-300 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <span>🏆</span> 3. Lợi Nhuận Của Tôi (Q)
                </span>
                <span class="font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded text-[11px]">Lãi Ròng</span>
              </div>
              <div class="space-y-1.5 text-slate-300">
                <div class="flex justify-between">
                  <span>Lãi xác (Thu - Nộp):</span>
                  <span class="font-mono font-bold text-emerald-300">+${Calculator.formatMoney(ticketLaiXac)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Lãi thưởng (+2k/1k điểm trúng):</span>
                  <span class="font-mono font-bold text-amber-300">+${Calculator.formatMoney(ticketLaiThuong)}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-slate-700/80 font-black text-sm">
                  <span class="text-white">TỔNG LÃI BỎ TÚI:</span>
                  <span class="font-mono text-amber-400 text-base font-black">+${Calculator.formatMoney(t.qLoi)}</span>
                </div>
              </div>
              <div class="bg-white/10 rounded-lg p-2 text-[10px] text-emerald-200 mt-2 leading-relaxed">
                💡 Bạn ăn trọn <strong>chênh lệch xác</strong> (thu khách $14k/21k$ - nộp nguồn $76\%$) + <strong>chênh lệch trả thưởng</strong> ($x74 - x72 = 2k$/điểm).
              </div>
            </div>
            `}

          </div>
        </td>
      `;

      tbody.appendChild(detailTr);
    }
  });

  // Re-render KaTeX math nếu có biểu thức toán học
  if (typeof renderKatexMath === 'function') {
    renderKatexMath(tbody);
  }
}
window.renderDashboard = renderDashboard;

/**
 * Chuyển đổi tab chính của bảng:
 * - 'tickets': Danh sách vé cược chi tiết + Accordion
 * - 'daily': Bảng tổng kết lời / lỗ theo từng ngày
 * - 'players': Bảng đối soát theo từng khách hàng
 */
function switchMainTab(tab) {
  AppState.mainTab = tab;

  const btnTickets = document.getElementById('tabBtnTickets');
  const btnDaily = document.getElementById('tabBtnDaily');
  const btnPlayers = document.getElementById('tabBtnPlayers');

  const viewTickets = document.getElementById('viewTickets');
  const viewDaily = document.getElementById('viewDaily');
  const viewPlayers = document.getElementById('viewPlayers');
  const hint = document.getElementById('tabViewHint');

  const activeClass = 'px-3.5 py-2 rounded-xl transition bg-emerald-700 text-white shadow-xs flex items-center gap-1.5';
  const inactiveClass = 'px-3.5 py-2 rounded-xl transition text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5';

  if (btnTickets) btnTickets.className = tab === 'tickets' ? activeClass : inactiveClass;
  if (btnDaily) btnDaily.className = tab === 'daily' ? activeClass : inactiveClass;
  if (btnPlayers) btnPlayers.className = tab === 'players' ? activeClass : inactiveClass;

  if (viewTickets) viewTickets.classList.toggle('hidden', tab !== 'tickets');
  if (viewDaily) viewDaily.classList.toggle('hidden', tab !== 'daily');
  if (viewPlayers) viewPlayers.classList.toggle('hidden', tab !== 'players');

  if (hint) {
    if (tab === 'tickets') hint.innerText = '💡 Bấm vào từng dòng để xem ngăn đối soát 3 bên';
    else if (tab === 'daily') hint.innerText = '💡 Bấm "Xem Vé" ở cột cuối để lọc nhanh các vé của ngày đó';
    else hint.innerText = '💡 Tổng hợp doanh thu và lợi nhuận ròng mang lại từ từng khách hàng';
  }

  renderDashboard();
}
window.switchMainTab = switchMainTab;

/**
 * Render Bảng Tổng Kết Lời / Lỗ Theo Từng Ngày
 */
function renderDailySummary() {
  const tbody = document.getElementById('dailyTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const groups = {};
  AppState.tickets.forEach(t => {
    const d = t.date || 'Chưa có ngày';
    (groups[d] = groups[d] || []).push(t);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => {
    const da = Stations.parseDate(a);
    const db = Stations.parseDate(b);
    if (!da || !db) return 0;
    return db - da;
  });

  sortedDates.forEach(dateStr => {
    const list = groups[dateStr];
    let thuKhach = 0, nguonThu = 0, khachTrung = 0, qTrung = 0, qLoi = 0;
    list.forEach(t => {
      thuKhach += Number(t.thuKhach) || 0;
      nguonThu += Number(t.nguonThu) || 0;
      khachTrung += Number(t.khachTrung) || 0;
      qTrung += Number(t.qTrung) || 0;
      qLoi += Number(t.qLoi) || 0;
    });
    const laiXac = thuKhach - nguonThu;
    const laiThuong = qTrung - khachTrung;
    const khachLoi = khachTrung - thuKhach;
    const weekday = Stations.weekdayName(dateStr);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
    tr.innerHTML = `
      <td class="py-3 px-3 font-mono font-bold text-slate-900">${dateStr}</td>
      <td class="py-3 px-3 text-slate-600 font-sans font-medium text-xs">${weekday || '-'}</td>
      <td class="py-3 px-2 text-center font-bold text-slate-700">${list.length} vé</td>
      <td class="py-3 px-3 text-right bg-emerald-50/40 text-emerald-950 font-bold">${Calculator.formatMoney(thuKhach)}</td>
      <td class="py-3 px-3 text-right bg-indigo-50/40 text-indigo-900">${Calculator.formatMoney(nguonThu)}</td>
      <td class="py-3 px-3 text-right font-bold text-emerald-700">+${Calculator.formatMoney(laiXac)}</td>
      <td class="py-3 px-3 text-right text-orange-600 font-bold">${Calculator.formatMoney(khachTrung)}</td>
      <td class="py-3 px-3 text-right text-amber-700 font-bold">${Calculator.formatMoney(qTrung)}</td>
      <td class="py-3 px-3 text-right text-amber-700 font-bold">+${Calculator.formatMoney(laiThuong)}</td>
      <td class="py-3 px-3 text-right font-bold ${khachLoi > 0 ? 'text-emerald-700' : (khachLoi < 0 ? 'text-rose-600' : 'text-slate-500')}">
        ${khachLoi > 0 ? '+' : ''}${Calculator.formatMoney(khachLoi)}
      </td>
      <td class="py-3 px-3 text-right font-black text-emerald-600 bg-emerald-50/70 text-sm">
        +${Calculator.formatMoney(qLoi)}
      </td>
      <td class="py-3 px-2 text-center">
        <button type="button" onclick="filterByDateAndSwitch('${dateStr}')" title="Xem danh sách vé của ngày này" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-2xs transition">
          👁️ Xem
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterByDateAndSwitch(dateStr) {
  const d = Stations.parseDate(dateStr);
  if (d) {
    const input = document.getElementById('filterDate');
    const chk = document.getElementById('chkViewAll');
    if (chk) chk.checked = false;
    if (input) {
      input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  switchMainTab('tickets');
}
window.filterByDateAndSwitch = filterByDateAndSwitch;

/**
 * Render Bảng Đối Soát Theo Từng Khách Hàng
 */
function renderPlayerSummary() {
  const tbody = document.getElementById('playersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const groups = {};
  AppState.tickets.forEach(t => {
    const p = t.player || 'Khách';
    (groups[p] = groups[p] || []).push(t);
  });

  const sortedPlayers = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  sortedPlayers.forEach(player => {
    const list = groups[player];
    let thuKhach = 0, khachTrung = 0, qLoi = 0;
    list.forEach(t => {
      thuKhach += Number(t.thuKhach) || 0;
      khachTrung += Number(t.khachTrung) || 0;
      qLoi += Number(t.qLoi) || 0;
    });
    const khachLoi = khachTrung - thuKhach;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-slate-900">${player}</td>
      <td class="py-3 px-2 text-center font-bold text-slate-700">${list.length} vé</td>
      <td class="py-3 px-3 text-right bg-emerald-50/40 text-emerald-950 font-bold">${Calculator.formatMoney(thuKhach)}</td>
      <td class="py-3 px-3 text-right bg-orange-50/40 text-orange-600 font-bold">${Calculator.formatMoney(khachTrung)}</td>
      <td class="py-3 px-3 text-right font-bold ${khachLoi > 0 ? 'text-emerald-700' : (khachLoi < 0 ? 'text-rose-600' : 'text-slate-500')}">
        ${khachLoi > 0 ? '+' : ''}${Calculator.formatMoney(khachLoi)}
        <span class="block text-[10px] font-normal text-slate-400 font-sans">${khachLoi > 0 ? '(khách đang lời)' : (khachLoi < 0 ? '(khách đang lỗ)' : '(hòa tiền)')}</span>
      </td>
      <td class="py-3 px-3 text-right font-black text-emerald-600 bg-emerald-50/70 text-sm">
        +${Calculator.formatMoney(qLoi)}
      </td>
      <td class="py-3 px-2 text-center">
        <span class="text-xs text-slate-400 font-sans">${list.length} vé đã khớp</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

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

/** DÒ TỰ ĐỘNG: lấy kết quả xổ số theo ngày/miền/đài của từng vé chưa dò */
async function runAutoCheck() {
  const btn = document.getElementById('btnAutoCheck');
  const report = document.getElementById('checkReport');
  const visible = new Set(getFilteredTickets());
  const pendingCount = AppState.tickets.filter(t => t.trungState === 'pending' && visible.has(t)).length;
  if (!pendingCount) { showToast('Không có vé nào đang chờ dò trong danh sách hiện tại'); return; }

  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="inline-block animate-spin">⏳</span> Đang dò...'; }
  try {
    const { settled, waiting, errors } = await AutoChecker.autoCheck(AppState.tickets, t => visible.has(t));
    const r = await commitTrung(settled);

    const lines = [];
    lines.push(`<b>Đã dò ${settled.length}/${pendingCount} vé.</b>`);
    if (r.sheetError) lines.push(`⚠️ Chưa ghi được vào Sheet: ${r.sheetError}`);
    else if (settled.length && !GoogleSheet.canWrite()) lines.push('🔒 Chưa kết nối Apps Script nên kết quả dò chỉ lưu tạm trên web.');
    waiting.forEach(w => lines.push(`⏳ ${w.group}: ${w.reason}${w.count > 1 ? ` (${w.count} vé)` : ''}`));
    errors.forEach(e => lines.push(`❌ ${e}`));
    if (report) { report.innerHTML = lines.map(l => `<div>${l}</div>`).join(''); report.classList.remove('hidden'); }
    showToast(`🔎 Đã dò ${settled.length}/${pendingCount} vé` + (waiting.length || errors.length ? ' (xem chi tiết bên dưới)' : ''), settled.length ? 'success' : 'warning');
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
    const filterInput = document.getElementById('filterDate');
    if (filterInput && filterInput.value) {
      document.getElementById('inputDate').value = filterInput.value;
    } else {
      const n = new Date();
      document.getElementById('inputDate').value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }
    refreshDaiChips();
    document.getElementById('inputPlayer').focus();
  }
}
window.openAddModal = openAddModal;

function closeAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) modal.classList.add('hidden');
}
window.closeAddModal = closeAddModal;

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
  const rawSo = document.getElementById('inputSo').value;
  const numbers = Calculator.parseNumbers(rawSo);
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

  const { thuKhach, nguonThu, laiXac } = Calculator.calculateCosts(mien, Math.max(dai, 1), numbers.length, tien);
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
 * 7. Lưu vé mới (7 cột nguyên tử) vào Google Sheet
 */
async function saveNewTicket() {
  const player = document.getElementById('inputPlayer').value.trim();
  if (!player) { showToast('⚠️ Vui lòng nhập tên khách hàng!', 'warning'); return; }

  const numbers = Calculator.parseNumbers(document.getElementById('inputSo').value);
  if (numbers.length === 0) { showToast('⚠️ Vui lòng nhập ít nhất 1 con số đánh!', 'warning'); return; }

  const dai = selectedDai();
  if (dai.length === 0) { showToast('⚠️ Hãy chọn ít nhất 1 đài!', 'warning'); return; }

  const mien = document.getElementById('inputMien').value;
  const rawTicket = {
    date: formDateStr(),
    player,
    mien,
    dai: Stations.joinDai(dai),
    so: numbers.join(' '),
    tien: Number(document.getElementById('inputTien').value) || 1000,
    trung: ''
  };
  const newTicket = Calculator.enrichTicket(rawTicket);

  AppState.tickets.unshift(newTicket);
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
function openWinningNumbersModal() {
  const modal = document.getElementById('winningNumbersModal');
  if (modal) {
    modal.classList.remove('hidden');
    // Cập nhật text cho option ngày
    const filterInput = document.getElementById('filterDate');
    const scopeSelect = document.getElementById('winningScope');
    if (filterInput && filterInput.value && scopeSelect) {
      const [y, m, d] = filterInput.value.split('-');
      scopeSelect.options[0].text = `📅 Chỉ ngày ${d}/${m}/${y}`;
    }
    onWinningNumbersInput();
    document.getElementById('winningInput')?.focus();
  }
}
window.openWinningNumbersModal = openWinningNumbersModal;

function closeWinningNumbersModal() {
  const modal = document.getElementById('winningNumbersModal');
  if (modal) modal.classList.add('hidden');
}
window.closeWinningNumbersModal = closeWinningNumbersModal;

function onWinningNumbersInput() {
  const text = document.getElementById('winningInput')?.value || '';
  const freq = Calculator.parseWinningNumbers(text);
  const container = document.getElementById('winningPreviewChips');
  const countBadge = document.getElementById('winningCountBadge');
  if (!container) return;

  const entries = Object.entries(freq);
  if (countBadge) {
    let totalHits = entries.reduce((sum, [, cnt]) => sum + cnt, 0);
    countBadge.innerText = `${entries.length} số (${totalHits} nháy)`;
  }

  if (entries.length === 0) {
    container.innerHTML = `<span class="text-slate-400 italic text-[11px]">Chưa nhập số trúng...</span>`;
    return;
  }

  container.innerHTML = '';
  entries.forEach(([num, cnt]) => {
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-950 font-mono font-bold text-xs rounded-lg border border-amber-300';
    chip.innerHTML = `<span class="text-slate-900">${num}</span><span class="text-[10px] bg-amber-200 text-amber-900 px-1 rounded-sm">${cnt} nháy</span>`;
    container.appendChild(chip);
  });
}
window.onWinningNumbersInput = onWinningNumbersInput;

async function applyWinningNumbers() {
  const text = document.getElementById('winningInput')?.value || '';
  const winningMap = Calculator.parseWinningNumbers(text);
  if (Object.keys(winningMap).length === 0) {
    showToast('⚠️ Vui lòng nhập ít nhất 1 số trúng!', 'warning');
    return;
  }

  const scope = document.getElementById('winningScope')?.value || 'CURRENT';
  const region = document.getElementById('winningRegion')?.value || 'ALL';
  const visible = new Set(getFilteredTickets());

  const filter = (t) => {
    if (scope === 'CURRENT' && !visible.has(t)) return false;
    if (region !== 'ALL' && Stations.normMien(region) !== t.mien) return false;
    return true;
  };

  const list = AutoChecker.manualSettle(AppState.tickets, winningMap, filter);
  const r = await commitTrung(list);
  closeWinningNumbersModal();
  const wins = list.filter(x => x.trung !== '-').length;
  showToast(r.sheetError ? `⚠️ Dò ${list.length} vé (${wins} trúng) nhưng chưa ghi được Sheet: ${r.sheetError}` : `🎉 Dò xong ${list.length} vé! Có ${wins} vé trúng.`, r.sheetError ? 'warning' : 'success');
}
window.applyWinningNumbers = applyWinningNumbers;


/**
 * 10. SAO CHÉP TIN NHẮN CHO KHÁCH (TUYỆT ĐỐI KHÔNG DÍNH NGUỒN & Q LỜI)
 */
function copyCustomerMessage(idx) {
  const t = AppState.tickets[idx];
  if (!t) return;

  const matches = Number(t.trungNLo) || 0;
  const pend = t.trungState === 'pending';
  const statusStr = pend ? '⏳ CHƯA CÓ KẾT QUẢ' : (matches > 0 ? `🎉 TRÚNG ${matches} NHÁY` : '❌ CHƯA TRÚNG');
  const khachLoiNumber = Number(t.khachLoi) || 0;

  const msg = `🎰 LUCKY QQ99 - THÔNG BÁO VÉ CƯỢC\n----------------------------------\n• Ngày: ${t.date || 'Hôm nay'}\n• Khách hàng: ${t.player}\n• Miền: ${t.mien} - Đài: ${t.dai}\n• Số đánh: [ ${t.so} ]\n• Điểm cược: ${Calculator.formatMoney(t.tien)} / con\n• TIỀN XÁC: ${Calculator.formatMoney(t.thuKhach)}\n----------------------------------\n• KẾT QUẢ: ${statusStr}\n• TIỀN THƯỞNG: ${Calculator.formatMoney(t.khachTrung)}\n• QUÝ KHÁCH: ${pend ? 'chờ kết quả' : (khachLoiNumber >= 0 ? '+' : '') + Calculator.formatMoney(t.khachLoi)}\n----------------------------------\n(Nguồn tra cứu kết quả: xosodaiphat.com)`;

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

  const msg = `📤 LUCKY QQ99 - PHƠI CƯỢC (NỘP NGUỒN)\n----------------------------------\n• Ngày: ${t.date}\n• Miền: ${t.mien} - Đài: ${t.dai}\n• Số đánh: [ ${t.so} ] - ${Calculator.formatMoney(t.tien)}\n• XÁC NỘP NGUỒN (76%): ${Calculator.formatMoney(t.nguonThu)}\n• NGUỒN TRẢ (x74): ${Calculator.formatMoney(t.qTrung)}\n----------------------------------`;

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
    syncBtn.innerHTML = loading ? `<span class="inline-block animate-spin">⏳</span> ${text}` : `<span id="syncIcon">📥</span> Tải Dữ Liệu Sheet`;
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

window.addEventListener('load', () => {
  renderKatexMath();
});
