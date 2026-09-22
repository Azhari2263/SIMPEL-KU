/**
 * ========================================================================
 * SIMPEL-KU - STAFF SECURITY CONTROLLER
 * ========================================================================
 */

/**
     * =========================================================================
     * KEAMANAN VIEW & REKAP & DASHBOARD
     * =========================================================================
     */
    async function loadJadwalKeamanan() {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      showLoader(true);

      try {
        const res = await callBackend('getJadwalKeamanan', {
          token: sessionToken,
          bulan: bulan,
          tahun: tahun
        });
        showLoader(false);
        if (res && res.success) {
          cachedKeamananData = res.data;
          initKeamananSelectedDay();
          renderJadwalKeamananUI();
        } else {
          const msg = (res && res.message) ? res.message : 'Gagal memuat jadwal keamanan.';
          document.getElementById('keamananScheduleContainer').innerHTML =
            `<div class="text-center py-10 text-xs text-rose-500"><i class="fa-solid fa-circle-exclamation mr-1"></i>${escapeHtml(msg)}</div>`;
          showToast(msg, 'error');
        }
      } catch (err) {
        showLoader(false);
        showToast('Gagal memuat jadwal: ' + err.message, 'error');
      }
    }

function initKeamananSelectedDay() {
      if (!cachedKeamananData || !cachedKeamananData.jadwal || cachedKeamananData.jadwal.length === 0) {
        selectedKeamananDay = 1;
        return;
      }
      const today = new Date();
      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);
      if (today.getMonth() + 1 === currentBulan && today.getFullYear() === currentTahun) {
        const foundDay = cachedKeamananData.jadwal.find(j => j.tanggal === today.getDate());
        selectedKeamananDay = foundDay ? today.getDate() : cachedKeamananData.jadwal[0].tanggal;
      } else {
        selectedKeamananDay = cachedKeamananData.jadwal[0].tanggal;
      }
    }

function selectKeamananDay(dayNum) {
      selectedKeamananDay = dayNum;
      renderJadwalKeamananUI();
    }

function renderJadwalKeamananUI() {
      if (!cachedKeamananData) return;
      const d = cachedKeamananData;

      document.getElementById('kSum-total').innerText = d.totalHariKerja || 0;
      document.getElementById('kSum-pagi').innerText  = (d.summary && d.summary.P) || 0;
      document.getElementById('kSum-sore').innerText  = (d.summary && d.summary.S) || 0;
      document.getElementById('kSum-malam').innerText = (d.summary && d.summary.M) || 0;

      const scheduleContainer = document.getElementById('keamananScheduleContainer');
      if (!d.jadwal || d.jadwal.length === 0) {
        scheduleContainer.innerHTML = `<div class="text-center py-10 text-xs text-slate-400">Tidak ada data jadwal untuk bulan ini.</div>`;
        document.getElementById('keamananTaskListContainer').innerHTML = '';
        return;
      }

      const SHIFT_STYLE = {
        'P': { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500',   label: 'Pagi'  },
        'S': { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500',  label: 'Sore'  },
        'M': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', label: 'Malam' },
        'O': { bg: 'bg-slate-100',  text: 'text-slate-400',  border: 'border-slate-200',  dot: 'bg-slate-300',  label: 'Libur' }
      };

      const HARI_MAP = {
        'Sen': 'Senin', 'Sel': 'Selasa', 'Ra': 'Rabu', 'Ka': 'Kamis',
        'Ju': 'Jumat',  'Sa': 'Sabtu',   'Mi': 'Minggu'
      };

      let html = '<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 overflow-x-auto pb-1">';

      d.jadwal.forEach(item => {
        const kode  = item.kodeShift || 'O';
        const style = SHIFT_STYLE[kode] || SHIFT_STYLE['O'];
        const isSelected = (item.tanggal === selectedKeamananDay);
        const isLibur = (kode === 'O');
        const hariLengkap = HARI_MAP[item.hari] || item.hari || '';

        let isDoneCount = 0;
        let dayTaskTotal = 0;
        if (d.taskItems && !isLibur) {
          const shiftTasks = d.taskItems.filter(t => {
            const rUpper = String(t.ruangan || '').toUpperCase();
            if (kode === 'P') return rUpper.includes('PAGI') || rUpper.includes('JAM KERJA');
            if (kode === 'S' || kode === 'M') return rUpper.includes('MALAM');
            return false;
          });
          dayTaskTotal = shiftTasks.length;
          isDoneCount = shiftTasks.filter(t => t.dailyStatus && (t.dailyStatus[item.tanggal] === '1' || t.dailyStatus[item.tanggal] === 1)).length;
        }

        html += `
          <div onclick="selectKeamananDay(${item.tanggal})"
            class="rounded-xl border transition-all cursor-pointer p-2.5 flex flex-col justify-between ${
              isSelected
                ? 'bg-gradient-to-b from-indigo-50/90 to-blue-50/60 border-indigo-500 shadow-md ring-2 ring-indigo-400/50 scale-[1.02]'
                : isLibur
                  ? 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-100/60 opacity-60'
                  : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-xs'
            }">
            <div class="flex items-start justify-between">
              <span class="text-lg font-black ${isSelected ? 'text-indigo-900' : (isLibur ? 'text-slate-400' : 'text-slate-800')} leading-none">${item.tanggal}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}">
                ${style.label}
              </span>
            </div>
            <div class="mt-1.5 flex items-center justify-between text-[10px]">
              <span class="font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-400'}">${escapeHtml(hariLengkap)}</span>
              ${!isLibur && dayTaskTotal > 0 ? `
                <span class="font-bold ${isDoneCount === dayTaskTotal ? 'text-emerald-600' : 'text-slate-400'}">
                  ${isDoneCount}/${dayTaskTotal}
                </span>
              ` : ''}
            </div>
          </div>
        `;
      });

      html += '</div>';
      scheduleContainer.innerHTML = html;

      const taskContainer = document.getElementById('keamananTaskListContainer');
      const shiftObj = d.jadwal.find(j => j.tanggal === selectedKeamananDay) || { tanggal: selectedKeamananDay, hari: '', kodeShift: 'O' };
      const shiftKode = shiftObj.kodeShift || 'O';
      const shiftStyle = SHIFT_STYLE[shiftKode] || SHIFT_STYLE['O'];
      const hariStr = HARI_MAP[shiftObj.hari] || shiftObj.hari || '';

      const bulanSelect = document.getElementById('globalMonthSelect');
      const bulanText = bulanSelect.options[bulanSelect.selectedIndex] ? bulanSelect.options[bulanSelect.selectedIndex].text : '';
      const tahunText = document.getElementById('globalYearSelect').value;
      const fullDateStr = `${hariStr}, ${selectedKeamananDay} ${bulanText} ${tahunText}`;

      let shiftTitleStr = '';
      let shiftDescStr = '';
      if (shiftKode === 'P') {
        shiftTitleStr = 'Shift Pagi (06.00 – 16.00)';
        shiftDescStr = 'Menampilkan tugas bagian: PAGI (06.00–07.30) dan SELAMA JAM KERJA (07.30–16.00)';
      } else if (shiftKode === 'S') {
        shiftTitleStr = 'Shift Sore (15.30 – 23.30)';
        shiftDescStr = 'Menampilkan tugas bagian: MALAM';
      } else if (shiftKode === 'M') {
        shiftTitleStr = 'Shift Malam (23.00 – 07.30)';
        shiftDescStr = 'Menampilkan tugas bagian: MALAM';
      } else {
        shiftTitleStr = 'Status: LIBUR (Bebas Tugas)';
        shiftDescStr = 'Tidak ada tugas yang harus dikerjakan pada hari libur.';
      }

      const allTasks = d.taskItems || [];
      let filteredTasks = [];
      if (shiftKode === 'P') {
        filteredTasks = allTasks.filter(t => {
          const rUpper = String(t.ruangan || '').toUpperCase();
          return rUpper.includes('PAGI') || rUpper.includes('JAM KERJA');
        });
      } else if (shiftKode === 'S' || shiftKode === 'M') {
        filteredTasks = allTasks.filter(t => {
          const rUpper = String(t.ruangan || '').toUpperCase();
          return rUpper.includes('MALAM');
        });
      }

      const totalCount = filteredTasks.length;
      const completedCount = filteredTasks.filter(t => t.dailyStatus && (t.dailyStatus[selectedKeamananDay] === '1' || t.dailyStatus[selectedKeamananDay] === 1)).length;
      const percentVal = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      let taskHtml = `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${shiftStyle.bg} ${shiftStyle.text} border ${shiftStyle.border}">
                  <span class="w-1.5 h-1.5 rounded-full ${shiftStyle.dot} inline-block mr-1"></span>
                  ${shiftTitleStr}
                </span>
                <span class="text-xs font-semibold text-slate-700">${escapeHtml(fullDateStr)}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1.5">${escapeHtml(shiftDescStr)}</p>
            </div>
            ${shiftKode !== 'O' && totalCount > 0 ? `
              <div class="sm:text-right">
                <span class="text-xs font-bold text-slate-700">Pencapaian: ${completedCount}/${totalCount} Selesai (${percentVal}%)</span>
                <div class="w-36 bg-slate-100 rounded-full h-2 mt-1 sm:ml-auto">
                  <div class="bg-emerald-500 h-2 rounded-full transition-all duration-300" style="width: ${percentVal}%"></div>
                </div>
              </div>
            ` : ''}
          </div>
      `;

      if (shiftKode === 'O') {
        taskHtml += `
          <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center space-y-3">
            <div class="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              <i class="fa-solid fa-umbrella-beach text-indigo-400"></i>
            </div>
            <h4 class="text-sm font-bold text-slate-800">Status: LIBUR (Bebas Tugas)</h4>
            <p class="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Anda tidak memiliki jadwal shift piket keamanan pada <strong class="text-slate-700">${escapeHtml(fullDateStr)}</strong>.
            </p>
          </div>
        `;
      } else if (filteredTasks.length === 0) {
        taskHtml += `<div class="p-6 text-center text-slate-400 text-xs">Tidak ada item tugas untuk shift ini.</div>`;
      } else {
        const grouped = {};
        filteredTasks.forEach(t => {
          const grpName = t.ruangan || 'TUGAS KEAMANAN';
          if (!grouped[grpName]) grouped[grpName] = [];
          grouped[grpName].push(t);
        });

        taskHtml += '<div class="space-y-4 pt-1">';
        Object.keys(grouped).forEach(grpName => {
          taskHtml += `
            <div class="space-y-2">
              <div class="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                <i class="fa-solid fa-list-check text-indigo-500"></i>
                <span>${escapeHtml(grpName)}</span>
              </div>
              <div class="space-y-2">
          `;

          grouped[grpName].forEach(item => {
            const isChecked = item.dailyStatus && (item.dailyStatus[selectedKeamananDay] === '1' || item.dailyStatus[selectedKeamananDay] === 1);
            const colIndex  = (item.colMapping && item.colMapping[selectedKeamananDay]) ? item.colMapping[selectedKeamananDay] : (selectedKeamananDay + 1);

            taskHtml += `
              <div onclick="toggleKeamananTaskCheck(${item.sheetRowIndex}, ${colIndex}, ${!isChecked}, ${selectedKeamananDay})"
                class="group flex items-start space-x-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-emerald-50/60 border-emerald-200/80' : 'bg-white border-slate-200/80 hover:border-brand-400'}">
                <div class="w-6 h-6 rounded-lg ${isChecked ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-transparent'} flex-shrink-0 flex items-center justify-center text-xs mt-0.5">
                  <i class="fa-solid fa-check text-[10px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium ${isChecked ? 'text-slate-700 line-through decoration-slate-400' : 'text-slate-800'} leading-relaxed">
                    ${escapeHtml(item.kegiatan)}
                  </p>
                </div>
              </div>
            `;
          });

          taskHtml += `</div></div>`;
        });
        taskHtml += '</div>';
      }

      taskHtml += '</div>';
      taskContainer.innerHTML = taskHtml;
    }

async function toggleKeamananTaskCheck(sheetRowIndex, colIndex, newStatus, dayNum) {
      if (cachedKeamananData && cachedKeamananData.taskItems) {
        const item = cachedKeamananData.taskItems.find(i => i.sheetRowIndex === sheetRowIndex);
        if (item) {
          if (!item.dailyStatus) item.dailyStatus = {};
          item.dailyStatus[dayNum] = newStatus ? '1' : '0';
        }
      }
      renderJadwalKeamananUI();
      showToast("Status tugas keamanan diperbarui!", "success");

      const currentBulan = Number(document.getElementById('globalMonthSelect').value);
      const currentTahun = Number(document.getElementById('globalYearSelect').value);

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
          showToast((res && res.message) ? res.message : 'Gagal menyimpan ke spreadsheet.', 'error');
          refreshCurrentPage();
        }
      } catch (err) {
        showToast('Kesalahan server: ' + err.message, 'error');
        refreshCurrentPage();
      }
    }
