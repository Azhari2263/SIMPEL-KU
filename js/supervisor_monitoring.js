/**
 * ========================================================================
 * SIMPEL-KU - INTEGRATED MONITORING CONTROLLER (SUPERVISOR / ADMIN)
 * ========================================================================
 */

async function loadIntegratedMonitoringData(forceRefresh = false) {
      const unit = document.getElementById('adminFilterUnit')?.value || 'SEMUA';
      const pegawai = document.getElementById('adminFilterPegawai')?.value || 'SEMUA';
      const ruangan = document.getElementById('adminFilterRuangan')?.value || 'SEMUA';
      const status = document.getElementById('adminFilterStatus')?.value || 'SEMUA';
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      const cacheKey = `${bulan}_${tahun}_${unit}_${pegawai}_${ruangan}_${status}`;

      if (!forceRefresh && window._managerDataCache.monitoring[cacheKey]) {
        cachedIntegratedMonitoringData = window._managerDataCache.monitoring[cacheKey];
        populateAdminFilterDropdowns(cachedIntegratedMonitoringData);
        renderAdminPeriodSubNav();
        renderIntegratedMonitoringUI();
        return;
      }

      showLoader(true);
      try {
        const res = await callBackend('getIntegratedMonitoringData', {
          token: sessionToken,
          bulan,
          tahun,
          filterUnit: unit,
          filterPegawai: pegawai,
          filterRuangan: ruangan,
          filterStatus: status
        });
        showLoader(false);
        if (res && res.success) {
          window._managerDataCache.monitoring[cacheKey] = res.data;
          cachedIntegratedMonitoringData = res.data;
          populateAdminFilterDropdowns(res.data);
          renderAdminPeriodSubNav();
          renderIntegratedMonitoringUI();
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast('Gagal memuat data monitoring terpadu: ' + err.message, 'error');
      }
    }

function populateAdminFilterDropdowns(data) {
  if (!data) return;
  const unitSelect = document.getElementById('adminFilterUnit');
  const pegSelect = document.getElementById('adminFilterPegawai');

  if (pegSelect && data.daftarPegawai) {
    const cur = pegSelect.value;
    const currentUnit = unitSelect?.value || 'SEMUA';
    let filteredPeg = data.daftarPegawai;
    if (currentUnit !== 'SEMUA') {
      filteredPeg = filteredPeg.filter(p => p.unit === currentUnit);
    }

    pegSelect.innerHTML = '<option value="SEMUA">Semua Pegawai</option>' +
      filteredPeg.map(p => `<option value="${escapeHtml(p.username)}" ${p.username === cur ? 'selected' : ''}>${escapeHtml(p.namaPegawai)} (${p.unit})</option>`).join('');
  }

  populateRuanganFilterDropdown(data);
}

function populateRuanganFilterDropdown(data) {
  data = data || cachedIntegratedMonitoringData;
  if (!data) return;
  const unitSelect = document.getElementById('adminFilterUnit');
  const pegSelect = document.getElementById('adminFilterPegawai');
  const rSelect = document.getElementById('adminFilterRuangan');
  if (!rSelect) return;

  const currentUnit = unitSelect?.value || 'SEMUA';
  const curPeg = pegSelect?.value || 'SEMUA';
  const curRuang = rSelect.value || 'SEMUA';

  const items = data.items || [];
  const ruanganSet = new Set();

  items.forEach(it => {
    if (currentUnit !== 'SEMUA' && it.unit !== currentUnit) return;
    if (curPeg !== 'SEMUA' && it.pegawai !== curPeg && it.username !== curPeg) return;
    if (it.ruangan && it.ruangan.trim()) {
      ruanganSet.add(it.ruangan.trim());
    }
  });

  if (ruanganSet.size === 0 && data.daftarRuangan) {
    data.daftarRuangan.forEach(r => {
      if (r && r.trim()) ruanganSet.add(r.trim());
    });
  }

  const sortedRuangan = Array.from(ruanganSet).sort();
  let rHtml = '<option value="SEMUA">Semua Ruangan / Pos</option>';
  sortedRuangan.forEach(r => {
    const isSel = (r === curRuang);
    rHtml += `<option value="${escapeHtml(r)}" ${isSel ? 'selected' : ''}>${escapeHtml(r)}</option>`;
  });
  rSelect.innerHTML = rHtml;
}

function onAdminFilterUnitChange() {
  if (cachedIntegratedMonitoringData) {
    const pegSelect = document.getElementById('adminFilterPegawai');
    if (pegSelect) pegSelect.value = 'SEMUA';
    const rSelect = document.getElementById('adminFilterRuangan');
    if (rSelect) rSelect.value = 'SEMUA';

    populateAdminFilterDropdowns(cachedIntegratedMonitoringData);
  }
  filterAdminMonitoringRealtime();
}

function onAdminFilterPegawaiChange() {
  if (cachedIntegratedMonitoringData) {
    const rSelect = document.getElementById('adminFilterRuangan');
    if (rSelect) rSelect.value = 'SEMUA';

    populateRuanganFilterDropdown(cachedIntegratedMonitoringData);
  }
  filterAdminMonitoringRealtime();
}

function filterAdminMonitoringRealtime() {
  renderIntegratedMonitoringUI();
}

function changeAdminMonitoringPeriod(p) {
      adminMonitoringCurrentPeriod = p;
      renderAdminPeriodSubNav();
      renderIntegratedMonitoringUI();
    }

function renderAdminPeriodSubNav() {
      const container = document.getElementById('adminPeriodSubNavContainer');
      if (!container) return;

      if (adminMonitoringCurrentPeriod === 'bulanan') {
        container.innerHTML = '<span class="text-xs text-slate-500 font-medium">Menampilkan seluruh data checklist pada bulan terpilih.</span>';
        return;
      }

      if (adminMonitoringCurrentPeriod === 'harian') {
        const days = (cachedIntegratedMonitoringData && cachedIntegratedMonitoringData.activeDays && cachedIntegratedMonitoringData.activeDays.length)
          ? cachedIntegratedMonitoringData.activeDays
          : Array.from({ length: 31 }, (_, i) => i + 1);

        container.innerHTML = `
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span class="text-xs font-bold text-slate-600 mr-1 whitespace-nowrap">Pilih Hari:</span>
            ${days.map(d => {
              const isSel = (d === adminMonitoringCurrentDay);
              return `<button onclick="setAdminMonitoringDay(${d})" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition ${isSel ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">Tgl ${d}</button>`;
            }).join('')}
          </div>
        `;
        return;
      }

      if (adminMonitoringCurrentPeriod === 'mingguan') {
        container.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-600 mr-1">Pilih Minggu:</span>
            ${[1, 2, 3, 4, 5].map(w => {
              const isSel = (w === adminMonitoringCurrentWeek);
              return `<button onclick="setAdminMonitoringWeek(${w})" class="px-3 py-1 rounded-lg text-xs font-semibold transition ${isSel ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">Minggu ke-${w}</button>`;
            }).join('')}
          </div>
        `;
      }
    }

function setAdminMonitoringDay(d) {
      adminMonitoringCurrentDay = d;
      renderAdminPeriodSubNav();
      renderIntegratedMonitoringUI();
    }

function setAdminMonitoringWeek(w) {
      adminMonitoringCurrentWeek = w;
      renderAdminPeriodSubNav();
      renderIntegratedMonitoringUI();
    }

function renderIntegratedMonitoringUI() {
      const tbody = document.getElementById('adminMonitoringTableBody');
      const countBadge = document.getElementById('adminMonitoringCountBadge');
      if (!tbody) return;

      if (!cachedIntegratedMonitoringData || !cachedIntegratedMonitoringData.items || !cachedIntegratedMonitoringData.items.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">Tidak ada data checklist ditemukan.</td></tr>';
        if (countBadge) countBadge.innerText = '0 Item';
        return;
      }

      const items = cachedIntegratedMonitoringData.items;
      const unitFilter = document.getElementById('adminFilterUnit')?.value || 'SEMUA';
      const pegFilter = document.getElementById('adminFilterPegawai')?.value || 'SEMUA';
      const rFilter = document.getElementById('adminFilterRuangan')?.value || 'SEMUA';
      const stFilter = document.getElementById('adminFilterStatus')?.value || 'SEMUA';
      const searchQ = (document.getElementById('searchAdminMonitoring')?.value || '').toLowerCase().trim();

      let filtered = items.filter(it => {
        // Unit Filter
        if (unitFilter !== 'SEMUA' && it.unit !== unitFilter) return false;
        // Pegawai Filter
        if (pegFilter !== 'SEMUA' && it.pegawai !== pegFilter && it.username !== pegFilter) return false;
        // Ruangan Filter
        if (rFilter !== 'SEMUA' && it.ruangan !== rFilter) return false;
        // Status Filter
        if (stFilter === 'SELESAI' && !it.isDone) return false;
        if (stFilter === 'BELUM' && it.isDone) return false;
        // Period Filter
        if (adminMonitoringCurrentPeriod === 'harian' && it.dayNum !== adminMonitoringCurrentDay) return false;
        if (adminMonitoringCurrentPeriod === 'mingguan' && it.weekNum !== adminMonitoringCurrentWeek) return false;
        // Real-time Search Query
        if (searchQ) {
          const combined = `${it.item || ''} ${it.pegawai || ''} ${it.ruangan || ''} ${it.unit || ''}`.toLowerCase();
          if (!combined.includes(searchQ)) return false;
        }
        return true;
      });

      if (countBadge) countBadge.innerText = `${filtered.length} Item Checklist`;

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">Tidak ada data checklist yang cocok dengan kriteria pencarian / filter.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map((it, idx) => {
        const isDone = it.isDone;
        return `
          <tr class="hover:bg-slate-50 transition border-t border-slate-100">
            <td class="py-3 px-4 font-semibold text-slate-400">${idx + 1}</td>
            <td class="py-3 px-4 font-semibold text-slate-700">${escapeHtml(it.unit || '-')}</td>
            <td class="py-3 px-4 font-bold text-slate-800">${escapeHtml(it.pegawai || '-')}</td>
            <td class="py-3 px-4 text-slate-600">${escapeHtml(it.ruangan || '-')}</td>
            <td class="py-3 px-4 text-slate-800">${escapeHtml(it.item || '-')}</td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
                <i class="fa-solid ${isDone ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'}"></i>
                ${isDone ? 'Selesai' : 'Belum'}
              </span>
            </td>
            <td class="py-3 px-4 text-slate-400 font-mono text-[11px] text-right">${escapeHtml(it.updatedAt || '-')}</td>
          </tr>
        `;
      }).join('');
    }

/**
     * ========================================================================
     * 3. REKAPITULASI TERPADU & TREN (ANTI-NAN & FAST)
     * ========================================================================
     */
    async function loadIntegratedRekapData(forceRefresh = false) {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      const cacheKey = `${bulan}_${tahun}`;

      if (!forceRefresh && window._managerDataCache.rekap[cacheKey]) {
        const d = window._managerDataCache.rekap[cacheKey];
        renderRekapCharts(d);
        renderRekapTable(d.rekapRuangan);
        return;
      }

      showLoader(true);
      try {
        const res = await callBackend('getIntegratedRekapMonitoring', { token: sessionToken, bulan, tahun });
        showLoader(false);
        if (res && res.success) {
          window._managerDataCache.rekap[cacheKey] = res.data;
          renderRekapCharts(res.data);
          renderRekapTable(res.data.rekapRuangan);
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast('Gagal memuat rekap: ' + err.message, 'error');
      }
    }

    /**
     * ========================================================================
     * 4. PENGATURAN SHIFT SECURITY & MATRIKS JADWAL (OPTIMIZED)
     * ========================================================================
     */
    // cachedSecurityMatrix declared globally
    let secActiveOfficerIdx = 0;
    let secActiveDayNum = new Date().getDate();
    let secPendingShiftChoice = 'P';
