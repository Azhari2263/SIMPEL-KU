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

      window._currentFilteredSupervisorItems = filtered;

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="py-8 text-center text-slate-400 font-medium">Tidak ada data checklist yang cocok dengan kriteria pencarian / filter.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map((it, idx) => {
        const isDone = it.isDone;
        const isPengawasValid = (it.statusPengawas === true);
        const hasEvidence = (it.adaBukti === true);

        return `
          <tr class="hover:bg-slate-50 transition border-t border-slate-100">
            <td class="py-3 px-3 font-semibold text-slate-400">${idx + 1}</td>
            <td class="py-3 px-3 font-semibold text-slate-700">
              <span class="inline-flex items-center gap-1.5 flex-wrap">
                <span>${escapeHtml(it.unit || '-')}</span>
                ${it.shift ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${it.shift === 'P' ? 'bg-blue-100 text-blue-700 border border-blue-200' : it.shift === 'S' ? 'bg-amber-100 text-amber-700 border border-amber-200' : it.shift === 'M' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'}">Shift ${escapeHtml(it.namaShift || it.shift)}</span>` : ''}
              </span>
            </td>
            <td class="py-3 px-3 font-bold text-slate-800">${escapeHtml(it.pegawai || '-')}</td>
            <td class="py-3 px-3 text-slate-600">${escapeHtml(it.ruangan || '-')}</td>
            <td class="py-3 px-4 text-slate-800 font-medium">${escapeHtml(it.item || '-')}</td>
            
            <!-- Kolom Status Petugas (Interaktif: Pengawas Dapat Mencetak Centang Selesai Jika Pegawai Belum Centang) -->
            <td class="py-3 px-3 text-center">
              ${isDone ? `
                <div class="flex flex-col items-center gap-1">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <i class="fa-solid fa-circle-check text-emerald-600"></i>
                    <span>Selesai</span>
                  </span>
                  <button onclick="toggleStaffTaskCheckFromSupervisor(${idx}, false)" title="Batalkan checklist tugas pegawai ini" class="text-[10px] text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer">
                    Batal Centang
                  </button>
                </div>
              ` : `
                <div class="flex flex-col items-center gap-1">
                  <button onclick="toggleStaffTaskCheckFromSupervisor(${idx}, true)" title="Pengawas mencentang tugas pegawai ini yang belum diceklist pegawai" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-600 hover:bg-emerald-600 text-white shadow-xs transition-all cursor-pointer active:scale-95">
                    <i class="fa-solid fa-check text-xs"></i>
                    <span>Centang Selesai</span>
                  </button>
                  <span class="text-[10px] text-rose-500 font-semibold">Belum Diceklist</span>
                </div>
              `}
            </td>

            <!-- Kolom Bukti Dukung Foto -->
            <td class="py-3 px-3 text-center">
              ${hasEvidence ? `
                <button onclick="openBuktiPhotoViewerFromRow(${idx})" title="Lihat Bukti Foto" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition cursor-pointer active:scale-95">
                  <i class="fa-solid fa-camera text-emerald-600"></i>
                  <span>Tersedia</span>
                </button>
              ` : `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                  <i class="fa-solid fa-minus text-[9px]"></i>
                  <span>Belum Ada</span>
                </span>
              `}
            </td>

            <!-- Kolom Validasi Pengawas (Interactive Checklist & Uncheck) -->
            <td class="py-3 px-3 text-center">
              ${isPengawasValid ? `
                <div class="flex flex-col items-center">
                  <button onclick="toggleSupervisorValidationFromRow(${idx}, false)" title="Klik untuk membatalkan checklist validasi pengawas (Uncheck)" class="group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-rose-600 text-white shadow-xs transition-all cursor-pointer active:scale-95">
                    <i class="fa-solid fa-check group-hover:hidden text-xs"></i>
                    <i class="fa-solid fa-xmark hidden group-hover:inline text-xs"></i>
                    <span class="group-hover:hidden">Tervalidasi</span>
                    <span class="hidden group-hover:inline">Batalkan</span>
                  </button>
                  <span class="text-[10px] text-slate-500 mt-1 max-w-[130px] truncate text-center" title="Divalidasi oleh ${escapeHtml(it.namaPengawas || 'Pengawas')} (${escapeHtml(it.waktuValidasi || '')})">
                    ${escapeHtml(it.namaPengawas ? 'Oleh ' + it.namaPengawas : 'Tervalidasi')}
                  </span>
                </div>
              ` : `
                <div class="flex flex-col items-center">
                  <button onclick="toggleSupervisorValidationFromRow(${idx}, true)" title="Berikan checklist validasi terhadap tugas ini" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all cursor-pointer active:scale-95">
                    <i class="fa-solid fa-clipboard-check text-xs"></i>
                    <span>Validasi</span>
                  </button>
                  <span class="text-[10px] text-slate-400 mt-1">Belum Valid</span>
                </div>
              `}
            </td>

            <td class="py-3 px-3 text-slate-400 font-mono text-[11px] text-right">
              ${escapeHtml(it.waktuValidasi || it.updatedAt || '-')}
            </td>
          </tr>
        `;
      }).join('');
    }

    /**
     * Pengawas mencentang / membatalkan tugas pegawai yang belum diceklist pegawai
     */
    async function toggleStaffTaskCheckFromSupervisor(idx, newStatus) {
      const list = window._currentFilteredSupervisorItems || [];
      const it = list[idx];
      if (!it) return;

      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;

      // Optimistic update
      const oldDone = it.isDone;
      it.isDone = newStatus;
      it.updatedAt = newStatus ? `${tahun}-${String(bulan).padStart(2, '0')}-${String(it.dayNum).padStart(2, '0')} (Diceklist Pengawas)` : '-';
      renderIntegratedMonitoringUI();

      showToast(newStatus ? 'Mencatat checklist tugas pegawai...' : 'Membatalkan centang tugas pegawai...', 'info');

      try {
        const res = await callBackend('supervisorToggleStaffTaskCheck', {
          token: sessionToken,
          taskKey: it.taskKey,
          sheetRowIndex: it.sheetRowIndex,
          colIndex: it.colIndex,
          targetSheetName: it.targetSheetName,
          namaPegawai: it.pegawai || it.namaPegawai,
          username: it.username,
          unit: it.unit,
          ruangan: it.ruangan,
          namaTugas: it.item,
          dayNum: it.dayNum,
          bulan: bulan,
          tahun: tahun,
          newStatus: newStatus
        });

        if (res && res.success) {
          showToast(res.message || (newStatus ? 'Tugas pegawai berhasil dicentang selesai oleh Pengawas!' : 'Centang tugas dibatalkan.'), 'success');
          if (res.data && res.data.taskKey) {
            it.taskKey = res.data.taskKey;
          }
          renderIntegratedMonitoringUI();
        } else {
          it.isDone = oldDone;
          renderIntegratedMonitoringUI();
          showToast((res && res.message) ? res.message : 'Gagal memperbarui status tugas pegawai.', 'error');
        }
      } catch (err) {
        it.isDone = oldDone;
        renderIntegratedMonitoringUI();
        showToast('Kesalahan server: ' + err.message, 'error');
      }
    }

    async function toggleSupervisorValidationFromRow(idx, newStatus) {
      const list = window._currentFilteredSupervisorItems || [];
      const it = list[idx];
      if (!it) return;

      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;

      // Optimistic update
      it.statusPengawas = newStatus;
      it.namaPengawas = newStatus ? (currentUser?.namaPegawai || currentUser?.username || 'Pengawas') : '';
      it.waktuValidasi = newStatus ? (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB') : '';

      // Jika memvalidasi tugas yang belum selesai, otomatis centang selesai tugas pegawai juga!
      const alsoCheckStaff = (!it.isDone && newStatus);
      if (alsoCheckStaff) {
        it.isDone = true;
      }

      renderIntegratedMonitoringUI();

      showToast(newStatus ? (alsoCheckStaff ? 'Memvalidasi & mencentang tugas pegawai...' : 'Memvalidasi tugas...') : 'Membatalkan checklist validasi...', 'info');

      try {
        const res = await callBackend('updateSupervisorChecklist', {
          token: sessionToken,
          taskKey: it.taskKey,
          sheetRowIndex: it.sheetRowIndex,
          colIndex: it.colIndex,
          targetSheetName: it.targetSheetName,
          namaPegawai: it.pegawai || it.namaPegawai,
          username: it.username,
          unit: it.unit,
          ruangan: it.ruangan,
          namaTugas: it.item,
          tanggal: it.dayNum,
          bulan: bulan,
          tahun: tahun,
          newStatus: newStatus,
          statusPetugas: it.isDone,
          alsoCheckStaff: alsoCheckStaff
        });

        if (res && res.success) {
          showToast(res.message || (newStatus ? 'Tugas berhasil divalidasi!' : 'Validasi pengawas dibatalkan!'), 'success');
          if (res.data) {
            it.taskKey = res.data.taskKey || it.taskKey;
            it.statusPengawas = res.data.statusPengawas;
            it.namaPengawas = res.data.namaPengawas;
            it.waktuValidasi = res.data.waktuValidasiPengawas;
          }
          renderIntegratedMonitoringUI();
        } else {
          it.statusPengawas = !newStatus;
          if (alsoCheckStaff) it.isDone = false;
          renderIntegratedMonitoringUI();
          showToast((res && res.message) ? res.message : 'Gagal memperbarui validasi pengawas.', 'error');
        }
      } catch (err) {
        it.statusPengawas = !newStatus;
        if (alsoCheckStaff) it.isDone = false;
        renderIntegratedMonitoringUI();
        showToast('Kesalahan server: ' + err.message, 'error');
      }
    }

    function openBuktiPhotoViewerFromRow(idx) {
      const list = window._currentFilteredSupervisorItems || [];
      const it = list[idx];
      if (!it) return;
      openViewBuktiModal({
        namaTugas: it.item,
        ruangan: it.ruangan,
        namaPegawai: it.pegawai || it.namaPegawai,
        unit: it.unit,
        tanggal: it.dayNum,
        bulan: document.getElementById('globalMonthSelect').value,
        tahun: document.getElementById('globalYearSelect').value,
        waktu: it.waktuPelaksanaan || it.updatedAt,
        koordinat: it.koordinat,
        lokasi: it.lokasi,
        fileId: it.fileId,
        fileUrl: it.fileUrl,
        fileName: it.fileName,
        statusPengawas: it.statusPengawas,
        namaPengawas: it.namaPengawas,
        waktuValidasi: it.waktuValidasi,
        statusPetugas: it.isDone
      });
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
     * 5. FITUR EXPORT LAPORAN (EXCEL & CETAK/PDF DENGAN LIVE PREVIEW)
     * ========================================================================
     */
    let _lastExportReportData = null;

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
      // Trigger live preview begitu modal terbuka
      setTimeout(() => {
        triggerLiveExportPreview();
      }, 50);
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
      triggerLiveExportPreview();
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

    /**
     * Muat dan perbarui pratinjau langsung di dalam modal export
     */
    async function triggerLiveExportPreview() {
      const previewArea = document.getElementById('modalExportPreviewArea');
      if (!previewArea) return;

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

      previewArea.innerHTML = `
        <div class="text-center py-10 text-slate-400">
          <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span class="text-xs font-medium">Memuat pratinjau lembar laporan BPS...</span>
        </div>
      `;

      try {
        const res = await callBackend('getExportLaporanData', {
          token: sessionToken,
          tipe: scope,
          bulan: bulan,
          tahun: tahun,
          targetUsername: targetUser
        });

        if (res && res.success && res.data) {
          _lastExportReportData = res.data;
          previewArea.innerHTML = renderLaporanPreviewHtml(res.data);
        } else {
          previewArea.innerHTML = `
            <div class="p-6 text-center text-xs text-rose-500 font-medium">
              <i class="fa-solid fa-circle-exclamation mr-1"></i>${escapeHtml(res?.message || 'Gagal memuat pratinjau laporan.')}
            </div>
          `;
        }
      } catch (err) {
        previewArea.innerHTML = `
          <div class="p-6 text-center text-xs text-rose-500 font-medium">
            Kesalahan: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }

    /**
     * Render dokumen laporan resmi berformat HTML bersih untuk preview inline & modal
     */
    function renderLaporanPreviewHtml(d) {
      if (!d) return '<div class="p-4 text-center text-slate-400 text-xs">Data tidak tersedia.</div>';
      const isSemua = (d.tipe === 'semua');
      const periode = d.periode || {};
      const summary = d.summary || {};

      let tableHtml = '';
      if (isSemua) {
        const rows = (d.rekapPegawai || []).map((p, idx) => {
          const badgeClass = p.persen >= 90
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : (p.persen >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200');
          return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
              <td class="p-2.5 text-center text-slate-400 font-medium text-xs">${idx + 1}</td>
              <td class="p-2.5 font-bold text-slate-800 text-xs">${escapeHtml(p.namaPegawai)}</td>
              <td class="p-2.5 text-center text-xs text-slate-600">${escapeHtml(p.unit || '-')}</td>
              <td class="p-2.5 text-right font-medium text-slate-700 text-xs">${p.totalTarget || 0}</td>
              <td class="p-2.5 text-right font-bold text-emerald-600 text-xs">${p.selesai || 0}</td>
              <td class="p-2.5 text-right font-bold text-rose-600 text-xs">${p.belum || 0}</td>
              <td class="p-2.5 text-center font-black text-xs ${p.persen >= 90 ? 'text-emerald-600' : (p.persen >= 70 ? 'text-amber-600' : 'text-rose-600')}">${p.persen || 0}%</td>
              <td class="p-2.5 text-center text-xs">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">${escapeHtml(p.status || '-')}</span>
              </td>
            </tr>
          `;
        }).join('');

        tableHtml = `
          <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  <th class="p-2.5 text-center w-10">No</th>
                  <th class="p-2.5">Nama Pegawai / Petugas</th>
                  <th class="p-2.5 text-center w-28">Unit Kerja</th>
                  <th class="p-2.5 text-right w-24">Target</th>
                  <th class="p-2.5 text-right w-24">Selesai</th>
                  <th class="p-2.5 text-right w-24">Belum</th>
                  <th class="p-2.5 text-center w-24">Capaian</th>
                  <th class="p-2.5 text-center w-32">Status Kinerja</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                <tr class="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <td colspan="3" class="p-2.5 text-center uppercase text-slate-900 font-extrabold tracking-wider">TOTAL KESELURUHAN</td>
                  <td class="p-2.5 text-right text-slate-900 font-bold">${summary.totalTarget || 0}</td>
                  <td class="p-2.5 text-right text-emerald-700 font-black">${summary.totalSelesai || 0}</td>
                  <td class="p-2.5 text-right text-rose-700 font-black">${summary.totalBelum || 0}</td>
                  <td class="p-2.5 text-center text-brand-700 font-black">${summary.persen || 0}%</td>
                  <td class="p-2.5 text-center font-bold text-slate-700">${summary.persen >= 90 ? 'Optimal' : (summary.persen >= 70 ? 'Cukup' : 'Perlu Perhatian')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      } else {
        // INDIVIDU (Detail per tanggal 1..31)
        const days = periode.daysInMonth || 31;
        let dayHeaders = '';
        for (let d = 1; d <= days; d++) {
          dayHeaders += `<th class="p-1 text-center font-bold text-[10px] w-6 border border-slate-700/60">${d}</th>`;
        }

        const rows = (d.items || []).map((it, idx) => {
          let dayCells = '';
          for (let d = 1; d <= days; d++) {
            const val = it.dailyStatus ? it.dailyStatus[d] : '-';
            let cellDisp = '-';
            let cellClass = 'text-slate-300';
            if (val === '1' || val === 1 || val === true) {
              cellDisp = '✓';
              cellClass = 'text-emerald-600 font-black bg-emerald-50/70';
            } else if (val === '0' || val === 0 || val === false) {
              cellDisp = '✗';
              cellClass = 'text-rose-600 font-black bg-rose-50/70';
            }
            dayCells += `<td class="p-1 text-center text-[10px] border border-slate-200 ${cellClass}">${cellDisp}</td>`;
          }

          return `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
              <td class="p-2 text-center text-slate-400 font-medium text-xs border border-slate-200">${idx + 1}</td>
              <td class="p-2 font-bold text-slate-800 text-xs border border-slate-200 whitespace-nowrap">${escapeHtml(it.ruangan || '-')}</td>
              <td class="p-2 text-slate-700 text-xs border border-slate-200 min-w-[200px]">${escapeHtml(it.kegiatan || '-')}</td>
              ${dayCells}
              <td class="p-2 text-right font-medium text-slate-700 text-xs border border-slate-200">${it.target || 0}</td>
              <td class="p-2 text-right font-bold text-emerald-600 text-xs border border-slate-200">${it.selesai || 0}</td>
              <td class="p-2 text-right font-bold text-rose-600 text-xs border border-slate-200">${it.belum || 0}</td>
              <td class="p-2 text-center font-black text-xs border border-slate-200 ${it.persen >= 90 ? 'text-emerald-600' : (it.persen >= 70 ? 'text-amber-600' : 'text-rose-600')}">${it.persen || 0}%</td>
            </tr>
          `;
        }).join('');

        tableHtml = `
          <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  <th class="p-2 text-center w-8 border border-slate-700" rowspan="2">No</th>
                  <th class="p-2 w-32 border border-slate-700" rowspan="2">Ruangan / Pos</th>
                  <th class="p-2 border border-slate-700" rowspan="2">Uraian Tugas / Kegiatan</th>
                  <th class="p-1.5 text-center border border-slate-700" colspan="${days}">Tanggal (Bulan ${escapeHtml(periode.namaBulan || '')})</th>
                  <th class="p-1.5 text-center border border-slate-700" colspan="4">Ringkasan Capaian</th>
                </tr>
                <tr class="bg-slate-800 text-slate-200 text-[10px]">
                  ${dayHeaders}
                  <th class="p-1.5 text-right w-14 border border-slate-700">Target</th>
                  <th class="p-1.5 text-right w-14 border border-slate-700">Selesai</th>
                  <th class="p-1.5 text-right w-14 border border-slate-700">Belum</th>
                  <th class="p-1.5 text-center w-14 border border-slate-700">(%)</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                <tr class="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <td colspan="${3 + days}" class="p-2 text-center uppercase text-slate-900 font-extrabold tracking-wider border border-slate-200">TOTAL CAPAIAN BULAN INI</td>
                  <td class="p-2 text-right text-slate-900 font-bold border border-slate-200">${summary.totalTarget || 0}</td>
                  <td class="p-2 text-right text-emerald-700 font-black border border-slate-200">${summary.totalSelesai || 0}</td>
                  <td class="p-2 text-right text-rose-700 font-black border border-slate-200">${summary.totalBelum || 0}</td>
                  <td class="p-2 text-center text-brand-700 font-black border border-slate-200">${summary.persen || 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }

      return `
        <div class="space-y-4 font-sans bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <!-- KOP SURAT RESMI BPS KALBAR -->
          <div class="text-center pb-3 border-b-2 border-slate-900">
            <h2 class="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT</h2>
            <p class="text-[11px] text-slate-600 mt-0.5">Jl. Sutan Syahrir No. 24/42, Pontianak 78116 | Telp: (0561) 732049 | Email: bps6100@bps.go.id</p>
            <div class="mt-1 font-bold text-xs text-brand-700 uppercase tracking-wider">SISTEM MONITORING OPERASIONAL (SIMPEL-KU)</div>
          </div>

          <!-- JUDUL LAPORAN -->
          <div class="text-center py-1">
            <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
              ${isSemua ? 'REKAPITULASI CAPAIAN KINERJA OPERASIONAL PEGAWAI' : 'LAPORAN DETAIL MONITORING & CHECKLIST TUGAS PEGAWAI'}
            </h3>
            <p class="text-xs text-slate-500 font-medium mt-0.5">Periode: <strong class="text-slate-800">${escapeHtml(periode.labelPeriode || '')}</strong></p>
          </div>

          <!-- META INFORMASI -->
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            ${isSemua ? `
              <div><span class="text-slate-500 font-medium">Total Petugas:</span> <strong class="text-slate-900">${summary.totalPegawai || 0} Orang</strong></div>
              <div><span class="text-slate-500 font-medium">Bulan Pelaporan:</span> <strong class="text-slate-900">${escapeHtml(periode.labelPeriode || '')}</strong></div>
              <div><span class="text-slate-500 font-medium">Status Kepatuhan:</span> <strong class="text-emerald-700">${summary.persen || 0}% Terpenuhi</strong></div>
              <div><span class="text-slate-500 font-medium">Format Dokumen:</span> <strong class="text-slate-900">Rekap Gabungan</strong></div>
            ` : `
              <div><span class="text-slate-500 font-medium">Nama Petugas:</span> <strong class="text-slate-900">${escapeHtml(d.pegawai?.namaPegawai || '')}</strong></div>
              <div><span class="text-slate-500 font-medium">Unit Kerja:</span> <strong class="text-slate-900">${escapeHtml(d.pegawai?.unit || '')} (${escapeHtml(d.pegawai?.role || '')})</strong></div>
              <div><span class="text-slate-500 font-medium">Akun Pengguna:</span> <strong class="text-slate-700">@${escapeHtml(d.pegawai?.username || '')}</strong></div>
              <div><span class="text-slate-500 font-medium">Bulan Pelaporan:</span> <strong class="text-slate-900">${escapeHtml(periode.labelPeriode || '')}</strong></div>
            `}
          </div>

          <!-- KARTU RINGKASAN KPI -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Target</span>
              <span class="text-base font-black text-slate-800">${summary.totalTarget || 0}</span>
            </div>
            <div class="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-center">
              <span class="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tugas Selesai</span>
              <span class="text-base font-black text-emerald-700">${summary.totalSelesai || 0}</span>
            </div>
            <div class="p-3 bg-rose-50/70 rounded-xl border border-rose-200/80 text-center">
              <span class="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Belum Selesai</span>
              <span class="text-base font-black text-rose-700">${summary.totalBelum || 0}</span>
            </div>
            <div class="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-center">
              <span class="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">Capaian (%)</span>
              <span class="text-base font-black text-blue-700">${summary.persen || 0}%</span>
            </div>
          </div>

          <!-- TABEL DATA -->
          ${tableHtml}

          <!-- LEMBAR PENGESAHAN TANDA TANGAN -->
          <div class="pt-6 grid grid-cols-2 gap-4 text-xs text-center border-t border-slate-200 mt-6">
            <div>
              <p class="font-medium text-slate-600">Mengetahui,<br><strong class="text-slate-900">Kasubbag Umum BPS Prov. Kalbar</strong></p>
              <div class="h-16"></div>
              <p class="font-bold underline text-slate-900">( .................................................... )</p>
              <p class="text-[10px] text-slate-400 mt-0.5">NIP. ........................................</p>
            </div>
            <div>
              <p class="font-medium text-slate-600">Pontianak, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br><strong class="text-slate-900">${isSemua ? 'Koordinator Monitoring' : `Petugas ${escapeHtml(d.pegawai?.unit || 'Operasional')}`}</strong></p>
              <div class="h-16"></div>
              <p class="font-bold underline text-slate-900">( ${isSemua ? 'Supervisor Operasional' : escapeHtml(d.pegawai?.namaPegawai || 'Petugas')} )</p>
              <p class="text-[10px] text-slate-400 mt-0.5">${isSemua ? 'Koordinator Lapangan' : `@${escapeHtml(d.pegawai?.username || '')}`}</p>
            </div>
          </div>
        </div>
      `;
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

      // Jika data pratinjau terakhir sudah sama persis, gunakan langsung tanpa round-trip tambahan
      if (_lastExportReportData && 
          _lastExportReportData.tipe === scope && 
          _lastExportReportData.periode?.bulan == bulan && 
          _lastExportReportData.periode?.tahun == tahun && 
          (scope !== 'individu' || _lastExportReportData.pegawai?.username === targetUser)) {
        closeModal('modalExportLaporan');
        if (format === 'excel') {
          downloadExcelReport(_lastExportReportData);
        } else {
          printPdfReport(_lastExportReportData);
        }
        return;
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
          _lastExportReportData = res.data;
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

      let sheetName = isSemua ? 'Rekap_Semua_Pegawai' : 'Detail_Tugas_Individu';
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
              <td class="text-right font-bold" style="color: #be123c;">${p.belum || 0}</td>
              <td class="text-center font-bold">${p.persen || 0}%</td>
              <td class="${statusBadge}">${escapeHtml(p.status || '-')}</td>
            </tr>
          `;
        }).join('');

        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 45px;">No</th>
                <th style="width: 240px;">Nama Pegawai / Petugas</th>
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
        // INDIVIDU (Detail Tanggal 1..31)
        const days = periode.daysInMonth || 31;
        let dayHeaders = '';
        for (let day = 1; day <= days; day++) {
          dayHeaders += `<th style="width: 32px;">${day}</th>`;
        }

        const rows = (d.items || []).map((it, idx) => {
          const bgClass = (idx % 2 === 1) ? 'class="bg-alt"' : '';
          let dayCells = '';
          for (let day = 1; day <= days; day++) {
            const val = it.dailyStatus ? it.dailyStatus[day] : '-';
            let cellDisp = '-';
            let cellStyle = 'color: #94a3b8; text-align: center;';
            if (val === '1' || val === 1 || val === true) {
              cellDisp = '&#10003;';
              cellStyle = 'color: #047857; font-weight: bold; background-color: #ecfdf5; text-align: center;';
            } else if (val === '0' || val === 0 || val === false) {
              cellDisp = '&#10007;';
              cellStyle = 'color: #e11d48; font-weight: bold; background-color: #fff1f2; text-align: center;';
            }
            dayCells += `<td style="${cellStyle}">${cellDisp}</td>`;
          }

          return `
            <tr ${bgClass}>
              <td class="text-center">${idx + 1}</td>
              <td class="text-left font-bold">${escapeHtml(it.ruangan || '-')}</td>
              <td class="text-left">${escapeHtml(it.kegiatan || '-')}</td>
              ${dayCells}
              <td class="text-right font-bold">${it.target || 0}</td>
              <td class="text-right font-bold" style="color: #047857;">${it.selesai || 0}</td>
              <td class="text-right font-bold" style="color: #be123c;">${it.belum || 0}</td>
              <td class="text-center font-bold">${it.persen || 0}%</td>
            </tr>
          `;
        }).join('');

        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 40px;" rowspan="2">No</th>
                <th style="width: 150px;" rowspan="2">Ruangan / Pos</th>
                <th style="width: 260px;" rowspan="2">Uraian Tugas / Kegiatan</th>
                <th colspan="${days}">Tanggal (Bulan ${escapeHtml(periode.namaBulan || '')})</th>
                <th colspan="4">Ringkasan Capaian</th>
              </tr>
              <tr>
                ${dayHeaders}
                <th style="width: 65px;">Target</th>
                <th style="width: 65px;">Selesai</th>
                <th style="width: 65px;">Belum</th>
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
        \x3Chtml xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        \x3Chead>
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
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; }
            table { border-collapse: collapse; margin-top: 14px; }
            th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #94a3b8; padding: 8px 6px; font-size: 10pt; }
            td { border: 1px solid #cbd5e1; padding: 6px 6px; font-size: 10pt; vertical-align: middle; }
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
        \x3C/head\x3E
        \x3Cbody>
          <table style="border: none; margin-bottom: 10px;">
            <tr>
              <td colspan="6" style="border: none; font-size: 15pt; font-weight: bold; color: #0f172a;">BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT</td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 10pt; color: #475569;">Jl. Sutan Syahrir No. 24/42, Pontianak 78116 | Telp: (0561) 732049 | Email: bps6100@bps.go.id</td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 11pt; font-weight: bold; color: #1e3a8a;">SISTEM MONITORING OPERASIONAL (SIMPEL-KU)</td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 12pt; font-weight: bold; padding-top: 6px;">
                ${isSemua ? 'REKAPITULASI CAPAIAN KINERJA OPERASIONAL PEGAWAI' : `LAPORAN DETAIL MONITORING & CHECKLIST TUGAS: ${escapeHtml(d.pegawai?.namaPegawai || '')}`}
              </td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 10pt; color: #334155;">
                Periode: ${escapeHtml(periode.labelPeriode || '')} ${!isSemua ? ` | Unit: ${escapeHtml(d.pegawai?.unit || '')} | Peran: ${escapeHtml(d.pegawai?.role || '')}` : ''}
              </td>
            </tr>
            <tr>
              <td colspan="6" style="border: none; font-size: 10pt; color: #334155;">
                Total Target: ${summary.totalTarget || 0} Tugas | Selesai: ${summary.totalSelesai || 0} (${summary.persen || 0}%) | Belum: ${summary.totalBelum || 0}
              </td>
            </tr>
          </table>

          ${tableHtml}

          <table style="border: none; margin-top: 30px;">
            <tr>
              <td colspan="3" style="border: none; text-align: center; font-size: 10pt;">
                Mengetahui,<br><strong>Kasubbag Umum BPS Prov. Kalbar</strong><br><br><br><br>
                <strong>( .................................................... )</strong><br>
                NIP. ........................................
              </td>
              <td colspan="4" style="border: none;"></td>
              <td colspan="3" style="border: none; text-align: center; font-size: 10pt;">
                Pontianak, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                <strong>${isSemua ? 'Koordinator Monitoring' : `Petugas ${escapeHtml(d.pegawai?.unit || 'Operasional')}`}</strong><br><br><br><br>
                <strong>( ${isSemua ? 'Supervisor Operasional' : escapeHtml(d.pegawai?.namaPegawai || 'Petugas')} )</strong><br>
                ${isSemua ? 'Koordinator Lapangan' : `@${escapeHtml(d.pegawai?.username || '')}`}
              </td>
            </tr>
          </table>
        \x3C/body\x3E
        \x3C/html\x3E
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

      const printWindow = window.open('', '_blank', 'width=1150,height=850,scrollbars=yes,resizable=yes');
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
        // INDIVIDU (Landscape dengan 31 hari & ringkasan)
        const days = periode.daysInMonth || 31;
        let dayHeaders = '';
        for (let day = 1; day <= days; day++) {
          dayHeaders += `<th style="width: 22px; font-size: 7.5pt; padding: 4px 1px;">${day}</th>`;
        }

        const rows = (d.items || []).map((it, idx) => {
          let dayCells = '';
          for (let day = 1; day <= days; day++) {
            const val = it.dailyStatus ? it.dailyStatus[day] : '-';
            let cellDisp = '-';
            let cellStyle = 'color: #94a3b8; font-size: 8pt;';
            if (val === '1' || val === 1 || val === true) {
              cellDisp = '&#10003;';
              cellStyle = 'color: #047857; font-weight: bold; background-color: #ecfdf5; font-size: 9pt;';
            } else if (val === '0' || val === 0 || val === false) {
              cellDisp = '&#10007;';
              cellStyle = 'color: #be123c; font-weight: bold; background-color: #fff1f2; font-size: 8pt;';
            }
            dayCells += `<td style="text-align: center; ${cellStyle}">${cellDisp}</td>`;
          }

          return `
            <tr>
              <td style="text-align: center; font-size: 8pt;">${idx + 1}</td>
              <td style="font-weight: 600; font-size: 8pt;">${escapeHtml(it.ruangan || '-')}</td>
              <td style="font-size: 8pt;">${escapeHtml(it.kegiatan || '-')}</td>
              ${dayCells}
              <td style="text-align: right; font-size: 8pt;">${it.target || 0}</td>
              <td style="text-align: right; color: #047857; font-weight: bold; font-size: 8pt;">${it.selesai || 0}</td>
              <td style="text-align: right; color: #be123c; font-size: 8pt;">${it.belum || 0}</td>
              <td style="text-align: center; font-weight: bold; font-size: 8pt;">${it.persen || 0}%</td>
            </tr>
          `;
        }).join('');

        contentTableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 28px;" rowspan="2">No</th>
                <th style="width: 120px;" rowspan="2">Ruangan / Pos</th>
                <th rowspan="2">Uraian Tugas / Kegiatan</th>
                <th colspan="${days}">Tanggal (Bulan ${escapeHtml(periode.namaBulan || '')})</th>
                <th colspan="4" style="width: 160px;">Ringkasan Capaian</th>
              </tr>
              <tr>
                ${dayHeaders}
                <th style="width: 38px; font-size: 7.5pt;">Target</th>
                <th style="width: 38px; font-size: 7.5pt;">Selesai</th>
                <th style="width: 38px; font-size: 7.5pt;">Belum</th>
                <th style="width: 42px; font-size: 7.5pt;">(%)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="${3 + days}" style="text-align: center;">TOTAL CAPAIAN BULAN INI</td>
                <td style="text-align: right;">${summary.totalTarget || 0}</td>
                <td style="text-align: right; color: #047857;">${summary.totalSelesai || 0}</td>
                <td style="text-align: right; color: #be123c;">${summary.totalBelum || 0}</td>
                <td style="text-align: center;">${summary.persen || 0}%</td>
              </tr>
            </tbody>
          </table>
        `;
      }

      const namaTandaTanganKanan = isSemua ? 'Supervisor Operasional' : escapeHtml(d.pegawai?.namaPegawai || 'Petugas');
      const jabatanKanan = isSemua ? 'Koordinator Monitoring' : `Petugas ${escapeHtml(d.pegawai?.unit || 'Operasional')}`;

      const printHtml = `
        \x3C!DOCTYPE html>
        \x3Chtml lang="id">
        \x3Chead>
          <meta charset="UTF-8">
          <title>${isSemua ? 'Rekapitulasi Kinerja Pegawai' : `Laporan Tugas - ${escapeHtml(d.pegawai?.namaPegawai || '')}`} | BPS Kalbar</title>
          <style>
            @page {
              size: ${isSemua ? 'A4 portrait' : 'A4 landscape'};
              margin: ${isSemua ? '12mm 15mm 12mm 15mm' : '10mm 12mm 10mm 12mm'};
            }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 16px;
              background-color: #ffffff;
              font-size: ${isSemua ? '9.5pt' : '8.5pt'};
              line-height: 1.35;
            }
            .no-print {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 16px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .btn {
              padding: 6px 15px;
              border-radius: 6px;
              font-size: 9pt;
              font-weight: 600;
              cursor: pointer;
              border: none;
              transition: all 0.2s;
            }
            .btn-primary { background-color: #1e3a8a; color: #ffffff; }
            .btn-primary:hover { background-color: #1e40af; }
            .btn-close { background-color: #e2e8f0; color: #334155; }
            .btn-close:hover { background-color: #cbd5e1; }
            
            /* KOP SURAT RESMI BPS */
            .kop-header {
              text-align: center;
              border-bottom: 3px double #1e293b;
              padding-bottom: 10px;
              margin-bottom: 16px;
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
              margin: 3px 0 0;
            }
            .kop-aplikasi {
              margin-top: 5px;
              font-weight: bold;
              font-size: 9.5pt;
              color: #1e3a8a;
              letter-spacing: 0.3px;
              text-transform: uppercase;
            }

            .doc-title {
              text-align: center;
              margin: 12px 0 12px;
            }
            .doc-title h2 {
              margin: 0;
              font-size: 11pt;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-title p {
              margin: 2px 0 0;
              font-size: 9pt;
              color: #475569;
            }

            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              margin-bottom: 14px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6px;
              font-size: 8.5pt;
            }
            .meta-item { display: flex; }
            .meta-label { width: 120px; font-weight: 600; color: #475569; }
            .meta-val { font-weight: 700; color: #0f172a; }

            .kpi-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 14px;
            }
            .kpi-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px;
              text-align: center;
              background: #ffffff;
            }
            .kpi-num { font-size: 14pt; font-weight: 800; margin: 2px 0 0; }
            .kpi-label { font-size: 7.5pt; color: #64748b; font-weight: 600; text-transform: uppercase; }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: ${isSemua ? '8.5pt' : '8pt'};
            }
            th {
              background-color: #1e3a8a;
              color: #ffffff;
              font-weight: 700;
              padding: 6px 4px;
              border: 1px solid #1e3a8a;
              text-align: center;
            }
            td {
              padding: 5px 4px;
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
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .sig-box {
              width: 240px;
              text-align: center;
              font-size: 9pt;
            }
            .sig-space { height: 55px; }
            .sig-name {
              font-weight: 700;
              text-decoration: underline;
              margin: 0;
            }
            .sig-title {
              font-size: 8pt;
              color: #64748b;
              margin-top: 2px;
            }

            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        \x3C/head\x3E
        \x3Cbody>
          <div class="no-print">
            <div style="font-weight: 600; color: #334155;">
              <span>Dokumen Siap Dicetak</span> &bull; 
              <span style="font-size: 8.5pt; color: #64748b;">Pilih 'Save as PDF' di dialog printer browser untuk menyimpan file PDF.</span>
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
            <h2>${isSemua ? 'REKAPITULASI CAPAIAN KINERJA OPERASIONAL PEGAWAI' : 'LAPORAN DETAIL MONITORING & EVALUASI TUGAS PEGAWAI'}</h2>
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
              <div class="kpi-num" style="color: #1e3a8a;">${summary.persen || 0}%</div>
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

        \x3C/body\x3E
        \x3C/html\x3E
      `;

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(function() {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        } catch (e) {}
      }, 500);
    }

