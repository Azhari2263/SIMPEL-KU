/**
 * ========================================================================
 * SIMPEL-KU - CONFIGURATION MODULE (FRONTEND)
 * ========================================================================
 */

window.APP_CONFIG = {
  APP_NAME: 'SIMPEL-KU',
  APP_SUBTITLE: 'Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum',
  INSTITUTION: 'BPS Provinsi Kalimantan Barat',
  CACHE_TTL_MS: 60000, // 60 detik client cache
  ROLES: {
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    HUMAS: 'Tim Umum dan Humas',
    KORLAP: 'Koordinator Lapangan',
    KEBERSIHAN: 'Petugas Kebersihan',
    PELAYANAN: 'Petugas Pelayanan',
    KEAMANAN: 'Petugas Keamanan'
  },
  MONTHS: [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ]
};
