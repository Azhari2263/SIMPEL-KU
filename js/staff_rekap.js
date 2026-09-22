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
          renderRekapCharts(res.data);
          renderRekapTable(res.data.rekapRuangan);
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast("Gagal memuat rekapitulasi: " + err.message, "error");
      }
    }

function renderRekapCharts(data) {
      const ctxTren = document.getElementById('chartTrenHarian').getContext('2d');
      if (chartTrenInstance) chartTrenInstance.destroy();

      const labelsHarian = data.rekapHarian.map(h => 'Tgl ' + h.hari);
      const dataHarian = data.rekapHarian.map(h => h.selesai);

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

      const ctxRuang = document.getElementById('chartRuangan').getContext('2d');
      if (chartRuanganInstance) chartRuanganInstance.destroy();

      const labelsRuang = data.rekapRuangan.map(r => r.ruangan);
      const dataRuangSelesai = data.rekapRuangan.map(r => r.selesai);
      const dataRuangTotal = data.rekapRuangan.map(r => r.total);

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

function renderRekapTable(listRuangan) {
      const tbody = document.getElementById('rekapTableBody');
      if (!listRuangan || listRuangan.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Belum ada data rekapitulasi.</td></tr>';
        return;
      }

      let html = '';
      listRuangan.forEach(r => {
        const persen = r.total > 0 ? Math.round((r.selesai / r.total) * 100) : 0;
        html += `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-3.5 font-bold text-slate-800">${escapeHtml(r.ruangan)}</td>
            <td class="p-3.5 text-center font-medium text-slate-600">${r.itemCount} Item</td>
            <td class="p-3.5 text-center font-medium text-slate-600">${r.total}</td>
            <td class="p-3.5 text-center font-bold text-emerald-600">${r.selesai}</td>
            <td class="p-3.5 text-center font-extrabold ${persen === 100 ? 'text-emerald-600' : 'text-brand-600'}">${persen}%</td>
            <td class="p-3.5">
              <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div class="h-full rounded-full ${persen === 100 ? 'bg-emerald-500' : 'bg-brand-600'}" style="width: ${persen}%"></div>
              </div>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }
