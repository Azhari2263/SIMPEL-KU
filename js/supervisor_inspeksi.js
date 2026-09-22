/**
 * ========================================================================
 * SIMPEL-KU - INSPEKSI MUTU CONTROLLER (SUPERVISOR / ADMIN)
 * ========================================================================
 */

async function loadInspeksiMutuData(unit = 'SEMUA', forceRefresh = false) {
      const bulan = document.getElementById('globalMonthSelect').value;
      const tahun = document.getElementById('globalYearSelect').value;
      const cacheKey = `${bulan}_${tahun}_${unit}`;

      if (!forceRefresh && window._managerDataCache.inspeksi[cacheKey]) {
        cachedInspeksiData = window._managerDataCache.inspeksi[cacheKey];
        renderInspeksiMutuUI(cachedInspeksiData);
        return;
      }

      showLoader(true);
      try {
        const res = await callBackend('getInspeksiMutuData', { token: sessionToken, unit, bulan, tahun });
        showLoader(false);
        if (res && res.success) {
          window._managerDataCache.inspeksi[cacheKey] = res.data;
          cachedInspeksiData = res.data;
          renderInspeksiMutuUI(res.data);
        } else {
          handleApiError(res);
        }
      } catch (err) {
        showLoader(false);
        showToast('Gagal memuat data inspeksi: ' + err.message, 'error');
      }
    }

function filterInspeksiUnit(unit) {
      document.querySelectorAll('.insp-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-unit') === unit) {
          btn.className = 'insp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white shadow-sm';
        } else {
          btn.className = 'insp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600';
        }
      });
      loadInspeksiMutuData(unit, true);
    }

    let inspCurrentUnitFilter = 'SEMUA';

function filterInspeksiUnit(unit) {
      inspCurrentUnitFilter = unit;
      document.querySelectorAll('.insp-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-unit') === unit) {
          btn.className = 'insp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white shadow-sm';
        } else {
          btn.className = 'insp-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600';
        }
      });
      filterInspeksiTableRealtime(document.getElementById('searchInspeksiTable')?.value || '');
    }

function filterInspeksiTableRealtime(q) {
      if (!cachedInspeksiData) return;
      q = (q || '').toLowerCase().trim();
      let list = cachedInspeksiData;

      if (inspCurrentUnitFilter && inspCurrentUnitFilter !== 'SEMUA') {
        list = list.filter(item => (item.unit || '').toUpperCase() === inspCurrentUnitFilter.toUpperCase());
      }

      if (q) {
        list = list.filter(item =>
          (item.unit || '').toLowerCase().includes(q) ||
          (item.pegawaiArea || item.area || '').toLowerCase().includes(q) ||
          (item.catatan || '').toLowerCase().includes(q) ||
          (item.inspektor || '').toLowerCase().includes(q)
        );
      }

      renderInspeksiMutuUI(list);
    }

function renderInspeksiMutuUI(list) {
      const tbody = document.getElementById('inspeksiTableBody');
      if (!tbody) return;
      if (!list || !list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">Belum ada data inspeksi yang sesuai.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(item => {
        const score = Number(item.skorRataRata || 5).toFixed(1);
        return `
          <tr class="hover:bg-slate-50 transition border-t border-slate-100">
            <td class="py-3 px-4 font-mono text-slate-500">${escapeHtml(item.tanggal || '-')}</td>
            <td class="py-3 px-4 font-bold text-slate-800">${escapeHtml(item.unit || '-')}</td>
            <td class="py-3 px-4 text-slate-600">${escapeHtml(item.pegawaiArea || item.area || '-')}</td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                <i class="fa-solid fa-star text-amber-500 text-[10px]"></i> ${score} / 5.0
              </span>
            </td>
            <td class="py-3 px-4">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.statusRekomendasi === 'Sesuai Standar' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                ${escapeHtml(item.statusRekomendasi || 'Sesuai Standar')}
              </span>
            </td>
            <td class="py-3 px-4 max-w-xs truncate text-slate-600" title="${escapeHtml(item.catatan || '')}">${escapeHtml(item.catatan || '-')}</td>
            <td class="py-3 px-4 text-slate-500 font-semibold">${escapeHtml(item.inspektor || 'Supervisor')}</td>
          </tr>
        `;
      }).join('');
    }

function openInspeksiMutuModal() {
      openModal('modalInspeksiMutu');
    }

let _inspRatings = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 };

function setInspRating(paramNum, val) {
  _inspRatings[paramNum] = Number(val) || 5;
  const container = document.getElementById('starsParam' + paramNum);
  if (container) {
    const stars = container.querySelectorAll('i');
    stars.forEach((s, idx) => {
      if (idx < val) {
        s.className = 'fa-solid fa-star';
      } else {
        s.className = 'fa-regular fa-star text-slate-300';
      }
    });
  }
}

function onInspUnitInputChange() {
  // Dynamic updates if needed
}

async function submitInspeksiMutu() {
  const unit = document.getElementById('inspUnitInput')?.value || 'Kebersihan';
  const ruangan = document.getElementById('inspRuanganInput')?.value || document.getElementById('inspAreaInput')?.value || '';
  const tanggal = document.getElementById('inspTanggalInput')?.value || '';
  const catatan = document.getElementById('inspCatatanInput')?.value || '';
  const tindakLanjut = document.getElementById('inspTindakLanjutInput')?.value || '';

  const bulan = document.getElementById('globalMonthSelect')?.value;
  const tahun = document.getElementById('globalYearSelect')?.value;

  if (!ruangan) {
    showToast('Harap masukkan area atau ruangan yang diinspeksi.', 'error');
    return;
  }

  const avg = ((_inspRatings[1] + _inspRatings[2] + _inspRatings[3] + _inspRatings[4] + _inspRatings[5]) / 5);
  const statusRekomendasi = avg >= 4.0 ? 'Sesuai Standar' : (avg >= 3.0 ? 'Perlu Perbaikan Ringan' : 'Perlu Tindakan Korektif');

  showLoader(true);
  try {
    const res = await callBackend('saveInspeksiMutu', {
      token: sessionToken,
      payload: {
        unit: unit,
        ruangan: ruangan,
        pegawaiArea: ruangan,
        tanggal: tanggal,
        skorRataRata: avg,
        param1: _inspRatings[1],
        param2: _inspRatings[2],
        param3: _inspRatings[3],
        param4: _inspRatings[4],
        param5: _inspRatings[5],
        catatan: catatan,
        tindakLanjut: tindakLanjut,
        statusRekomendasi: statusRekomendasi,
        bulan: bulan,
        tahun: tahun
      }
    });
    showLoader(false);
    if (res && res.success) {
      showToast(res.message || 'Audit inspeksi mutu berhasil disimpan!', 'success');
      closeModal('modalInspeksiMutu');
      clearManagerClientCache();
      loadInspeksiMutuData('SEMUA', true);
    } else {
      handleApiError(res);
    }
  } catch (err) {
    showLoader(false);
    showToast('Gagal menyimpan inspeksi: ' + err.message, 'error');
  }
}
