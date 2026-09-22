/**
 * ========================================================================
 * SIMPEL-KU - SECURITY SHIFT MANAGEMENT CONTROLLER
 * ========================================================================
 */

async function loadJadwalPiketSecurityMatrix(forceRefresh = false) {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      const cacheKey = `${bulan}_${tahun}`;

      if (!forceRefresh && window._managerDataCache.security[cacheKey]) {
        cachedSecurityMatrix = window._managerDataCache.security[cacheKey];
        renderSecurityShiftMatrixUI(cachedSecurityMatrix);
        return;
      }

      showLoader(true);
      try {
        const res = await callBackend('getJadwalPiketSecurityMatrix', { token: sessionToken, bulan, tahun });
        showLoader(false);
        if (res && res.success) {
          window._managerDataCache.security[cacheKey] = res.data;
          cachedSecurityMatrix = res.data;
          renderSecurityShiftMatrixUI(res.data);
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast('Gagal memuat jadwal shift security: ' + err.message, 'error');
      }
    }

function renderSecurityShiftMatrixUI(data) {
      if (!data || !data.officers || !data.officers.length) {
        const mc = document.getElementById('securityMatrixContainer');
        if (mc) mc.innerHTML = '<div class="py-12 text-center text-slate-400 text-xs">Tidak ada data jadwal piket security bulan ini.</div>';
        return;
      }

      const officers = data.officers;
      const schedCols = data.schedCols || [];
      const daysInMonth = schedCols.length || 30;

      if (secActiveOfficerIdx >= officers.length) secActiveOfficerIdx = 0;
      if (secActiveDayNum < 1 || secActiveDayNum > daysInMonth) secActiveDayNum = 1;

      // 1. Render Tabs Pilih Petugas Satpam
      const tabsContainer = document.getElementById('secOfficerTabsContainer');
      if (tabsContainer) {
        tabsContainer.innerHTML = officers.map((off, idx) => {
          const isAct = (idx === secActiveOfficerIdx);
          return `
            <button type="button" onclick="selectSecurityOfficer(${idx})" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${isAct ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
              <i class="fa-solid fa-user-shield"></i>
              <span>${escapeHtml(off.namaPegawai)}</span>
            </button>
          `;
        }).join('');
      }

      // 2. Render Card Active Officer
      renderActiveOfficerDailyView();

      // 3. Render Full Monthly Matrix Table
      const matrixContainer = document.getElementById('securityMatrixContainer');
      if (matrixContainer) {
        let theadHtml = `
          <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th class="py-2.5 px-3 sticky left-0 bg-slate-50 z-20 whitespace-nowrap">Nama Petugas</th>
              ${schedCols.map(c => `<th class="py-2.5 px-2 text-center w-8 ${c.hari === 'MIN' || c.hari === 'SAB' ? 'bg-rose-50 text-rose-600' : ''}">${c.tanggal}<br><span class="text-[9px] font-normal">${c.hari || ''}</span></th>`).join('')}
              <th class="py-2.5 px-3 text-center bg-slate-100 whitespace-nowrap">Total Kerja</th>
            </tr>
          </thead>
        `;

        let tbodyHtml = `<tbody class="divide-y divide-slate-100">`;
        officers.forEach((off, idx) => {
          const isCurrentOfficer = (idx === secActiveOfficerIdx);
          tbodyHtml += `
            <tr class="hover:bg-slate-50 transition ${isCurrentOfficer ? 'bg-amber-50/60' : ''}">
              <td class="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap text-xs sticky left-0 bg-white z-10">
                <button type="button" onclick="selectSecurityOfficer(${idx})" class="text-left hover:text-amber-600 flex items-center gap-1.5 font-bold">
                  <span class="w-2 h-2 rounded-full ${isCurrentOfficer ? 'bg-amber-500' : 'bg-slate-300'}"></span>
                  ${escapeHtml(off.namaPegawai)}
                </button>
              </td>
              ${(off.schedule || []).map(s => {
                const isSelectedCell = (isCurrentOfficer && s.tanggal === secActiveDayNum);
                const shiftColor = s.kodeShift === 'P' ? 'bg-blue-100 text-blue-700 font-bold' : (s.kodeShift === 'S' ? 'bg-amber-100 text-amber-700 font-bold' : (s.kodeShift === 'M' ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-300 font-medium'));
                return `
                  <td class="py-2 px-1 text-center text-xs ${isSelectedCell ? 'ring-2 ring-amber-500 rounded' : ''}">
                    <button type="button" onclick="selectSecurityOfficerAndDay(${idx}, ${s.tanggal})" class="w-7 h-7 rounded-lg inline-flex items-center justify-center ${shiftColor} hover:scale-110 transition cursor-pointer">
                      ${s.kodeShift}
                    </button>
                  </td>
                `;
              }).join('')}
              <td class="py-2.5 px-3 text-center font-bold font-mono text-slate-800 bg-slate-50/60">
                ${off.summary ? off.summary.totalHariKerja : 0} Hari
              </td>
            </tr>
          `;
        });
        tbodyHtml += `</tbody>`;

        matrixContainer.innerHTML = `
          <table class="w-full text-left text-xs text-slate-600 border-collapse">
            ${theadHtml}
            ${tbodyHtml}
          </table>
        `;
      }
    }

function selectSecurityOfficer(idx) {
      secActiveOfficerIdx = idx;
      renderSecurityShiftMatrixUI(cachedSecurityMatrix);
    }

function selectSecurityOfficerAndDay(idx, dayNum) {
      secActiveOfficerIdx = idx;
      secActiveDayNum = dayNum;
      renderSecurityShiftMatrixUI(cachedSecurityMatrix);
      const editPanel = document.getElementById('secEditPanelTitle');
      if (editPanel) editPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

function renderActiveOfficerDailyView() {
      if (!cachedSecurityMatrix || !cachedSecurityMatrix.officers) return;
      const officer = cachedSecurityMatrix.officers[secActiveOfficerIdx];
      if (!officer) return;

      const schedCols = cachedSecurityMatrix.schedCols || [];
      const currentDaySched = (officer.schedule || []).find(s => s.tanggal === secActiveDayNum) || { kodeShift: 'O' };

      // Set Panel Titles
      const pTitle = document.getElementById('secEditPanelTitle');
      if (pTitle) pTitle.innerText = `Ubah Jadwal: ${officer.namaPegawai} (Tgl ${secActiveDayNum})`;

      const offLabel = document.getElementById('secSelectedOfficerLabel');
      if (offLabel) offLabel.innerText = officer.namaPegawai;

      const pSub = document.getElementById('secEditPanelSubtitle');
      if (pSub) pSub.innerText = `Pilih shift baru di bawah ini untuk langsung menyimpan perubahan shift ke spreadsheet.`;

      // Set Badge Current Shift
      const curBadgeContainer = document.getElementById('secCurrentShiftBadgeContainer');
      if (curBadgeContainer) {
        const k = currentDaySched.kodeShift || 'O';
        const labels = { 'P': 'Shift Pagi (06.00 - 16.00)', 'S': 'Shift Sore (15.30 - 23.30)', 'M': 'Shift Malam (23.00 - 07.30)', 'O': 'Libur / Lepas Piket' };
        const colors = { 'P': 'bg-blue-100 text-blue-800 border-blue-200', 'S': 'bg-amber-100 text-amber-800 border-amber-200', 'M': 'bg-purple-100 text-purple-800 border-purple-200', 'O': 'bg-slate-100 text-slate-600 border-slate-200' };
        curBadgeContainer.innerHTML = `
          <span class="px-3 py-1 rounded-xl text-xs font-bold border ${colors[k] || colors['O']}">
            Shift Sekarang: [${k}] ${labels[k] || 'Libur'}
          </span>
        `;
      }

      // Summary Count Cards for this Officer
      if (officer.summary) {
        const cp = document.getElementById('secCardPagi');
        if (cp) cp.innerText = `${officer.summary.P || 0} Hari`;
        const cs = document.getElementById('secCardSore');
        if (cs) cs.innerText = `${officer.summary.S || 0} Hari`;
        const cm = document.getElementById('secCardMalam');
        if (cm) cm.innerText = `${officer.summary.M || 0} Hari`;
        const cl = document.getElementById('secCardLibur');
        if (cl) cl.innerText = `${officer.summary.O || 0} Hari`;
      }

      // Render Day Selector Carousel for active officer
      const daySelector = document.getElementById('secDayPillsContainer') || document.getElementById('secDaysSelectorGrid');
      if (daySelector) {
        daySelector.innerHTML = schedCols.map(col => {
          const sObj = (officer.schedule || []).find(s => s.tanggal === col.tanggal) || { kodeShift: 'O' };
          const isActDay = (col.tanggal === secActiveDayNum);
          const shiftBadgeColor = sObj.kodeShift === 'P' ? 'bg-blue-500 text-white' : (sObj.kodeShift === 'S' ? 'bg-amber-500 text-white' : (sObj.kodeShift === 'M' ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-500'));
          return `
            <button type="button" onclick="selectSecDay(${col.tanggal})" class="px-3 py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition flex-shrink-0 cursor-pointer ${isActDay ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}">
              <span class="text-[10px] opacity-80 uppercase">${col.hari || ''}</span>
              <span class="font-bold text-sm my-0.5">${col.tanggal}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${isActDay ? 'bg-white text-amber-800' : shiftBadgeColor}">
                ${sObj.kodeShift}
              </span>
            </button>
          `;
        }).join('');
      }

      // Preselect Choice
      selectQuickShiftChoice(currentDaySched.kodeShift || 'P');
    }

function selectSecDay(d) {
      secActiveDayNum = d;
      renderActiveOfficerDailyView();
      renderSecurityShiftMatrixUI(cachedSecurityMatrix);
    }

function selectQuickShiftChoice(kode) {
      secPendingShiftChoice = kode;
      ['P', 'S', 'M', 'O'].forEach(k => {
        const btn = document.getElementById('btnChoice' + k);
        if (!btn) return;
        const radio = btn.querySelector('.choice-radio');
        if (k === kode) {
          btn.classList.add('border-amber-500', 'ring-2', 'ring-amber-200', 'bg-amber-50/40');
          btn.classList.remove('border-slate-200');
          if (radio) radio.innerHTML = '<i class="fa-solid fa-circle text-[8px] text-amber-600"></i>';
        } else {
          btn.classList.remove('border-amber-500', 'ring-2', 'ring-amber-200', 'bg-amber-50/40');
          btn.classList.add('border-slate-200');
          if (radio) radio.innerHTML = '';
        }
      });
    }

async function submitDirectShiftChange() {
      if (!cachedSecurityMatrix || !cachedSecurityMatrix.officers) return;
      const officer = cachedSecurityMatrix.officers[secActiveOfficerIdx];
      if (!officer) return;

      const nama = officer.namaPegawai;
      const tanggal = secActiveDayNum;
      const shiftBaru = secPendingShiftChoice;
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;

      const btn = document.getElementById('btnSaveDirectShift');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      }

      showLoader(true);
      try {
        const res = await callBackend('updateSecurityShift', {
          token: sessionToken,
          namaPegawai: nama,
          tanggal: tanggal,
          shiftBaru: shiftBaru,
          bulan: bulan,
          tahun: tahun
        });
        showLoader(false);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan Shift';
        }

        if (res && res.success) {
          showToast(res.message || 'Jadwal shift berhasil diperbarui!', 'success');
          clearManagerClientCache();
          loadJadwalPiketSecurityMatrix(true);
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan Shift';
        }
        showToast('Gagal mengubah shift: ' + err.message, 'error');
      }
    }

async function submitEditShift() {
  const nama = document.getElementById('editShiftNama')?.value;
  const tanggal = parseInt(document.getElementById('editShiftTanggal')?.value);
  const shiftBaru = document.getElementById('editShiftSelect')?.value;
  const bulan = document.getElementById('globalMonthSelect')?.value;
  const tahun = document.getElementById('globalYearSelect')?.value;

  if (!nama || !tanggal || !shiftBaru) {
    showToast('Harap lengkapi data shift.', 'error');
    return;
  }

  showLoader(true);
  try {
    const res = await callBackend('updateSecurityShift', {
      token: sessionToken,
      namaPegawai: nama,
      tanggal: tanggal,
      shiftBaru: shiftBaru,
      bulan: bulan,
      tahun: tahun
    });
    showLoader(false);
    if (res && res.success) {
      showToast(res.message || 'Shift berhasil diperbarui!', 'success');
      closeModal('modalEditShift');
      clearManagerClientCache();
      loadJadwalPiketSecurityMatrix(true);
    } else {
      handleApiError(res);
    }
  } catch (err) {
    showLoader(false);
    showToast('Gagal mengubah shift: ' + err.message, 'error');
  }
}

async function submitSwapShift() {
  const nama1 = document.getElementById('swapNama1')?.value;
  const tgl1 = parseInt(document.getElementById('swapTgl1')?.value);
  const nama2 = document.getElementById('swapNama2')?.value;
  const tgl2 = parseInt(document.getElementById('swapTgl2')?.value);
  const bulan = document.getElementById('globalMonthSelect')?.value;
  const tahun = document.getElementById('globalYearSelect')?.value;

  if (!nama1 || !tgl1 || !nama2 || !tgl2) {
    showToast('Harap lengkapi data swap shift.', 'error');
    return;
  }

  showLoader(true);
  try {
    const res = await callBackend('swapSecurityShift', {
      token: sessionToken,
      petugas1: { namaPegawai: nama1, tanggal: tgl1 },
      petugas2: { namaPegawai: nama2, tanggal: tgl2 },
      bulan: bulan,
      tahun: tahun
    });
    showLoader(false);
    if (res && res.success) {
      showToast(res.message || 'Shift berhasil ditukar!', 'success');
      closeModal('modalSwapShift');
      clearManagerClientCache();
      loadJadwalPiketSecurityMatrix(true);
    } else {
      handleApiError(res);
    }
  } catch (err) {
    showLoader(false);
    showToast('Gagal swap shift: ' + err.message, 'error');
  }
}
