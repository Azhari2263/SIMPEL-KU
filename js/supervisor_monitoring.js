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

          if (res.data.activeDays && res.data.activeDays.length > 0) {
            const now = new Date();
            const curBulan = Number(bulan);
            const curTahun = Number(tahun);
            if (now.getMonth() + 1 === curBulan && now.getFullYear() === curTahun) {
              if (res.data.activeDays.includes(now.getDate())) {
                adminMonitoringCurrentDay = now.getDate();
              } else {
                adminMonitoringCurrentDay = res.data.activeDays[0];
              }
            } else if (!res.data.activeDays.includes(adminMonitoringCurrentDay)) {
              adminMonitoringCurrentDay = res.data.activeDays[0];
            }
          }

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
          const combined = `${it.item || ''} ${it.pegawai || ''} ${it.ruangan || ''} ${it.unit || ''} ${it.shift || ''} ${it.namaShift || ''}`.toLowerCase();
          if (!combined.includes(searchQ)) return false;
        }
        return true;
      });

      const subTitleEl = document.getElementById('adminMonitoringSubtitle');
      if (subTitleEl) {
        if (adminMonitoringCurrentPeriod === 'harian') {
          subTitleEl.innerText = `Menampilkan tugas checklist yang harus dikerjakan pada tanggal ${adminMonitoringCurrentDay} (sesuai shift & jadwal harian)`;
        } else if (adminMonitoringCurrentPeriod === 'mingguan') {
          subTitleEl.innerText = `Menampilkan tugas checklist pada Minggu ke-${adminMonitoringCurrentWeek} (sesuai shift & jadwal tugas)`;
        } else {
          subTitleEl.innerText = 'Menampilkan seluruh tugas checklist sesuai shift & jadwal operasional';
        }
      }

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
            <td class="py-3 px-4 font-semibold text-slate-700">
              <span class="inline-flex items-center gap-1.5 flex-wrap">
                <span>${escapeHtml(it.unit || '-')}</span>
                ${it.shift ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${it.shift === 'P' ? 'bg-blue-100 text-blue-700 border border-blue-200' : it.shift === 'S' ? 'bg-amber-100 text-amber-700 border border-amber-200' : it.shift === 'M' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'}">Shift ${escapeHtml(it.namaShift || it.shift)}</span>` : ''}
              </span>
            </td>
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

      if (!forceRefresh && window._managerDataCache && window._managerDataCache.rekap && window._managerDataCache.rekap[cacheKey]) {
        const d = window._managerDataCache.rekap[cacheKey];
        renderRekapTable(d.rekapRuangan);
        try {
          renderRekapCharts(d);
        } catch (chartErr) {
          console.warn('Chart render warning:', chartErr);
        }
        return;
      }

      showLoader(true);
      try {
        const res = await callBackend('getIntegratedRekapMonitoring', { token: sessionToken, bulan, tahun });
        showLoader(false);
        if (res && res.success) {
          if (window._managerDataCache && window._managerDataCache.rekap) {
            window._managerDataCache.rekap[cacheKey] = res.data;
          }
          renderRekapTable(res.data.rekapRuangan);
          try {
            renderRekapCharts(res.data);
          } catch (chartErr) {
            console.warn('Chart render warning:', chartErr);
          }
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

    /**
     * ========================================================================
     * 5. FITUR EXPORT LAPORAN (EXCEL & CETAK/PDF)
     * ========================================================================
     */
    function openExportModal(defaultEmpUsername = null) {
      const curMonth = document.getElementById('globalMonthSelect')?.value || 
                       document.getElementById('adminFilterBulan')?.value || 
                       (new Date().getMonth() + 1);
      const curYear = document.getElementById('globalYearSelect')?.value || 
                      document.getElementById('adminFilterTahun')?.value || 
                      new Date().getFullYear();

      const mSel = document.getElementById('exportMonthSelect');
      const ySel = document.getElementById('exportYearSelect');
      if (mSel) mSel.value = curMonth;
      if (ySel) ySel.value = curYear;

      const role = (currentUser?.role || '').toLowerCase();
      const isManager = role.includes('admin') || role.includes('supervisor') || role.includes('kabag') || role.includes('umum');

      const scopeWrapper = document.getElementById('exportScopeWrapper');
      const empWrapper = document.getElementById('exportEmployeeSelectWrapper');
      const radioSemua = document.getElementById('radioScopeSemua');
      const radioIndividu = document.getElementById('radioScopeIndividu');

      if (!isManager) {
        if (scopeWrapper) scopeWrapper.classList.add('hidden');
        if (empWrapper) empWrapper.classList.add('hidden');
        if (radioIndividu) radioIndividu.checked = true;
      } else {
        if (scopeWrapper) scopeWrapper.classList.remove('hidden');
        populateExportEmployeeSelect(defaultEmpUsername);

        if (defaultEmpUsername) {
          if (radioIndividu) radioIndividu.checked = true;
          if (empWrapper) empWrapper.classList.remove('hidden');
          const empSel = document.getElementById('exportEmployeeSelect');
          if (empSel) empSel.value = defaultEmpUsername;
        } else {
          if (radioSemua) radioSemua.checked = true;
          if (empWrapper) empWrapper.classList.add('hidden');
        }
      }

      openModal('modalExportLaporan');
    }

    function onExportScopeChange() {
      const scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'semua';
      const empWrapper = document.getElementById('exportEmployeeSelectWrapper');
      if (empWrapper) {
        if (scope === 'individu') {
          empWrapper.classList.remove('hidden');
          populateExportEmployeeSelect();
        } else {
          empWrapper.classList.add('hidden');
        }
      }
    }

    function populateExportEmployeeSelect(selectedUsername = null) {
      const sel = document.getElementById('exportEmployeeSelect');
      if (!sel) return;

      const userMap = new Map();

      // Dari cachedIntegratedMonitoringData
      if (typeof cachedIntegratedMonitoringData !== 'undefined' && cachedIntegratedMonitoringData?.daftarPegawai?.length) {
        cachedIntegratedMonitoringData.daftarPegawai.forEach(p => {
          if (p?.username && !userMap.has(p.username)) {
            userMap.set(p.username, { username: p.username, namaPegawai: p.namaPegawai, unit: p.unit });
          }
        });
      }

      // Dari cachedSupervisorPegawai
      if (typeof cachedSupervisorPegawai !== 'undefined' && Array.isArray(cachedSupervisorPegawai)) {
        cachedSupervisorPegawai.forEach(p => {
          const u = p?.username || p?.namaPegawai;
          if (u && !userMap.has(u)) {
            userMap.set(u, { username: u, namaPegawai: p.namaPegawai, unit: p.unit || p.role });
          }
        });
      }

      // Dari adminFilterPegawai select
      const adminPegSelect = document.getElementById('adminFilterPegawai');
      if (adminPegSelect && adminPegSelect.options.length > 1) {
        for (let i = 0; i < adminPegSelect.options.length; i++) {
          const opt = adminPegSelect.options[i];
          if (opt.value && opt.value !== 'SEMUA' && !userMap.has(opt.value)) {
            userMap.set(opt.value, { username: opt.value, namaPegawai: opt.text });
          }
        }
      }

      // Fallback
      if (userMap.size === 0 && currentUser) {
        userMap.set(currentUser.username, { username: currentUser.username, namaPegawai: currentUser.namaPegawai, unit: currentUser.unit });
      }

      const list = Array.from(userMap.values());
      sel.innerHTML = list.map(p => {
        const uLabel = p.unit ? ` (${p.unit})` : '';
        const isSel = (p.username === selectedUsername || (!selectedUsername && p.username === currentUser?.username));
        return `<option value="${escapeHtml(p.username)}" ${isSel ? 'selected' : ''}>${escapeHtml(p.namaPegawai)}${uLabel}</option>`;
      }).join('');
    }

    async function runExportLaporan(format) {
      const role = (currentUser?.role || '').toLowerCase();
      const isManager = role.includes('admin') || role.includes('supervisor') || role.includes('kabag') || role.includes('umum');
      let scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'semua';
      if (!isManager) scope = 'individu';

      const bulan = document.getElementById('exportMonthSelect')?.value || (new Date().getMonth() + 1);
      const tahun = document.getElementById('exportYearSelect')?.value || new Date().getFullYear();

      let targetUser = '';
      if (scope === 'individu') {
        if (isManager) {
          targetUser = document.getElementById('exportEmployeeSelect')?.value || currentUser?.username;
        } else {
          targetUser = currentUser?.username;
        }
      }

      showLoader(true, 'Menyiapkan berkas laporan...');
      try {
        const res = await callBackend('getExportLaporanData', {
          token: sessionToken,
          tipe: scope,
          bulan: bulan,
          tahun: tahun,
          targetUsername: targetUser
        });
        showLoader(false);

        if (res && res.success && res.data) {
          closeModal('modalExportLaporan');
          if (format === 'excel') {
            downloadExcelReport(res.data);
          } else {
            printPdfReport(res.data);
          }
        } else {
          showToast(res?.message || 'Gagal menyiapkan data laporan.', 'error');
        }
      } catch (err) {
        showLoader(false);
        showToast('Terjadi kesalahan export: ' + err.message, 'error');
      }
    }

    function downloadExcelReport(d) {
      if (!d) return;
      const isSemua = (d.tipe === 'semua');
      const periode = d.periode || {};
      const summary = d.summary || {};

      let sheetName = isSemua ? 'Rekap_Semua' : 'Laporan_Individu';
      let fileName = isSemua 
        ? `SIMPELKU_Rekap_Semua_Pegawai_${periode.namaBulan || 'Bulan'}_${periode.tahun || 'Tahun'}.xls`
        : `SIMPELKU_Laporan_${(d.pegawai?.namaPegawai || 'Pegawai').replace(/\s+/g, '_')}_${periode.namaBulan || 'Bulan'}_${periode.tahun || 'Tahun'}.xls`;

      let tableHtml = '';

      if (isSemua) {
        const rows = (d.rekapPegawai || []).map((p, idx) => {
          const bgClass = (idx % 2 === 1) ? 'class="bg-alt"' : '';
          const statusBadge = p.persen >= 90 ? 'badge-optimal' : (p.persen >= 70 ? 'badge-cukup' : 'badge-kurang');
          return `
            <tr ${bgClass}>
              <td class="text-center">${idx + 1}</td>
              <td class="text-left font-bold">${escapeHtml(p.namaPegawai)}</td>
              <td class="text-center">${escapeHtml(p.unit || '-')}</td>
              <td class="text-right">${p.totalTarget || 0}</td>
              <td class="text-right font-bold" style="color: #047857;">${p.selesai || 0}</td>
              <td class="text-right" style="color: #be123c;">${p.belum || 0}</td>
              <td class="text-center font-bold">${p.persen || 0}%</td>
              <td class="${statusBadge}">${escapeHtml(p.status || '-')}</td>
            </tr>
          `;
        }).join('');

        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 220px;">Nama Pegawai</th>
                <th style="width: 140px;">Unit Kerja</th>
                <th style="width: 110px;">Target Tugas</th>
                <th style="width: 110px;">Tugas Selesai</th>
                <th style="width: 110px;">Belum Selesai</th>
                <th style="width: 110px;">Capaian (%)</th>
                <th style="width: 130px;">Status Kinerja</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="bg-total">
                <td colspan="3" class="text-center font-bold">TOTAL KESELURUHAN</td>
                <td class="text-right font-bold">${summary.totalTarget || 0}</td>
                <td class="text-right font-bold" style="color: #047857;">${summary.totalSelesai || 0}</td>
                <td class="text-right font-bold" style="color: #be123c;">${summary.totalBelum || 0}</td>
                <td class="text-center font-bold">${summary.persen || 0}%</td>
                <td class="text-center font-bold">${summary.persen >= 90 ? 'Optimal' : (summary.persen >= 70 ? 'Cukup' : 'Perlu Perhatian')}</td>
              </tr>
            </tbody>
          </table>
        `;
      } else {
        // INDIVIDU
        const days = periode.daysInMonth || 31;
        let dayHeaders = '';
        for (let day = 1; day <= days; day++) {
          dayHeaders += `<th style="width: 30px;">${day}</th>`;
        }

        const rows = (d.items || []).map((it, idx) => {
          const bgClass = (idx % 2 === 1) ? 'class="bg-alt"' : '';
          let dayCells = '';
          for (let day = 1; day <= days; day++) {
            const val = it.dailyStatus ? it.dailyStatus[day] : '-';
            let cellDisp = '-';
            let cellStyle = 'color: #94a3b8;';
            if (val === '1' || val === 1 || val === true) {
              cellDisp = '&#10003;';
              cellStyle = 'color: #047857; font-weight: bold; background-color: #ecfdf5;';
            } else if (val === '0' || val === 0 || val === false) {
              cellDisp = '&#10007;';
              cellStyle = 'color: #e11d48; font-weight: bold; background-color: #fff1f2;';
            }
            dayCells += `<td class="text-center" style="${cellStyle}">${cellDisp}</td>`;
          }

          return `
            <tr ${bgClass}>
              <td class="text-center">${idx + 1}</td>
              <td class="text-left font-bold">${escapeHtml(it.ruangan || '-')}</td>
              <td class="text-left">${escapeHtml(it.kegiatan || '-')}</td>
              ${dayCells}
              <td class="text-right font-bold">${it.target || 0}</td>
              <td class="text-right font-bold" style="color: #047857;">${it.selesai || 0}</td>
              <td class="text-right" style="color: #be123c;">${it.belum || 0}</td>
              <td class="text-center font-bold">${it.persen || 0}%</td>
            </tr>
          `;
        }).join('');

        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 40px;" rowspan="2">No</th>
                <th style="width: 140px;" rowspan="2">Ruangan / Pos</th>
                <th style="width: 250px;" rowspan="2">Uraian Tugas / Kegiatan</th>
                <th colspan="${days}">Tanggal (Bulan ${escapeHtml(periode.namaBulan || '')})</th>
                <th colspan="4">Ringkasan Capaian</th>
              </tr>
              <tr>
                ${dayHeaders}
                <th style="width: 60px;">Target</th>
                <th style="width: 60px;">Selesai</th>
                <th style="width: 60px;">Belum</th>
                <th style="width: 70px;">(%)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="bg-total">
                <td colspan="${3 + days}" class="text-center font-bold">TOTAL CAPAIAN BULAN INI</td>
                <td class="text-right font-bold">${summary.totalTarget || 0}</td>
                <td class="text-right font-bold" style="color: #047857;">${summary.totalSelesai || 0}</td>
                <td class="text-right font-bold" style="color: #be123c;">${summary.totalBelum || 0}</td>
                <td class="text-center font-bold">${summary.persen || 0}%</td>
              </tr>
            </tbody>
          </table>
        `;
      }

      const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${sheetName}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
            table { border-collapse: collapse; margin-top: 12px; }
            th { background-color: #047857; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #94a3b8; padding: 7px 5px; font-size: 10pt; }
            td { border: 1px solid #cbd5e1; padding: 6px 5px; font-size: 10pt; vertical-align: middle; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .bg-alt { background-color: #f8fafc; }
            .bg-total { background-color: #e2e8f0; font-weight: bold; }
            .badge-optimal { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; }
            .badge-cukup { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
            .badge-kurang { background-color: #ffe4e6; color: #9f1239; font-weight: bold; text-align: center; }
          </style>
        </head>
        <body>
          <table style="border: none; margin-bottom: 8px;">
            <tr>
              <td colspan="6" style="border: none; font-size: 14pt; font-weight: bold; color: #0f172a;">BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT</td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 11pt; font-weight: bold; color: #047857;">SISTEM MONITORING OPERASIONAL (SIMPEL-KU)</td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 11pt; font-weight: bold;">
                ${isSemua ? 'REKAPITULASI CAPAIAN KINERJA OPERASIONAL PEGAWAI' : `LAPORAN DETAIL MONITORING & CHECKLIST TUGAS: ${escapeHtml(d.pegawai?.namaPegawai || '')}`}
              </td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 10pt; color: #475569;">
                Periode: ${escapeHtml(periode.labelPeriode || '')} ${!isSemua ? ` | Unit: ${escapeHtml(d.pegawai?.unit || '')} | Peran: ${escapeHtml(d.pegawai?.role || '')}` : ''}
              </td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 10pt; color: #475569;">
                Total Target: ${summary.totalTarget || 0} Tugas | Selesai: ${summary.totalSelesai || 0} (${summary.persen || 0}%) | Belum: ${summary.totalBelum || 0}
              </td>
            </tr>
          </table>
          ${tableHtml}
        </body>
        </html>
      `;

      const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast('Laporan Excel berhasil diunduh!', 'success');
    }

    function printPdfReport(d) {
      if (!d) return;
      const isSemua = (d.tipe === 'semua');
      const periode = d.periode || {};
      const summary = d.summary || {};

      const printWindow = window.open('', '_blank', 'width=1050,height=850,scrollbars=yes,resizable=yes');
      if (!printWindow) {
        showToast('Pop-up jendela cetak diblokir browser. Harap izinkan pop-up untuk mencetak laporan.', 'warning');
        return;
      }

      const now = new Date();
      const namaBulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const tglCetakStr = `${now.getDate()} ${namaBulanIndo[now.getMonth()]} ${now.getFullYear()}`;

      let contentTableHtml = '';
      if (isSemua) {
        const rows = (d.rekapPegawai || []).map((p, idx) => {
          const statusColor = p.persen >= 90 ? 'color: #065f46; font-weight: bold;' : (p.persen >= 70 ? 'color: #92400e;' : 'color: #9f1239; font-weight: bold;');
          return `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-weight: 600;">${escapeHtml(p.namaPegawai)}</td>
              <td style="text-align: center;">${escapeHtml(p.unit || '-')}</td>
              <td style="text-align: right;">${p.totalTarget || 0}</td>
              <td style="text-align: right; color: #047857; font-weight: bold;">${p.selesai || 0}</td>
              <td style="text-align: right; color: #be123c;">${p.belum || 0}</td>
              <td style="text-align: center; font-weight: bold;">${p.persen || 0}%</td>
              <td style="text-align: center; ${statusColor}">${escapeHtml(p.status || '-')}</td>
            </tr>
          `;
        }).join('');

        contentTableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">No</th>
                <th>Nama Pegawai / Petugas</th>
                <th style="width: 120px;">Unit Kerja</th>
                <th style="width: 95px;">Target Tugas</th>
                <th style="width: 95px;">Selesai</th>
                <th style="width: 95px;">Belum</th>
                <th style="width: 90px;">Capaian</th>
                <th style="width: 120px;">Status Kinerja</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="3" style="text-align: center;">TOTAL KESELURUHAN</td>
                <td style="text-align: right;">${summary.totalTarget || 0}</td>
                <td style="text-align: right; color: #047857;">${summary.totalSelesai || 0}</td>
                <td style="text-align: right; color: #be123c;">${summary.totalBelum || 0}</td>
                <td style="text-align: center;">${summary.persen || 0}%</td>
                <td style="text-align: center;">${summary.persen >= 90 ? 'Optimal' : (summary.persen >= 70 ? 'Cukup' : 'Perlu Perhatian')}</td>
              </tr>
            </tbody>
          </table>
        `;
      } else {
        // INDIVIDU
        const rows = (d.items || []).map((it, idx) => {
          const statusBadge = it.persen >= 90 ? 'Optimal' : (it.persen >= 70 ? 'Cukup' : 'Kurang');
          const statusColor = it.persen >= 90 ? 'color: #065f46;' : (it.persen >= 70 ? 'color: #92400e;' : 'color: #9f1239;');
          return `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-weight: 600;">${escapeHtml(it.ruangan || '-')}</td>
              <td>${escapeHtml(it.kegiatan || '-')}</td>
              <td style="text-align: right;">${it.target || 0}</td>
              <td style="text-align: right; color: #047857; font-weight: bold;">${it.selesai || 0}</td>
              <td style="text-align: right; color: #be123c;">${it.belum || 0}</td>
              <td style="text-align: center; font-weight: bold;">${it.persen || 0}%</td>
              <td style="text-align: center; font-weight: bold; ${statusColor}">${statusBadge}</td>
            </tr>
          `;
        }).join('');

        contentTableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">No</th>
                <th style="width: 150px;">Ruangan / Pos</th>
                <th>Rincian Tugas / Kegiatan</th>
                <th style="width: 85px;">Target</th>
                <th style="width: 85px;">Selesai</th>
                <th style="width: 85px;">Belum</th>
                <th style="width: 85px;">Capaian</th>
                <th style="width: 95px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="3" style="text-align: center;">TOTAL CAPAIAN BULANAN</td>
                <td style="text-align: right;">${summary.totalTarget || 0}</td>
                <td style="text-align: right; color: #047857;">${summary.totalSelesai || 0}</td>
                <td style="text-align: right; color: #be123c;">${summary.totalBelum || 0}</td>
                <td style="text-align: center;">${summary.persen || 0}%</td>
                <td style="text-align: center;">${summary.status || '-'}</td>
              </tr>
            </tbody>
          </table>
        `;
      }

      const namaTandaTanganKanan = isSemua ? 'Supervisor Operasional' : escapeHtml(d.pegawai?.namaPegawai || 'Petugas');
      const jabatanKanan = isSemua ? 'Koordinator Monitoring' : `Petugas ${escapeHtml(d.pegawai?.unit || 'Operasional')}`;

      const printHtml = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>${isSemua ? 'Rekapitulasi Kinerja Pegawai' : `Laporan Tugas - ${escapeHtml(d.pegawai?.namaPegawai || '')}`} | BPS Kalbar</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              font-size: 10pt;
              line-height: 1.4;
            }
            .no-print {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px 18px;
              margin-bottom: 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .btn {
              padding: 7px 16px;
              border-radius: 6px;
              font-size: 9.5pt;
              font-weight: 600;
              cursor: pointer;
              border: none;
              transition: all 0.2s;
            }
            .btn-primary { background-color: #047857; color: #ffffff; }
            .btn-primary:hover { background-color: #065f46; }
            .btn-close { background-color: #e2e8f0; color: #334155; }
            .btn-close:hover { background-color: #cbd5e1; }
            
            /* KOP SURAT RESMI BPS */
            .kop-header {
              text-align: center;
              border-bottom: 3px double #1e293b;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .kop-instansi {
              font-size: 13pt;
              font-weight: 800;
              letter-spacing: 0.5px;
              color: #0f172a;
              text-transform: uppercase;
              margin: 0;
            }
            .kop-alamat {
              font-size: 8.5pt;
              color: #475569;
              margin: 4px 0 0;
            }
            .kop-aplikasi {
              margin-top: 6px;
              font-weight: bold;
              font-size: 10pt;
              color: #047857;
              letter-spacing: 0.3px;
              text-transform: uppercase;
            }

            .doc-title {
              text-align: center;
              margin: 16px 0 14px;
            }
            .doc-title h2 {
              margin: 0;
              font-size: 12pt;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-title p {
              margin: 3px 0 0;
              font-size: 9.5pt;
              color: #475569;
            }

            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 16px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              font-size: 9pt;
            }
            .meta-item { display: flex; }
            .meta-label { width: 130px; font-weight: 600; color: #475569; }
            .meta-val { font-weight: 700; color: #0f172a; }

            .kpi-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 18px;
            }
            .kpi-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
              background: #ffffff;
            }
            .kpi-num { font-size: 15pt; font-weight: 800; margin: 2px 0 0; }
            .kpi-label { font-size: 8pt; color: #64748b; font-weight: 600; text-transform: uppercase; }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 9pt;
            }
            th {
              background-color: #047857;
              color: #ffffff;
              font-weight: 700;
              padding: 7px 6px;
              border: 1px solid #047857;
              text-align: center;
              font-size: 8.5pt;
            }
            td {
              padding: 6px 6px;
              border: 1px solid #cbd5e1;
              vertical-align: middle;
            }
            tbody tr:nth-child(even) { background-color: #f8fafc; }
            .total-row td {
              background-color: #f1f5f9;
              font-weight: 700;
              border-top: 2px solid #94a3b8;
            }

            .sig-section {
              margin-top: 36px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .sig-box {
              width: 240px;
              text-align: center;
              font-size: 9.5pt;
            }
            .sig-space { height: 60px; }
            .sig-name {
              font-weight: 700;
              text-decoration: underline;
              margin: 0;
            }
            .sig-title {
              font-size: 8.5pt;
              color: #64748b;
              margin-top: 2px;
            }

            @media print {
              .no-print { display: none !important; }
              body { padding: 0; font-size: 9.5pt; }
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <div style="font-weight: 600; color: #334155;">
              <span>Dokumen Siap Dicetak</span> &bull; 
              <span style="font-size: 8.5pt; color: #64748b;">Gunakan pilihan 'Save as PDF' di printer dialog browser untuk menyimpan PDF.</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="window.close()" class="btn btn-close">Tutup</button>
              <button onclick="window.print()" class="btn btn-primary">&#128438; Cetak Sekarang</button>
            </div>
          </div>

          <div class="kop-header">
            <h1 class="kop-instansi">BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT</h1>
            <p class="kop-alamat">Jl. Sutan Syahrir No. 24/42, Pontianak 78116 | Telp: (0561) 732049 | Email: bps6100@bps.go.id</p>
            <div class="kop-aplikasi">Sistem Monitoring Pelayanan, Keamanan dan Kebersihan Umum (SIMPEL-KU)</div>
          </div>

          <div class="doc-title">
            <h2>${isSemua ? 'REKAPITULASI CAPAIAN KINERJA OPERASIONAL PEGAWAI' : 'LAPORAN DETAIL MONITORING & EVALUASI TUGAS'}</h2>
            <p>Periode: <strong>${escapeHtml(periode.labelPeriode || '')}</strong></p>
          </div>

          <div class="meta-box">
            ${isSemua ? `
              <div class="meta-item"><span class="meta-label">Total Pegawai</span><span class="meta-val">: ${summary.totalPegawai || 0} Petugas</span></div>
              <div class="meta-item"><span class="meta-label">Bulan Pelaporan</span><span class="meta-val">: ${escapeHtml(periode.labelPeriode || '')}</span></div>
              <div class="meta-item"><span class="meta-label">Status Kepatuhan</span><span class="meta-val">: ${summary.persen || 0}% Terpenuhi</span></div>
              <div class="meta-item"><span class="meta-label">Tanggal Cetak</span><span class="meta-val">: ${tglCetakStr}</span></div>
            ` : `
              <div class="meta-item"><span class="meta-label">Nama Pegawai</span><span class="meta-val">: ${escapeHtml(d.pegawai?.namaPegawai || '')}</span></div>
              <div class="meta-item"><span class="meta-label">Unit Kerja</span><span class="meta-val">: ${escapeHtml(d.pegawai?.unit || '')} (${escapeHtml(d.pegawai?.role || '')})</span></div>
              <div class="meta-item"><span class="meta-label">Username / Akun</span><span class="meta-val">: @${escapeHtml(d.pegawai?.username || '')}</span></div>
              <div class="meta-item"><span class="meta-label">Bulan Pelaporan</span><span class="meta-val">: ${escapeHtml(periode.labelPeriode || '')}</span></div>
            `}
          </div>

          <div class="kpi-row">
            <div class="kpi-card">
              <div class="kpi-label">Total Target Tugas</div>
              <div class="kpi-num" style="color: #0f172a;">${summary.totalTarget || 0}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Tugas Selesai</div>
              <div class="kpi-num" style="color: #047857;">${summary.totalSelesai || 0}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Belum Dikerjakan</div>
              <div class="kpi-num" style="color: #be123c;">${summary.totalBelum || 0}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Tingkat Capaian</div>
              <div class="kpi-num" style="color: #2563eb;">${summary.persen || 0}%</div>
            </div>
          </div>

          ${contentTableHtml}

          <div class="sig-section">
            <div class="sig-box">
              <p style="margin: 0;">Mengetahui,<br><strong>Kasubbag Umum BPS Prov. Kalbar</strong></p>
              <div class="sig-space"></div>
              <p class="sig-name">( .................................................... )</p>
              <p class="sig-title">NIP. ........................................</p>
            </div>
            <div class="sig-box">
              <p style="margin: 0;">Pontianak, ${tglCetakStr}<br><strong>${jabatanKanan}</strong></p>
              <div class="sig-space"></div>
              <p class="sig-name">( ${namaTandaTanganKanan} )</p>
              <p class="sig-title">${isSemua ? 'Koordinator Tim' : `@${escapeHtml(d.pegawai?.username || '')}`}</p>
            </div>
          </div>

          \x3Cscript\x3E
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 450);
            });
          \x3C/script\x3E
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(function() {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
          }
        } catch (e) {}
      }, 700);
    }
