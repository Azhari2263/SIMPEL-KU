/**
 * ========================================================================
 * SIMPEL-KU - STAFF MONITORING & CHECKLIST CONTROLLER
 * ========================================================================
 */

/**
     * =========================================================================
     * PERIODE SWITCHER LOGIC (HARIAN [DEFAULT], MINGGUAN, BULANAN)
     * =========================================================================
     */
    function changeMonitoringPeriod(newPeriod) {
      monitoringPeriod = newPeriod;
      tableCurrentPage = 1;

      ['harian', 'mingguan', 'bulanan'].forEach(p => {
        const btn = document.getElementById('periodBtn-' + p);
        if (btn) {
          if (p === newPeriod) {
            btn.className = 'period-tab px-3.5 py-1.5 rounded-lg active bg-white text-brand-700 shadow-xs font-bold';
          } else {
            btn.className = 'period-tab px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-medium';
          }
        }
      });

      renderPeriodSubNav();
      renderMonitoringView();
    }

/**
     * MENGELOMPOKKAN HARI DALAM BULAN BERDASARKAN MINGGU KALENDER
     * Aturan: Mulai dari SENIN tiap minggunya (kecuali Minggu 1), dan diakhiri MINGGU (kecuali Minggu Terakhir)
     */
    function buildCalendarWeekGroups(activeDays, month, year) {
      if (!activeDays || activeDays.length === 0) return [];
      const groups = [];
      let currentGroup = [];

      activeDays.forEach(d => {
        currentGroup.push(d);
        const dateObj = new Date(year, month - 1, d);
        const dow = dateObj.getDay(); // 0 = Minggu
        if (dow === 0) { // Berakhir di hari Minggu
          groups.push(currentGroup);
          currentGroup = [];
        }
      });

      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      return groups;
    }

function initSelectedDayAndWeek() {
      if (!cachedMonitoringData) return;
      const activeDays = cachedMonitoringData.activeDays || [];
      if (activeDays.length === 0) {
        selectedMonitoringDay = 1;
        selectedMonitoringWeek = 1;
        harianWeekGroupIndex = 0;
        return;
      }

      const today = new Date();
      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);

      if (today.getMonth() + 1 === currentBulan && today.getFullYear() === currentTahun) {
        selectedMonitoringDay = today.getDate();
      } else {
        selectedMonitoringDay = activeDays[0];
      }

      const weekGroups = buildCalendarWeekGroups(activeDays, currentBulan, currentTahun);
      let foundGroupIdx = 0;
      weekGroups.forEach((grp, idx) => {
        if (grp.includes(selectedMonitoringDay)) foundGroupIdx = idx;
      });
      harianWeekGroupIndex = foundGroupIdx;
      selectedMonitoringWeek = Math.min(weekGroups.length || 1, foundGroupIdx + 1);
    }

function renderPeriodSubNav() {
      const container = document.getElementById('periodSubNavContainer');
      if (!container || !cachedMonitoringData) return;

      const activeDays = cachedMonitoringData.activeDays || [];
      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);

      if (monitoringPeriod === 'harian') {
        const weekGroups = buildCalendarWeekGroups(activeDays, currentBulan, currentTahun);
        const totalGroups = Math.max(1, weekGroups.length);
        harianWeekGroupIndex = Math.min(harianWeekGroupIndex, totalGroups - 1);

        const currentWeekDays = weekGroups[harianWeekGroupIndex] || activeDays;

        let dayPillsHtml = '';
        currentWeekDays.forEach(d => {
          const dateObj = new Date(currentTahun, currentBulan - 1, d);
          const dow = dateObj.getDay();
          const isHoliday = (dow === 0 || dow === 6);
          const hariStr = HARI_SHORT[dow] || '';
          const isSelected = (d === selectedMonitoringDay);

          dayPillsHtml += `
            <button onclick="setMonitoringDay(${d})"
              class="flex-shrink-0 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center min-w-[48px] ${
                isSelected
                  ? (isHoliday ? 'bg-rose-600 border-rose-600 text-white shadow-md' : 'bg-brand-600 border-brand-600 text-white shadow-md scale-[1.03]')
                  : (isHoliday ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100')
              }">
              <span class="text-[10px] opacity-80 uppercase tracking-wider">${hariStr}</span>
              <span class="text-sm font-black leading-tight">${d}</span>
            </button>
          `;
        });

        const startDayText = currentWeekDays[0] || '';
        const endDayText   = currentWeekDays[currentWeekDays.length - 1] || '';

        container.innerHTML = `
          <div class="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 flex-1 pr-2">
            <button onclick="setTodayAsMonitoringDay()" class="flex-shrink-0 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl text-xs border border-brand-200/80 transition-colors flex items-center gap-1.5">
              <i class="fa-solid fa-location-crosshairs text-xs"></i>
              <span>Hari Ini</span>
            </button>
            <div class="h-6 w-px bg-slate-200 flex-shrink-0"></div>

            <div class="flex items-center space-x-1 flex-shrink-0">
              <button onclick="changeHarianWeekGroup(-1, ${totalGroups})" ${harianWeekGroupIndex === 0 ? 'disabled class="p-1.5 bg-slate-100 text-slate-300 rounded-lg cursor-not-allowed"' : 'class="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg shadow-2xs"'}>
                <i class="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <span class="text-[11px] font-bold text-slate-600 px-1 text-center min-w-[90px]">
                Mg ${harianWeekGroupIndex + 1} (${startDayText}-${endDayText})
              </span>
              <button onclick="changeHarianWeekGroup(1, ${totalGroups})" ${harianWeekGroupIndex === totalGroups - 1 ? 'disabled class="p-1.5 bg-slate-100 text-slate-300 rounded-lg cursor-not-allowed"' : 'class="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg shadow-2xs"'}>
                <i class="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>

            <div class="h-6 w-px bg-slate-200 flex-shrink-0"></div>
            ${dayPillsHtml}
          </div>

          <div class="flex items-center space-x-1.5 flex-shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs">
            <button onclick="setDisplayFormatHarian('cards')" class="px-2.5 py-1 rounded-lg ${displayFormatHarian === 'cards' ? 'bg-white text-brand-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-grip-vertical mr-1"></i>Kartu
            </button>
            <button onclick="setDisplayFormatHarian('table')" class="px-2.5 py-1 rounded-lg ${displayFormatHarian === 'table' ? 'bg-white text-brand-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-table-list mr-1"></i>Tabel
            </button>
          </div>
        `;
      } else if (monitoringPeriod === 'mingguan') {
        const weekGroups = buildCalendarWeekGroups(activeDays, currentBulan, currentTahun);
        if (selectedMonitoringWeek > weekGroups.length) {
          selectedMonitoringWeek = Math.max(1, weekGroups.length);
        }

        let weekTabsHtml = '';
        weekGroups.forEach((group, idx) => {
          const wNum = idx + 1;
          const startD = group[0];
          const endD = group[group.length - 1];
          const isSelected = (wNum === selectedMonitoringWeek);

          weekTabsHtml += `
            <button onclick="setMonitoringWeek(${wNum})"
              class="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }">
              Minggu ${wNum} (Tgl ${startD} - ${endD})
            </button>
          `;
        });

        container.innerHTML = `
          <div class="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 flex-1">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0 mr-1">Pilih Minggu Kalender:</span>
            ${weekTabsHtml}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="flex items-center justify-between w-full text-xs text-slate-600">
            <span class="font-medium flex items-center gap-1.5">
              <i class="fa-solid fa-circle-info text-brand-600"></i>
              Matriks Bulanan dipartisi per <strong>Minggu Kalender (Senin s/d Minggu)</strong> agar selalu pas 1 layar.
            </span>
          </div>
        `;
      }
    }

function changeHarianWeekGroup(delta, totalGroups) {
      harianWeekGroupIndex = Math.max(0, Math.min(totalGroups - 1, harianWeekGroupIndex + delta));
      const activeDays = cachedMonitoringData ? cachedMonitoringData.activeDays : [];
      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);
      const weekGroups = buildCalendarWeekGroups(activeDays, currentBulan, currentTahun);

      if (weekGroups[harianWeekGroupIndex] && weekGroups[harianWeekGroupIndex].length > 0) {
        selectedMonitoringDay = weekGroups[harianWeekGroupIndex][0];
      }
      renderPeriodSubNav();
      renderMonitoringView();
    }

function setMonitoringDay(dayNum) {
      selectedMonitoringDay = dayNum;
      renderPeriodSubNav();
      renderMonitoringView();
    }

function setTodayAsMonitoringDay() {
      initSelectedDayAndWeek();
      renderPeriodSubNav();
      renderMonitoringView();
    }

function setMonitoringWeek(weekNum) {
      selectedMonitoringWeek = weekNum;
      tableCurrentPage = 1;
      renderPeriodSubNav();
      renderMonitoringView();
    }

function setDisplayFormatHarian(fmt) {
      displayFormatHarian = fmt;
      renderPeriodSubNav();
      renderMonitoringView();
    }

function changeTablePage(delta, totalPages) {
      tableCurrentPage = Math.max(1, Math.min(totalPages, tableCurrentPage + delta));
      renderMonitoringView();
    }

/**
     * =========================================================================
     * MONITORING RENDERING & CELL RULE LOGIC
     * =========================================================================
     */
    async function loadMonitoringData(jenis) {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      showLoader(true);

      try {
        const res = await callBackend('getMonitoringData', {
          token: sessionToken,
          jenis: jenis,
          bulan: bulan,
          tahun: tahun,
          filterRuangan: 'SEMUA',
          filterStatus: 'SEMUA'
        });
        showLoader(false);
        if (res && res.success) {
          cachedMonitoringData = res.data;
          initSelectedDayAndWeek();
          populateRuanganDropdown();
          renderPeriodSubNav();
          renderMonitoringView();
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast("Gagal memuat monitoring: " + err.message, "error");
      }
    }

function populateRuanganDropdown() {
      const selectRuangan = document.getElementById('filterRuangan');
      const currentSelection = selectRuangan.value;
      selectRuangan.innerHTML = '<option value="SEMUA">Semua Ruangan</option>';
      if (cachedMonitoringData && cachedMonitoringData.daftarRuangan) {
        cachedMonitoringData.daftarRuangan.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r;
          opt.innerText = r;
          selectRuangan.appendChild(opt);
        });
      }
      if (currentSelection) selectRuangan.value = currentSelection;
    }

function getFilteredMonitoringItems() {
      if (!cachedMonitoringData || !cachedMonitoringData.items) return [];

      const filterRuanganVal = document.getElementById('filterRuangan').value;
      const filterStatusVal  = document.getElementById('filterStatus').value;
      const searchVal         = document.getElementById('searchKegiatan').value.toLowerCase().trim();

      return cachedMonitoringData.items.filter(item => {
        if (filterRuanganVal !== 'SEMUA' && item.ruangan !== filterRuanganVal) return false;
        if (searchVal && !item.kegiatan.toLowerCase().includes(searchVal) && !item.ruangan.toLowerCase().includes(searchVal)) return false;

        if (monitoringPeriod === 'harian') {
          const statusOnDay = item.dailyStatus ? item.dailyStatus[selectedMonitoringDay] : '-';
          if (filterStatusVal === 'SELESAI' && statusOnDay !== '1') return false;
          if (filterStatusVal === 'BELUM' && statusOnDay !== '0') return false;
        } else {
          const isCompleteAll = item.selesaiCount === item.totalHariAktif && item.totalHariAktif > 0;
          if (filterStatusVal === 'SELESAI' && !isCompleteAll) return false;
          if (filterStatusVal === 'BELUM' && isCompleteAll) return false;
        }

        return true;
      });
    }

function renderMonitoringView() {
      const container = document.getElementById('monitoringContentArea');
      if (!container || !cachedMonitoringData) return;

      const filteredItems = getFilteredMonitoringItems();

      if (filteredItems.length === 0) {
        container.innerHTML = `
          <div class="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
              <i class="fa-solid fa-filter"></i>
            </div>
            <h4 class="text-sm font-bold text-slate-800">Tidak Ada Item Kegiatan</h4>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan item checklist aktif yang sesuai dengan filter atau pencarian Anda.
            </p>
          </div>
        `;
        return;
      }

      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);
      const weekGroups   = buildCalendarWeekGroups(cachedMonitoringData.activeDays || [], currentBulan, currentTahun);

      if (monitoringPeriod === 'harian') {
        if (displayFormatHarian === 'cards') {
          renderHarianCardView(container, filteredItems);
        } else {
          renderTableMatrixView(container, filteredItems, [selectedMonitoringDay]);
        }
      } else if (monitoringPeriod === 'mingguan') {
        const weekDays = weekGroups[selectedMonitoringWeek - 1] || [];
        if (weekDays.length === 0) {
          container.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Tidak ada hari kerja pada Minggu ${selectedMonitoringWeek}.
            </div>
          `;
          return;
        }
        renderTableMatrixView(container, filteredItems, weekDays);
      } else {
        // Mode Bulanan: Pagination per Minggu Kalender (Tampilan 1 Layar Penuh)
        renderTableMatrixView(container, filteredItems, null, weekGroups);
      }
    }

/**
     * TAMPILAN HARIAN — CARD LIST VIEW (Pas 1 Layar & Penanganan Sabtu/Minggu Libur)
     */
    function renderHarianCardView(container, items) {
      const dayNum = selectedMonitoringDay;
      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);
      const dateObj = new Date(currentTahun, currentBulan - 1, dayNum);

      const dow = dateObj.getDay(); // 0=Minggu, 6=Sabtu
      const isHoliday = (dow === 0 || dow === 6); // Sabtu & Minggu = Libur
      const bulanText = document.getElementById('globalMonthSelect').options[currentBulan - 1].text;
      const hariName  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dow] || '';
      const fullDateStr = `${hariName}, ${dayNum} ${bulanText} ${currentTahun}`;

      const now = new Date();
      const todayNum   = now.getDate();
      const todayMonth = now.getMonth() + 1;
      const todayYear  = now.getFullYear();

      const isToday = (dayNum === todayNum && currentBulan === todayMonth && currentTahun === todayYear);
      const isPastDate = (new Date(currentTahun, currentBulan - 1, dayNum) < new Date(todayYear, todayMonth - 1, todayNum));

      if (isHoliday) {
        container.innerHTML = `
          <div class="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200/80 p-8 text-center space-y-3">
            <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-sm">
              <i class="fa-solid fa-umbrella-beach"></i>
            </div>
            <div>
              <span class="px-3 py-1 bg-rose-600 text-white font-bold rounded-full text-[11px] uppercase tracking-wider">HARI LIBUR (Bebas Tugas)</span>
              <h3 class="text-lg font-black text-slate-900 mt-2">${escapeHtml(fullDateStr)}</h3>
              <p class="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Hari <strong>${hariName}</strong> adalah hari libur kerja. Seluruh kegiatan checklist monitoring tidak wajib diisi pada hari ini.
              </p>
            </div>
          </div>
        `;
        return;
      }

      const grouped = {};
      items.forEach(it => {
        const rName = it.ruangan || 'Umum';
        if (!grouped[rName]) grouped[rName] = [];
        grouped[rName].push(it);
      });

      let activeRedCount = 0;
      let doneTodayCount = 0;
      items.forEach(it => {
        const st = it.dailyStatus ? it.dailyStatus[dayNum] : '-';
        if (st === '0') activeRedCount++;
        if (st === '1') doneTodayCount++;
      });

      let html = `
        <div class="space-y-4">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="px-2.5 py-0.5 rounded-md ${isToday ? 'bg-brand-600 text-white font-bold' : 'bg-slate-100 text-slate-700 font-semibold'} text-xs">
                  ${isToday ? 'Hari Ini' : (isPastDate ? 'Tanggal Lampau' : 'Tanggal Mendatang')}
                </span>
                <span class="text-xs font-bold text-slate-900">${escapeHtml(fullDateStr)}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                ${isToday
                  ? '<strong class="text-brand-600">Centang Hari Ini:</strong> Bebas tandai selesai atau batalkan jika terjadi salah klik.'
                  : '<strong class="text-slate-700">Tanggal Lampau:</strong> Data TRUE telah dikunci otomatis dan tidak dapat diubah.'}
              </p>
            </div>

            <div class="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <div class="text-right">
                <p class="text-xs font-bold text-slate-800">${doneTodayCount} Selesai / ${activeRedCount} Wajib Dicentang</p>
                <p class="text-[10px] text-slate-500 font-medium">Status Checklist Aktif</p>
              </div>
              <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-md">
                ${doneTodayCount}
              </div>
            </div>
          </div>
      `;

      Object.keys(grouped).forEach(rName => {
        const roomItems = grouped[rName];

        html += `
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-2">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-brand-600"></span>
                <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">${escapeHtml(rName)}</h4>
              </div>
            </div>

            <div class="space-y-2 pt-1">
        `;

        roomItems.forEach(item => {
          const st = item.dailyStatus ? item.dailyStatus[dayNum] : '-';
          const colIndex = (item.colMapping && item.colMapping[dayNum]) ? item.colMapping[dayNum] : (dayNum + 1);

          if (st === '1') {
            if (isToday) {
              html += `
                <div onclick="toggleCheck(${item.sheetRowIndex}, ${colIndex}, false, ${dayNum})"
                  title="Klik untuk membatalkan centang (TRUE -> FALSE)"
                  class="group flex items-center justify-between p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-rose-50/80 hover:border-rose-300 cursor-pointer transition-all active:scale-[0.99] shadow-2xs">
                  <div class="flex items-center space-x-3 min-w-0 pr-2">
                    <div class="w-7 h-7 rounded-lg bg-emerald-500 group-hover:bg-rose-500 text-white flex items-center justify-center text-xs flex-shrink-0 transition-colors shadow-xs">
                      <i class="fa-solid fa-check group-hover:hidden"></i>
                      <i class="fa-solid fa-xmark hidden group-hover:inline"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-800 line-through group-hover:no-underline decoration-slate-400 truncate">
                      ${escapeHtml(item.kegiatan)}
                    </span>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-100 group-hover:bg-rose-100 text-emerald-800 group-hover:text-rose-700 text-[10px] font-bold flex-shrink-0 transition-colors">
                    <span class="group-hover:hidden">✓ TRUE (Bisa Batal)</span>
                    <span class="hidden group-hover:inline">Batalkan Centang</span>
                  </span>
                </div>
              `;
            } else {
              html += `
                <div class="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 cursor-not-allowed transition-all opacity-95">
                  <div class="flex items-center space-x-3 min-w-0 pr-2">
                    <div class="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                      <i class="fa-solid fa-check"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-800 line-through decoration-slate-400 truncate">
                      ${escapeHtml(item.kegiatan)}
                    </span>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold flex-shrink-0 flex items-center gap-1">
                    <i class="fa-solid fa-lock text-[9px]"></i>
                    <span>🔒 TRUE (Dikunci)</span>
                  </span>
                </div>
              `;
            }
          } else if (st === '0') {
            html += `
              <div onclick="toggleCheck(${item.sheetRowIndex}, ${colIndex}, true, ${dayNum})"
                class="group flex items-center justify-between p-3.5 rounded-xl border-2 border-rose-200 bg-rose-50/40 hover:border-emerald-500 hover:bg-emerald-50/40 cursor-pointer transition-all active:scale-[0.99] shadow-2xs">
                <div class="flex items-center space-x-3 min-w-0 pr-2">
                  <div class="w-7 h-7 rounded-lg border-2 border-rose-400 group-hover:border-emerald-500 bg-white flex items-center justify-center text-xs text-transparent group-hover:text-emerald-600 flex-shrink-0 transition-all">
                    <i class="fa-solid fa-check"></i>
                  </div>
                  <span class="text-xs font-medium text-slate-900 group-hover:text-emerald-900 leading-snug">
                    ${escapeHtml(item.kegiatan)}
                  </span>
                </div>
                <button class="px-3 py-1.5 rounded-lg bg-rose-600 group-hover:bg-emerald-600 text-white text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 shadow-xs">
                  <span>Centang Selesai</span>
                  <i class="fa-solid fa-check text-[10px]"></i>
                </button>
              </div>
            `;
          } else {
            html += `
              <div class="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 bg-slate-50 text-slate-400 opacity-60">
                <div class="flex items-center space-x-3 min-w-0 pr-2">
                  <span class="w-7 text-center font-bold text-slate-300">—</span>
                  <span class="text-xs font-medium text-slate-500 truncate">${escapeHtml(item.kegiatan)}</span>
                </div>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/60 text-slate-500">Bebas Tugas</span>
              </div>
            `;
          }
        });

        html += `</div></div>`;
      });

      html += `</div>`;
      container.innerHTML = html;
    }

/**
     * TAMPILAN MATRIKS TABEL (Dengan Week-Based Pagination agar pas 1 layar tanpa scroll)
     */
    function renderTableMatrixView(container, items, targetDays, weekGroups = null) {
      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);

      const now = new Date();
      const todayNum   = now.getDate();
      const todayMonth = now.getMonth() + 1;
      const todayYear  = now.getFullYear();

      let pagedDays = [];
      let totalPages = 1;

      if (weekGroups && weekGroups.length > 0) {
        totalPages = weekGroups.length;
        tableCurrentPage = Math.min(tableCurrentPage, totalPages);
        pagedDays = weekGroups[tableCurrentPage - 1] || [];
      } else {
        pagedDays = targetDays || [];
        totalPages = 1;
        tableCurrentPage = 1;
      }

      let html = `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
          <div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs">
            <div class="flex items-center space-x-2">
              <span class="font-bold text-slate-700">Tanggal Ditampilkan:</span>
              <span class="px-2.5 py-0.5 rounded-md bg-brand-100 text-brand-800 font-bold">
                Tgl ${pagedDays[0] || ''} s/d ${pagedDays[pagedDays.length - 1] || ''}
              </span>
            </div>

            ${totalPages > 1 ? `
              <div class="flex items-center space-x-2">
                <span class="text-slate-500 font-medium hidden sm:inline">Minggu ${tableCurrentPage} dari ${totalPages}</span>
                <button onclick="changeTablePage(-1, ${totalPages})" ${tableCurrentPage === 1 ? 'disabled class="px-2.5 py-1 bg-slate-100 text-slate-300 rounded-lg cursor-not-allowed"' : 'class="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-bold shadow-2xs"'}>
                  <i class="fa-solid fa-chevron-left mr-1"></i>Sebelumnya
                </button>
                <button onclick="changeTablePage(1, ${totalPages})" ${tableCurrentPage === totalPages ? 'disabled class="px-2.5 py-1 bg-slate-100 text-slate-300 rounded-lg cursor-not-allowed"' : 'class="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-bold shadow-2xs"'}>
                  Selanjutnya<i class="fa-solid fa-chevron-right ml-1"></i>
                </button>
              </div>
            ` : ''}
          </div>

          <div class="w-full overflow-hidden rounded-xl border border-slate-200">
            <table class="w-full text-left border-collapse table-fixed text-xs">
              <thead class="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th class="p-2 w-8 text-center">No</th>
                  <th class="p-2 w-28 sm:w-36">Ruangan</th>
                  <th class="p-2">Kegiatan</th>
      `;

      pagedDays.forEach(d => {
        const dateObj = new Date(currentTahun, currentBulan - 1, d);
        const dow = dateObj.getDay();
        const isHol = (dow === 0 || dow === 6);
        const hariStr = HARI_SHORT[dow] || '';

        html += `
          <th class="p-1 text-center w-10 sm:w-12 ${isHol ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}">
            <div class="text-[9px] font-semibold uppercase leading-none">${hariStr}</div>
            <div class="text-xs font-black mt-0.5">${d}</div>
          </th>
        `;
      });

      html += `
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
      `;

      items.forEach((item, idx) => {
        html += `
          <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="p-2 text-center font-bold text-slate-400 text-[11px]">${idx + 1}</td>
            <td class="p-2 font-semibold text-slate-800 truncate" title="${escapeHtml(item.ruangan)}">
              <span class="px-1.5 py-0.5 rounded text-[10px] badge-ruang truncate inline-block max-w-full">
                ${escapeHtml(item.ruangan)}
              </span>
            </td>
            <td class="p-2 font-medium text-slate-800">
              <div class="truncate" title="${escapeHtml(item.kegiatan)}">${escapeHtml(item.kegiatan)}</div>
            </td>
        `;

        pagedDays.forEach(d => {
          const dateObj = new Date(currentTahun, currentBulan - 1, d);
          const dow = dateObj.getDay();
          const isHoliday = (dow === 0 || dow === 6);
          const isToday = (d === todayNum && currentBulan === todayMonth && currentTahun === todayYear);
          const isPastDate = (dateObj < new Date(todayYear, todayMonth - 1, todayNum));

          const st = item.dailyStatus ? item.dailyStatus[d] : '-';
          const colIndex = (item.colMapping && item.colMapping[d]) ? item.colMapping[d] : (d + 1);

          if (isHoliday) {
            html += `<td class="p-1 text-center bg-rose-50/50 text-[10px] font-bold text-rose-400">Libur</td>`;
          } else if (st === '1') {
            if (isToday) {
              html += `
                <td class="p-1 text-center">
                  <div onclick="toggleCheck(${item.sheetRowIndex}, ${colIndex}, false, ${d})"
                    title="Sudah tercentang (Klik untuk batalkan)"
                    class="check-cell w-5.5 h-5.5 mx-auto rounded bg-emerald-500 text-white flex items-center justify-center text-[10px] cursor-pointer shadow-2xs hover:bg-rose-500 transition-colors">
                    <i class="fa-solid fa-check"></i>
                  </div>
                </td>
              `;
            } else {
              html += `
                <td class="p-1 text-center">
                  <div title="🔒 Dikunci (Tanggal Lampau)"
                    class="check-cell locked w-5.5 h-5.5 mx-auto rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] cursor-not-allowed opacity-90">
                    <i class="fa-solid fa-check"></i>
                  </div>
                </td>
              `;
            }
          } else if (st === '0') {
            html += `
              <td class="p-1 text-center">
                <div onclick="toggleCheck(${item.sheetRowIndex}, ${colIndex}, true, ${d})"
                  title="Wajib Dicentang (FALSE -> TRUE)"
                  class="check-cell w-5.5 h-5.5 mx-auto rounded bg-rose-100 border-2 border-rose-500 text-transparent hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer flex items-center justify-center text-[10px]">
                  <i class="fa-solid fa-check"></i>
                </div>
              </td>
            `;
          } else {
            html += `<td class="p-1 text-center text-slate-300 font-bold">—</td>`;
          }
        });

        html += `</tr>`;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
      container.innerHTML = html;
    }

/**
     * Eksekusi Toggle Checklist Status (Handling Same-Day Cancellation & Past-Day Locks)
     */
    async function toggleCheck(sheetRowIndex, colIndex, newStatus, dayNum) {
      if (!cachedMonitoringData || !cachedMonitoringData.items) return;
      const item = cachedMonitoringData.items.find(i => i.sheetRowIndex === sheetRowIndex);
      if (!item || dayNum === undefined) return;

      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);

      const now = new Date();
      const todayNum   = now.getDate();
      const todayMonth = now.getMonth() + 1;
      const todayYear  = now.getFullYear();

      const isToday = (dayNum === todayNum && currentBulan === todayMonth && currentTahun === todayYear);
      const cellDate = new Date(currentTahun, currentBulan - 1, dayNum);
      const currentDate = new Date(todayYear, todayMonth - 1, todayNum);
      const isPastDate = (cellDate < currentDate);

      const st = item.dailyStatus ? item.dailyStatus[dayNum] : '-';

      if (isPastDate && st === '1') {
        showToast("Data pada tanggal lampau yang sudah terisi (TRUE) dikunci dan tidak dapat diubah.", "info");
        return;
      }

      const targetStatusStr = newStatus ? '1' : '0';
      const oldStatus = item.dailyStatus[dayNum];
      item.dailyStatus[dayNum] = targetStatusStr;

      if (oldStatus === '0' && targetStatusStr === '1') {
        item.selesaiCount = Math.min(item.totalHariAktif, item.selesaiCount + 1);
        showToast("Berhasil menandai kegiatan selesai!", "success");
      } else if (oldStatus === '1' && targetStatusStr === '0') {
        item.selesaiCount = Math.max(0, item.selesaiCount - 1);
        showToast("Centang dibatalkan (dikembalikan ke Belum Selesai).", "info");
      }

      renderMonitoringView();

      try {
        const res = await callBackend('updateMonitoringStatus', {
          token: sessionToken,
          sheetRowIndex: sheetRowIndex,
          colIndex: colIndex,
          newStatus: newStatus,
          dayNum: dayNum,
          bulan: currentBulan,
          tahun: currentTahun
        });
        if (!res || !res.success) {
          showToast((res && res.message) ? res.message : "Gagal menyimpan ke spreadsheet.", "error");
          refreshCurrentPage();
        }
      } catch (err) {
        showToast("Kesalahan server: " + err.message, "error");
        refreshCurrentPage();
      }
    }
