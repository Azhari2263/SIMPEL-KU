/**
 * ========================================================================
 * SIMPEL-KU - STAFF REKAP & DASHBOARD CONTROLLER
 * ========================================================================
 */

async function loadDashboardData() {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      showLoader(true);

      try {
        const res = await callBackend('getDashboardData', {
          token: sessionToken,
          bulan: bulan,
          tahun: tahun
        });
        showLoader(false);
        if (res && res.success) {
          renderDashboardUI(res.data);
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast("Gagal memuat dashboard: " + err.message, "error");
      }
    }

function renderDashboardUI(d) {
      document.getElementById('dashTotalCount').innerText = d.totalKegiatan;
      document.getElementById('dashSelesaiCount').innerText = d.kegiatanSelesai;
      document.getElementById('dashBelumCount').innerText = d.kegiatanBelum;
      document.getElementById('dashPersenCount').innerText = d.persenPenyelesaian + '%';
      document.getElementById('dashProgressBar').style.width = d.persenPenyelesaian + '%';

      renderQuickActions();

      const container = document.getElementById('dashRuanganContainer');
      if (!d.progressRuangan || d.progressRuangan.length === 0) {
        container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Belum ada data ruangan.</div>';
        return;
      }

      let html = '';
      d.progressRuangan.forEach(r => {
        html += `
          <div class="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="font-bold text-slate-800">${escapeHtml(r.ruangan)}</span>
              <span class="font-semibold text-slate-600">${r.selesai} / ${r.total} Selesai (${r.persen}%)</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="h-full rounded-full ${r.persen === 100 ? 'bg-emerald-500' : 'bg-brand-600'}" style="width: ${r.persen}%"></div>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

async function loadRekapData() {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      showLoader(true);

      try {
        const res = await callBackend('getRekapMonitoring', {
          token: sessionToken,
          bulan: bulan,
          tahun: tahun
        });
        showLoader(false);
        if (res && res.success) {
          renderRekapTable(res.data.rekapRuangan);
          try {
            renderRekapCharts(res.data);
          } catch (chartErr) {
            console.warn("Chart rendering warning:", chartErr);
          }
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast("Gagal memuat rekapitulasi: " + err.message, "error");
      }
    }

function renderRekapCharts(data) {
      if (!data) return;
      if (typeof Chart === 'undefined') {
        console.warn('Chart.js library is not available');
        return;
      }

      const canvasTren = document.getElementById('chartTrenHarian');
      if (canvasTren && data.rekapHarian && data.rekapHarian.length) {
        const ctxTren = canvasTren.getContext('2d');
        if (chartTrenInstance) chartTrenInstance.destroy();

        const labelsHarian = data.rekapHarian.map(h => 'Tgl ' + (h.hari !== undefined ? h.hari : (h.tanggal !== undefined ? h.tanggal : '')));
        const dataHarian = data.rekapHarian.map(h => (h.selesai !== undefined ? h.selesai : (h.done || 0)));

        chartTrenInstance = new Chart(ctxTren, {
          type: 'line',
          data: {
            labels: labelsHarian,
            datasets: [{
              label: 'Kegiatan Terlaksana',
              data: dataHarian,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      const canvasRuang = document.getElementById('chartRuangan');
      if (canvasRuang && data.rekapRuangan && data.rekapRuangan.length) {
        const ctxRuang = canvasRuang.getContext('2d');
        if (chartRuanganInstance) chartRuanganInstance.destroy();

        const labelsRuang = data.rekapRuangan.map(r => r.ruangan);
        const dataRuangSelesai = data.rekapRuangan.map(r => (r.selesai !== undefined ? r.selesai : (r.done || 0)));
        const dataRuangTotal = data.rekapRuangan.map(r => (r.total !== undefined ? r.total : 0));

        chartRuanganInstance = new Chart(ctxRuang, {
          type: 'bar',
          data: {
            labels: labelsRuang,
            datasets: [
              {
                label: 'Selesai',
                data: dataRuangSelesai,
                backgroundColor: '#10b981',
                borderRadius: 6
              },
              {
                label: 'Total Target',
                data: dataRuangTotal,
                backgroundColor: '#e2e8f0',
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }

function switchRekapTab(tab) {
  const tabs = [
    { id: 'ruangan', btn: 'btnTabRekapRuangan', sec: 'rekapTabRuanganSection' },
    { id: 'pegawai', btn: 'btnTabRekapPegawai', sec: 'rekapTabPegawaiSection' },
    { id: 'preview', btn: 'btnTabRekapPreview', sec: 'rekapTabPreviewSection' }
  ];

  tabs.forEach(t => {
    const btn = document.getElementById(t.btn);
    const sec = document.getElementById(t.sec);
    if (t.id === tab) {
      if (btn) btn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-brand-600 text-white shadow-xs cursor-pointer flex-shrink-0 flex items-center gap-1.5';
      if (sec) sec.classList.remove('hidden');
    } else {
      if (btn) btn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer flex-shrink-0 flex items-center gap-1.5';
      if (sec) sec.classList.add('hidden');
    }
  });

  if (tab === 'pegawai') {
    loadRekapPegawaiTab();
  } else if (tab === 'preview') {
    initInlineLaporanPreview();
  }
}

function renderRekapTable(listRuangan) {
  const tbody = document.getElementById('rekapTableBody');
  if (!listRuangan || listRuangan.length === 0) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">Belum ada data rekapitulasi untuk bulan ini.</td></tr>';
    updateRekapKpiCards(0, 0, 0, 0);
    return;
  }

  let totalAll = 0;
  let selesaiAll = 0;

  let html = '';
  listRuangan.forEach(r => {
    const rTot = Number(r.total || 0);
    const rSel = Number(r.selesai !== undefined ? r.selesai : (r.done || 0));
    const persen = rTot > 0 ? Math.round((rSel / rTot) * 100) : 0;
    totalAll += rTot;
    selesaiAll += rSel;

    html += `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3.5 font-bold text-slate-800">${escapeHtml(r.ruangan)}</td>
        <td class="p-3.5 text-center font-medium text-slate-600">${r.itemCount || '-'} Item</td>
        <td class="p-3.5 text-center font-medium text-slate-600">${rTot}</td>
        <td class="p-3.5 text-center font-bold text-emerald-600">${rSel}</td>
        <td class="p-3.5 text-center font-extrabold ${persen >= 90 ? 'text-emerald-600' : (persen >= 70 ? 'text-amber-600' : 'text-rose-600')}">${persen}%</td>
        <td class="p-3.5">
          <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div class="h-full rounded-full ${persen >= 90 ? 'bg-emerald-500' : (persen >= 70 ? 'bg-amber-500' : 'bg-rose-500')}" style="width: ${persen}%"></div>
          </div>
        </td>
      </tr>
    `;
  });

  const belumAll = Math.max(0, totalAll - selesaiAll);
  const persenAll = totalAll > 0 ? Math.round((selesaiAll / totalAll) * 100) : 0;

  // Baris Total Keseluruhan
  html += `
    <tr class="bg-slate-50/80 font-bold border-t-2 border-slate-300">
      <td class="p-3.5 text-slate-900 uppercase tracking-wider">TOTAL KESELURUHAN</td>
      <td class="p-3.5 text-center text-slate-600">${listRuangan.length} Area</td>
      <td class="p-3.5 text-center text-slate-800">${totalAll}</td>
      <td class="p-3.5 text-center text-emerald-600 font-extrabold">${selesaiAll}</td>
      <td class="p-3.5 text-center text-brand-700 font-black">${persenAll}%</td>
      <td class="p-3.5">
        <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-brand-600" style="width: ${persenAll}%"></div>
        </div>
      </td>
    </tr>
  `;

  if (tbody) tbody.innerHTML = html;
  updateRekapKpiCards(totalAll, selesaiAll, belumAll, persenAll);
}

function updateRekapKpiCards(total, selesai, belum, persen) {
  const elTot = document.getElementById('rekapKpiTotal');
  const elSel = document.getElementById('rekapKpiSelesai');
  const elBel = document.getElementById('rekapKpiBelum');
  const elPct = document.getElementById('rekapKpiPersen');
  const elBar = document.getElementById('rekapKpiProgressBar');

  if (elTot) elTot.innerText = total;
  if (elSel) elSel.innerText = selesai;
  if (elBel) elBel.innerText = belum;
  if (elPct) elPct.innerText = persen + '%';
  if (elBar) elBar.style.width = persen + '%';
}

async function loadRekapPegawaiTab() {
  const tbody = document.getElementById('rekapPegawaiTableBody');
  if (!tbody) return;

  const bulan = document.getElementById('globalMonthSelect').value;
  const tahun = document.getElementById('globalYearSelect').value;

  tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400 font-medium"><div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-1.5"></div>Memuat rekapitulasi seluruh pegawai...</td></tr>';

  try {
    const res = await callBackend('getExportLaporanData', {
      token: sessionToken,
      tipe: 'semua',
      bulan: bulan,
      tahun: tahun
    });

    if (res && res.success && res.data && res.data.rekapPegawai) {
      renderRekapPegawaiTable(res.data.rekapPegawai, res.data.summary);
    } else {
      tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-rose-500 font-medium"><i class="fa-solid fa-circle-exclamation mr-1"></i>${escapeHtml(res?.message || 'Gagal memuat rekap pegawai.')}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-rose-500 font-medium">Kesalahan: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderRekapPegawaiTable(listPegawai, summary) {
  const tbody = document.getElementById('rekapPegawaiTableBody');
  if (!tbody) return;

  if (!listPegawai || listPegawai.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">Tidak ada data pegawai untuk bulan ini.</td></tr>';
    return;
  }

  let html = '';
  listPegawai.forEach((p, idx) => {
    const statusClass = p.persen >= 90
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : (p.persen >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200');

    html += `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3.5 text-center text-slate-400 font-semibold">${idx + 1}</td>
        <td class="p-3.5 font-bold text-slate-800">
          <span>${escapeHtml(p.namaPegawai)}</span>
          <span class="block text-[10px] text-slate-400 font-normal">@${escapeHtml(p.username || '-')}</span>
        </td>
        <td class="p-3.5 text-center">
          <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">${escapeHtml(p.unit || '-')}</span>
        </td>
        <td class="p-3.5 text-right font-medium text-slate-600">${p.totalTarget || 0}</td>
        <td class="p-3.5 text-right font-bold text-emerald-600">${p.selesai || 0}</td>
        <td class="p-3.5 text-right font-bold text-rose-600">${p.belum || 0}</td>
        <td class="p-3.5 text-center font-black ${p.persen >= 90 ? 'text-emerald-600' : (p.persen >= 70 ? 'text-amber-600' : 'text-rose-600')}">${p.persen || 0}%</td>
        <td class="p-3.5 text-center">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusClass}">${escapeHtml(p.status || '-')}</span>
        </td>
        <td class="p-3.5 text-center">
          <button onclick="openExportModal('${escapeHtml(p.username)}')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition cursor-pointer">
            <i class="fa-solid fa-file-export mr-1"></i> Cetak
          </button>
        </td>
      </tr>
    `;
  });

  if (summary) {
    html += `
      <tr class="bg-slate-100/80 font-bold border-t-2 border-slate-300">
        <td colspan="3" class="p-3.5 text-center uppercase tracking-wider text-slate-900">TOTAL KESELURUHAN PEGAWAI (${listPegawai.length})</td>
        <td class="p-3.5 text-right font-bold text-slate-800">${summary.totalTarget || 0}</td>
        <td class="p-3.5 text-right font-extrabold text-emerald-600">${summary.totalSelesai || 0}</td>
        <td class="p-3.5 text-right font-extrabold text-rose-600">${summary.totalBelum || 0}</td>
        <td class="p-3.5 text-center font-black text-brand-700">${summary.persen || 0}%</td>
        <td class="p-3.5 text-center" colspan="2">
          <span class="text-xs font-bold text-slate-700">${summary.persen >= 90 ? 'Sangat Baik' : (summary.persen >= 70 ? 'Cukup Baik' : 'Perlu Peningkatan')}</span>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

function initInlineLaporanPreview() {
  populateInlinePreviewEmployeeSelect();
  renderInlineLaporanPreview();
}

function populateInlinePreviewEmployeeSelect() {
  const sel = document.getElementById('previewEmployeeSelect');
  const scopeSel = document.getElementById('previewScopeSelect');
  const wrapper = document.getElementById('previewEmployeeSelectWrapper');
  if (!sel || !scopeSel) return;

  const isIndividu = (scopeSel.value === 'individu');
  if (wrapper) {
    if (isIndividu) wrapper.classList.remove('hidden');
    else wrapper.classList.add('hidden');
  }

  // Populate options from export modal selector if available
  const exportEmpSel = document.getElementById('exportEmployeeSelect');
  if (exportEmpSel && exportEmpSel.options.length > 0) {
    sel.innerHTML = exportEmpSel.innerHTML;
  } else {
    sel.innerHTML = `<option value="${currentUser?.username || ''}">${escapeHtml(currentUser?.namaPegawai || 'Saya')}</option>`;
  }
}

async function renderInlineLaporanPreview() {
  const card = document.getElementById('inlineLaporanPreviewCard');
  if (!card) return;

  const scopeSel = document.getElementById('previewScopeSelect');
  const empSel = document.getElementById('previewEmployeeSelect');
  const wrapper = document.getElementById('previewEmployeeSelectWrapper');

  const scope = scopeSel ? scopeSel.value : 'semua';
  if (wrapper) {
    if (scope === 'individu') wrapper.classList.remove('hidden');
    else wrapper.classList.add('hidden');
  }

  const bulan = document.getElementById('globalMonthSelect').value;
  const tahun = document.getElementById('globalYearSelect').value;
  const targetUser = (scope === 'individu') ? (empSel ? empSel.value : currentUser?.username) : '';

  card.innerHTML = `
    <div class="text-center py-12 text-slate-400">
      <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <span class="text-xs">Memuat pratinjau lembar laporan resmi BPS...</span>
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
      if (typeof renderLaporanPreviewHtml === 'function') {
        card.innerHTML = renderLaporanPreviewHtml(res.data);
      } else {
        card.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">Pratinjau data siap. Gunakan tombol export di atas.</div>`;
      }
    } else {
      card.innerHTML = `<div class="p-6 text-center text-xs text-rose-500"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${escapeHtml(res?.message || 'Gagal memuat pratinjau.')}</div>`;
    }
  } catch (err) {
    card.innerHTML = `<div class="p-6 text-center text-xs text-rose-500">Kesalahan: ${escapeHtml(err.message)}</div>`;
  }
}

function exportFromInlinePreview(format) {
  const scopeSel = document.getElementById('previewScopeSelect');
  const empSel = document.getElementById('previewEmployeeSelect');
  const scope = scopeSel ? scopeSel.value : 'semua';
  const targetUser = (scope === 'individu') ? (empSel ? empSel.value : currentUser?.username) : null;

  // Set values on export modal then trigger export
  const radioSemua = document.getElementById('radioScopeSemua');
  const radioIndividu = document.getElementById('radioScopeIndividu');
  if (scope === 'semua' && radioSemua) radioSemua.checked = true;
  if (scope === 'individu' && radioIndividu) radioIndividu.checked = true;

  onExportScopeChange();
  if (targetUser) {
    const sel = document.getElementById('exportEmployeeSelect');
    if (sel) sel.value = targetUser;
  }

  runExportLaporan(format);
}
