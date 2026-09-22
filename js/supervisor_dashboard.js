/**
 * ========================================================================
 * SIMPEL-KU - SUPERVISOR & ADMIN DASHBOARD CONTROLLER
 * ========================================================================
 */

function clearManagerClientCache() {
      window._managerDataCache = {
        dashboard: {},
        monitoring: {},
        rekap: {},
        security: {},
        inspeksi: {}
      };
    }

async function loadSupervisorDashboardData(forceRefresh = false) {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      const cacheKey = `${bulan}_${tahun}`;

      if (!forceRefresh && window._managerDataCache.dashboard[cacheKey]) {
        renderSupervisorDashboardUI(window._managerDataCache.dashboard[cacheKey]);
        return;
      }

      showLoader(true);
      try {
        const res = await callBackend('getSupervisorDashboardData', { token: sessionToken, bulan, tahun });
        showLoader(false);
        if (res && res.success) {
          window._managerDataCache.dashboard[cacheKey] = res.data;
          renderSupervisorDashboardUI(res.data);
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast('Gagal memuat dashboard: ' + err.message, 'error');
      }
    }

function renderSupervisorDashboardUI(data) {
      if (!data) return;

      const total = Number(data.totalTarget || 0);
      const done = Number(data.totalSelesai !== undefined ? data.totalSelesai : (data.totalDone || 0));
      const belum = Number(data.totalBelum !== undefined ? data.totalBelum : Math.max(0, total - done));
      const safePct = (total > 0 && !isNaN(total)) ? Math.round((done / total) * 100) : (Number(data.persenSelesai || data.persen) || 0);

      // 1. KPI Card 1: Total Checklist Terpadu
      const kpiTotalEl = document.getElementById('supKpiTotalChecklist');
      if (kpiTotalEl) kpiTotalEl.innerText = `${safePct}%`;

      const kpiDetailEl = document.getElementById('supKpiDetailChecklist');
      if (kpiDetailEl) kpiDetailEl.innerText = `${done} / ${total} Checklist Selesai`;

      const kpiProgBar = document.getElementById('supKpiProgressChecklist');
      if (kpiProgBar) kpiProgBar.style.width = `${Math.min(100, Math.max(0, safePct))}%`;

      // 2. KPI Card 2: Rata-rata Skor Mutu
      const inspSum = data.inspeksiMutuSummary || {};
      const avgSkor = Number(inspSum.skorRataRata || 0);
      const kpiSkorEl = document.getElementById('supKpiSkorMutu');
      if (kpiSkorEl) kpiSkorEl.innerText = `${avgSkor.toFixed(1)} / 5.0`;

      const kpiMutuDetailEl = document.getElementById('supKpiDetailMutu');
      if (kpiMutuDetailEl) kpiMutuDetailEl.innerText = inspSum.kategori ? `Standar: ${inspSum.kategori}` : 'Audit Standar Mutu';

      const kpiStarsEl = document.getElementById('supKpiStars');
      if (kpiStarsEl) {
        const roundedStars = Math.round(avgSkor);
        let starHtml = '';
        for (let s = 1; s <= 5; s++) {
          if (s <= roundedStars) {
            starHtml += '<i class="fa-solid fa-star"></i>';
          } else {
            starHtml += '<i class="fa-regular fa-star text-slate-300"></i>';
          }
        }
        kpiStarsEl.innerHTML = starHtml;
      }

      // 3. KPI Card 3: Kesiapan Satpam Hari Ini
      const shiftSec = data.shiftSecurity || {};
      const satpamList = shiftSec.satpamTodayList || [];
      const satpamCount = satpamList.length;

      const kpiSatpamEl = document.getElementById('supKpiKesiapanSatpam');
      if (kpiSatpamEl) kpiSatpamEl.innerText = `${satpamCount} Petugas`;

      const kpiSatpamDetail = document.getElementById('supKpiDetailSatpam');
      if (kpiSatpamDetail) {
        const pCount = shiftSec.todayP !== undefined ? shiftSec.todayP : (shiftSec.petugasAktifHariIni?.P?.length || 0);
        const sCount = shiftSec.todayS !== undefined ? shiftSec.todayS : (shiftSec.petugasAktifHariIni?.S?.length || 0);
        const mCount = shiftSec.todayM !== undefined ? shiftSec.todayM : (shiftSec.petugasAktifHariIni?.M?.length || 0);
        kpiSatpamDetail.innerText = `Pagi: ${pCount} | Sore: ${sCount} | Malam: ${mCount}`;
      }

      // 4. KPI Card 4: Tugas Yang Harus Dikerjakan
      const kpiPerhatianEl = document.getElementById('supKpiPerhatian');
      const kpiPerhatianDetail = document.getElementById('supKpiDetailPerhatian');
      if (belum > 0) {
        if (kpiPerhatianEl) kpiPerhatianEl.innerText = `${belum} Tugas`;
        if (kpiPerhatianDetail) kpiPerhatianDetail.innerText = `${belum} tugas belum selesai bulan ini`;
      } else {
        if (kpiPerhatianEl) kpiPerhatianEl.innerText = 'Nihil';
        if (kpiPerhatianDetail) kpiPerhatianDetail.innerText = 'Semua Unit Memenuhi Target';
      }

      // 5. Unit Progress Cards
      const uSummary = data.unitSummary || {};

      // Kebersihan
      const uKeb = uSummary['Kebersihan'] || { total: 0, selesai: 0, done: 0, belum: 0, persen: 0 };
      const uKebDone = Number(uKeb.selesai !== undefined ? uKeb.selesai : (uKeb.done || 0));
      const uKebTotal = Number(uKeb.total || 0);
      const uKebPct = (uKebTotal > 0 && !isNaN(uKebTotal)) ? Math.round((uKebDone / uKebTotal) * 100) : (Number(uKeb.persen) || 0);
      
      const ukebPctEl = document.getElementById('supUnitKebersihanPct');
      if (ukebPctEl) ukebPctEl.innerText = `${uKebPct}%`;
      const ukebRatioEl = document.getElementById('supUnitKebersihanRatio');
      if (ukebRatioEl) ukebRatioEl.innerText = `${uKebDone} / ${uKebTotal} Selesai`;
      const ukebBar = document.getElementById('supUnitKebersihanBar');
      if (ukebBar) ukebBar.style.width = `${Math.min(100, Math.max(0, uKebPct))}%`;

      // Pelayanan
      const uPel = uSummary['Pelayanan'] || { total: 0, selesai: 0, done: 0, belum: 0, persen: 0 };
      const uPelDone = Number(uPel.selesai !== undefined ? uPel.selesai : (uPel.done || 0));
      const uPelTotal = Number(uPel.total || 0);
      const uPelPct = (uPelTotal > 0 && !isNaN(uPelTotal)) ? Math.round((uPelDone / uPelTotal) * 100) : (Number(uPel.persen) || 0);

      const upelPctEl = document.getElementById('supUnitPelayananPct');
      if (upelPctEl) upelPctEl.innerText = `${uPelPct}%`;
      const upelRatioEl = document.getElementById('supUnitPelayananRatio');
      if (upelRatioEl) upelRatioEl.innerText = `${uPelDone} / ${uPelTotal} Selesai`;
      const upelBar = document.getElementById('supUnitPelayananBar');
      if (upelBar) upelBar.style.width = `${Math.min(100, Math.max(0, uPelPct))}%`;

      // Keamanan
      const uKea = uSummary['Keamanan'] || { total: 0, selesai: 0, done: 0, belum: 0, persen: 0 };
      const uKeaDone = Number(uKea.selesai !== undefined ? uKea.selesai : (uKea.done || 0));
      const uKeaTotal = Number(uKea.total || 0);
      const uKeaPct = (uKeaTotal > 0 && !isNaN(uKeaTotal)) ? Math.round((uKeaDone / uKeaTotal) * 100) : (Number(uKea.persen) || 0);

      const ukeaPctEl = document.getElementById('supUnitKeamananPct');
      if (ukeaPctEl) ukeaPctEl.innerText = `${uKeaPct}%`;
      const ukeaRatioEl = document.getElementById('supUnitKeamananRatio');
      if (ukeaRatioEl) ukeaRatioEl.innerText = `${uKeaDone} / ${uKeaTotal} Selesai`;
      const ukeaBar = document.getElementById('supUnitKeamananBar');
      if (ukeaBar) ukeaBar.style.width = `${Math.min(100, Math.max(0, uKeaPct))}%`;

      // 6. Satpam Bertugas Hari Ini List
      const todayDateBadge = document.getElementById('supTodayDateBadge');
      const now = new Date();
      if (todayDateBadge) todayDateBadge.innerText = `Tgl ${now.getDate()}`;

      const satpamContainer = document.getElementById('supTodaySatpamList');
      if (satpamContainer) {
        if (!satpamList.length) {
          satpamContainer.innerHTML = '<div class="text-xs text-slate-400 py-6 text-center">Tidak ada petugas keamanan piket hari ini.</div>';
        } else {
          satpamContainer.innerHTML = satpamList.map(s => {
            const shiftBadgeClass = s.shift === 'P' ? 'bg-blue-100 text-blue-800 border-blue-200' : (s.shift === 'S' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-purple-100 text-purple-800 border-purple-200');
            return `
              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    ${escapeHtml((s.nama || 'S').charAt(0))}
                  </div>
                  <div>
                    <p class="text-xs font-bold text-slate-800">${escapeHtml(s.nama)}</p>
                    <p class="text-[11px] text-slate-500">${escapeHtml(s.posisi || 'Piket Keamanan')}</p>
                  </div>
                </div>
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${shiftBadgeClass}">
                  Shift ${s.shift}
                </span>
              </div>
            `;
          }).join('');
        }
      }

      // 7. Rekapitulasi Kinerja Pegawai Table
      cachedSupervisorPegawai = data.rekapPegawai || [];
      renderSupervisorPegawaiTable(cachedSupervisorPegawai);
    }

function renderSupervisorPegawaiTable(list) {
      const tbody = document.getElementById('supPegawaiTableBody');
      if (!tbody) return;

      if (!list || !list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">Tidak ada data pegawai ditemukan.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map((p, idx) => {
        const total = Number(p.total || 0);
        const done = Number(p.selesai !== undefined ? p.selesai : (p.done || 0));
        const belum = Number(p.belum !== undefined ? p.belum : Math.max(0, total - done));
        const pct = (total > 0 && !isNaN(total)) ? Math.round((done / total) * 100) : (Number(p.persen) || 0);

        const isOptimal = pct >= 90;
        const isCukup = pct >= 70 && pct < 90;
        const badgeBg = isOptimal ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : (isCukup ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-rose-100 text-rose-800 border-rose-200');
        const badgeText = isOptimal ? 'Optimal' : (isCukup ? 'Cukup' : 'Perlu Perhatian');

        return `
          <tr class="hover:bg-slate-50 transition border-t border-slate-100">
            <td class="py-3 px-4 font-semibold text-slate-400">${idx + 1}</td>
            <td class="py-3 px-4">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-100">
                  ${escapeHtml((p.namaPegawai || 'U').charAt(0).toUpperCase())}
                </div>
                <div>
                  <span class="font-bold text-slate-800 block">${escapeHtml(p.namaPegawai)}</span>
                  <span class="text-[11px] text-slate-400">@${escapeHtml(p.username)}</span>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 font-semibold text-slate-600">${escapeHtml(p.unit || '-')}</td>
            <td class="py-3 px-4 font-mono font-medium text-slate-700">${done} / ${total}</td>
            <td class="py-3 px-4">
              <div class="flex items-center gap-2">
                <div class="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div class="h-full ${isOptimal ? 'bg-emerald-500' : (isCukup ? 'bg-amber-500' : 'bg-rose-500')} rounded-full" style="width: ${Math.min(100, Math.max(0, pct))}%"></div>
                </div>
                <span class="font-bold text-xs ${isOptimal ? 'text-emerald-600' : (isCukup ? 'text-amber-600' : 'text-rose-600')}">${pct}%</span>
              </div>
            </td>
            <td class="py-3 px-4">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}">${badgeText}</span>
            </td>
            <td class="py-3 px-4 text-center">
              <button onclick="showEmployeeDetailModal('${escapeHtml(p.namaPegawai)}')" class="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 mx-auto border border-brand-200">
                <i class="fa-solid fa-eye text-[11px]"></i> Detail
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

function filterSupervisorPegawaiTable(q) {
      if (!cachedSupervisorPegawai || !cachedSupervisorPegawai.length) return;
      q = (q || '').toLowerCase().trim();
      if (!q) {
        renderSupervisorPegawaiTable(cachedSupervisorPegawai);
        return;
      }
      const filtered = cachedSupervisorPegawai.filter(p =>
        (p.namaPegawai || '').toLowerCase().includes(q) ||
        (p.username || '').toLowerCase().includes(q) ||
        (p.unit || '').toLowerCase().includes(q) ||
        (p.role || '').toLowerCase().includes(q)
      );
      renderSupervisorPegawaiTable(filtered);
    }

async function showEmployeeDetailModal(namaPegawai) {
      const bulan = document.getElementById('globalMonthSelect')?.value;
      const tahun = document.getElementById('globalYearSelect')?.value;
      showLoader(true);
      try {
        const res = await callBackend('getEmployeeDetailProgress', {
          token: sessionToken,
          employeeIdentifier: namaPegawai,
          namaPegawai: namaPegawai,
          bulan: bulan,
          tahun: tahun
        });
        showLoader(false);
        if (res && res.success) {
          const d = res.data;
          const totalTasks = Number(d.totalTasks || 0);
          const doneTasks = Number(d.doneTasks || 0);
          const pct = (totalTasks > 0 && !isNaN(totalTasks)) ? Math.round((doneTasks / totalTasks) * 100) : (Number(d.persen) || 0);

          const elAvatar = document.getElementById('modEmpAvatar');
          if (elAvatar) elAvatar.innerText = (d.namaPegawai || 'P').charAt(0).toUpperCase();

          const elNama = document.getElementById('modEmpNama');
          if (elNama) elNama.innerText = d.namaPegawai || namaPegawai;

          const elUnit = document.getElementById('modEmpUnit');
          if (elUnit) elUnit.innerText = `${d.role || 'Petugas'} • Unit ${d.unit || '-'}`;

          const elBadge = document.getElementById('modEmpProgressBadge');
          if (elBadge) elBadge.innerText = `${pct}% (${doneTasks}/${totalTasks} Selesai)`;

          const elBar = document.getElementById('modEmpProgressBar');
          if (elBar) elBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;

          const taskContainer = document.getElementById('modEmpTasksList');
          if (taskContainer) {
            if (!d.tasks || !d.tasks.length) {
              taskContainer.innerHTML = '<div class="py-6 text-center text-xs text-slate-400">Belum ada data checklist untuk pegawai ini.</div>';
            } else {
              taskContainer.innerHTML = d.tasks.map(t => `
                <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div class="space-y-0.5">
                    <p class="text-xs font-semibold text-slate-800">${escapeHtml(t.item)}</p>
                    <p class="text-[11px] text-slate-500">${escapeHtml(t.ruangan)} • <span class="font-medium">${escapeHtml(t.periode || 'Harian')}</span></p>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg text-xs font-bold border ${t.isDone ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}">
                    ${t.isDone ? '<i class="fa-solid fa-check mr-1 text-emerald-600"></i> Selesai' : '<i class="fa-regular fa-circle mr-1 text-slate-400"></i> Belum'}
                  </span>
                </div>
              `).join('');
            }
          }

          openModal('modalEmployeeDetail');
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast('Gagal memuat detail pegawai: ' + err.message, 'error');
      }
    }


    /**
     * ========================================================================
     * 2. MONITORING TERPADU ADMIN (OPTIMIZED & FAST)
     * ========================================================================
     */
    // cachedIntegratedMonitoringData declared globally
    let adminMonitoringCurrentPeriod = 'harian';
    let adminMonitoringCurrentDay = new Date().getDate();
    let adminMonitoringCurrentWeek = Math.min(5, Math.ceil(new Date().getDate() / 7));
