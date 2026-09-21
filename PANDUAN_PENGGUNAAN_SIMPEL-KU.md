# 📘 BUKU PANDUAN PENGGUNAAN APLIKASI
## **SIMPEL-KU**
### *(Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum)*
**Badan Pusat Statistik (BPS) Provinsi Kalimantan Barat**

---

### 📑 DAFTAR ISI
1. [Tentang Aplikasi SIMPEL-KU](#1-tentang-aplikasi-simpel-ku)
2. [Sistem Multi-Role & Autentikasi Pengguna](#2-sistem-multi-role--autentikasi-pengguna)
   - 2.1 Struktur Peran (Role) & Hak Akses
   - 2.2 Daftar Kredensial Akun Default
   - 2.3 Langkah Login & Durasi Sesi
3. [Mengenal Antarmuka & Navigasi Dinamis](#3-mengenal-antarmuka--navigasi-dinamis)
   - 3.1 Sidebar & Fitur Ciutkan (Collapse)
   - 3.2 Topbar & Pemilih Periode Global (Bulan/Tahun)
   - 3.3 Penyesuaian Menu Otomatis Berdasarkan Role
4. [Panduan Modul: Dashboard Eksekutif Supervisor & Kasubbag Umum](#4-panduan-modul-dashboard-eksekutif-supervisor--kasubbag-umum)
   - 4.1 Banner Pengawasan & Aksi Cepat
   - 4.2 Kartu Ringkasan Performa Makro (5 Indikator Utama)
   - 4.3 Pemisahan Unit Kerja Terpadu & Subtotal Metrik (CS, PST, Security)
   - 4.4 Pengelolaan & Pengubahan Jadwal Shift Satpam (P, S, M, O)
   - 4.5 Modul Verifikasi & Approval Laporan Bulanan Tenaga Alih Daya
5. [Panduan Modul: Quality Assurance (Inspeksi Mutu Terpadu)](#5-panduan-modul-quality-assurance-inspeksi-mutu-terpadu)
   - 5.1 4 Kategori Aspek Mutu (Kebersihan, Keamanan, Pelayanan, Sarpras)
   - 5.2 Formulir Penilaian Cepat Rating Bintang 1–5 & Preset Area
   - 5.3 Catatan Evaluasi & Dokumentasi Foto Temuan
   - 5.4 Widget Skor Mutu Per Kategori Aspek & Timeline Riwayat Audit
   - 5.5 Fitur Pintas "Audit Cepat" dari Tabel Pegawai
6. [Panduan Modul: Dashboard Personal Pegawai Pelaksana](#6-panduan-modul-dashboard-personal-pegawai-pelaksana)
7. [Panduan Modul: Monitoring Kebersihan & Pelayanan](#7-panduan-modul-monitoring-kebersihan--pelayanan)
   - 7.1 Mode Tampilan Harian (Format Kartu & Format Tabel)
   - 7.2 Mode Tampilan Mingguan & Bulanan
   - 7.3 Fitur Filter Ruangan, Status, dan Pencarian Cepat
   - 7.4 Aturan Penguncian Data (Hari Ini vs Tanggal Lampau)
   - 7.5 Penanganan Otomatis Hari Libur (Sabtu & Minggu)
8. [Panduan Modul: Monitoring & Piket Keamanan (Satpam)](#8-panduan-modul-monitoring--piket-keamanan-satpam)
   - 8.1 Ringkasan Distribusi Shift Kerja Bulanan
   - 8.2 Memilih Tanggal & Membaca Legenda Shift (P, S, M, O)
   - 8.3 Pengisian Checklist Tugas Sesuai Jam Dinas
9. [Panduan Modul: Rekapitulasi & Penanganan Kendala (Error State & Coba Lagi)](#9-panduan-modul-rekapitulasi--penanganan-kendala-error-state--coba-lagi)
   - 9.1 Penanganan Kegagalan Rekapitulasi & Tombol Coba Lagi
   - 9.2 Grafik Tren Harian & Grafik Pencapaian Ruangan
   - 9.3 Tabel Matriks Rekapitulasi Per Ruangan
10. [Panduan Modul: Profil Akun & Ganti Kredensial Mandiri](#10-panduan-modul-profil-akun--ganti-kredensial-mandiri)
11. [Tanya Jawab (FAQ) & Solusi Kendala Teknis](#11-tanya-jawab-faq--solusi-kendala-teknis)

---

## 1. Tentang Aplikasi SIMPEL-KU

**SIMPEL-KU** (*Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum*) adalah aplikasi manajemen operasional dan pengawasan terpadu berbasis cloud yang dirancang khusus untuk memonitor, mengevaluasi, mengaudit mutu, dan merekapitulasi pelaksanaan tugas harian tenaga pendukung (alih daya) di lingkungan **BPS Provinsi Kalimantan Barat**.

### 🌟 Fitur Unggulan Terbaru:
* **Quality Assurance (Inspeksi Mutu Terpadu)**: Memperluas cakupan audit mutu ke 4 pilar utama: **Kebersihan**, **Keamanan**, **Pelayanan**, dan **Sarana & Prasarana** dengan skala bintang 1–5 ⭐, preset area otomatis, dan kartu breakdown skor per aspek.
* **Pemisahan Unit Kerja Tegas (*Strict Segregation*)**: Mengelompokkan monitoring kinerja per unit terpisah (**Unit Kebersihan**, **Unit Keamanan**, dan **Unit Pelayanan**) dengan subtotal metrik masing-masing sehingga tidak bercampur aduk.
* **Editor Jadwal & Matriks Shift Satpam (P, S, M, O)**: Memberikan wewenang bagi Supervisor dan Admin TI untuk meninjau dan mengubah langsung jadwal shift piket satpam dengan penyimpanan instan ke sheet `JadwalPiketSecurity`.
* **Penanganan Error Rekapitulasi & Tombol Coba Lagi**: Deteksi eksplisit saat gagal memuat data rekapitulasi, menampilkan kotak peringatan informatif dan tombol muat ulang tanpa memberikan data palsu/kosong.
* **Verifikasi & Approval Laporan Bulanan Resmi**: Alur tanda tangan persetujuan digital laporan bulanan alih daya oleh Kasubbag Umum / PPK langsung tersimpan di spreadsheet dengan stempel verifikasi resmi.
* **Checklist Real-Time Terintegrasi (*Live Sync*)**: Seluruh interaksi pengguna tersinkronisasi langsung dengan Google Spreadsheet sebagai database utama.
* **Smart History Locking**: Mengunci otomatis checklist tanggal lampau yang berstatus selesai (*TRUE*), sementara checklist hari ini dapat dikoreksi jika terjadi kekeliruan.

---

## 2. Sistem Multi-Role & Autentikasi Pengguna

### 2.1 Struktur Peran (Role) & Hak Akses

Aplikasi SIMPEL-KU membagi kewenangan pengguna ke dalam 5 peran (*Role*):

| Role | Target Pengguna | Hak Akses & Menu |
| :--- | :--- | :--- |
| **`SUPERVISOR`** | Kasubbag Umum, PPK, Koordinator Lapangan | Dashboard Pengawasan Makro, Modul QA (4 Aspek Mutu), Approval Laporan Bulanan, Pengelolaan Jadwal Shift Satpam, Monitoring Semua Unit (Tergrup Terpisah), Rekapitulasi Eksekutif, Profil Akun. |
| **`ADMIN`** | Administrator TI BPS Kalbar | Akses Penuh (*Super Admin*): Dashboard Supervisor, Seluruh Lembar Monitoring CS/PST/Satpam, QA Mutu Terpadu, Approval, Editor Jadwal Satpam, Rekapitulasi, Pengaturan Sistem & Kredensial. |
| **`CS`** | Petugas Kebersihan (*Cleaning Service*) | Dashboard Personal CS, Lembar Monitoring Kebersihan Ruangan/Lantai/Toilet/Halaman, Rekapitulasi Personal, Profil Akun. |
| **`PELAYANAN`** | Petugas Resepsionis / Front Office PST | Dashboard Personal PST, Lembar Monitoring Standar Layanan PST & Kebersihan Area Tamu, Rekapitulasi Personal, Profil Akun. |
| **`SECURITY`** | Petugas Keamanan / Satpam | Dashboard Personal Satpam, Kalender Jadwal Shift Piket (Pagi/Sore/Malam), Checklist Tugas Keamanan & Patroli Gedung, Rekapitulasi Personal, Profil Akun. |

---

### 2.2 Daftar Kredensial Akun Default

Berikut adalah akun default yang telah terdaftar pada database sheet **`Users`**:

```
+---------------+-----------------------------------+------------+---------------+
| Username      | Nama Pegawai / Jabatan            | Password   | Role          |
+---------------+-----------------------------------+------------+---------------+
| supervisor    | Kasubbag Umum / PPK               | super123   | SUPERVISOR    |
| admin         | Admin TI                          | admin123   | ADMIN         |
| dede          | Nurramadhanial                    | dede123    | CS            |
| slamet        | Slamet Riyadi                     | slamet123  | CS            |
| syukri        | Muhammad Syukri                   | syukri123  | CS            |
| ramadhan      | Ramadhan                          | rama123    | CS            |
| mawardi       | Mawardi                           | mawardi123 | CS            |
| yuni          | Yuni Juniarti                     | yuni123    | PELAYANAN     |
| rania         | Rania Naila Husna                 | rania123   | PELAYANAN     |
| alfiana       | Alfiana Ayuni                     | alfiana123 | PELAYANAN     |
| eddy          | Eddy Suryadi                      | eddy123    | SECURITY      |
| reza          | Syarif Reza Nopriadrian Al Kadri  | reza123    | SECURITY      |
| feri          | Feri Yustami                      | feri123    | SECURITY      |
| eko           | Eko Prasetyo                      | eko123     | SECURITY      |
| agus          | Agus Tetriansyah                  | agus123    | SECURITY      |
| rizki         | Rizki Fadil                       | rizki123   | SECURITY      |
+---------------+-----------------------------------+------------+---------------+
```

---

### 2.3 Langkah Login & Durasi Sesi

1. Buka tautan Web App SIMPEL-KU pada peramban web (*browser*).
2. Masukkan **Username** dan **Password** sesuai daftar akun di atas.
3. Klik tombol **Masuk ke Dashboard**.
4. Sistem memvalidasi kredensial serta role pengguna, kemudian otomatis mengarahkan ke tampilan antarmuka yang relevan:
   * Pengguna **SUPERVISOR** dan **ADMIN** langsung diarahkan ke **Dashboard Pengawasan Supervisor**.
   * Pengguna **CS**, **PELAYANAN**, dan **SECURITY** langsung diarahkan ke **Dashboard Personal**.
5. **Durasi Sesi**: Sesi login aktif selama **6 Jam**. Pengguna dapat logout sewaktu-waktu melalui tombol **Keluar (Logout)** di bagian bawah sidebar.

---

## 3. Mengenal Antarmuka & Navigasi Dinamis

```
+-------------------------------------------------------------------------------+
| [Logo SIMPEL-KU]  [Dashboard Pengawasan Supervisor]  [Bulan: September v] [2026 v] |
|-------------------------------------------------------------------------------|
| [Sidebar Navigasi] |  [Banner: Portal Pengawasan Manajerial & Approval]       |
| - Dashboard Sup    |  +-----------+ +-----------+ +-----------+ +-----------+ |
| - Inspeksi QA      |  | Total 92% | | CS: 94%   | | PST: 98%  | | Sec: 86%  | |
| - Rekapitulasi     |  +-----------+ +-----------+ +-----------+ +-----------+ |
| - Profil Akun      |                                                          |
|                    |  [Tab Unit: Semua | Kebersihan (CS) | PST | Keamanan]    |
| [Keluar / Logout]  |  [Tabel Komparasi Terpisah Per Unit & Subtotal Kinerja]  |
+-------------------------------------------------------------------------------+
```

### 3.1 Sidebar & Fitur Ciutkan (Collapse)
* **Desktop Sidebar**: Menampilkan avatar, nama pengguna, badge role, serta menu navigasi aktif.
* **Tombol Ciutkan (<i class="fa-solid fa-chevron-left"></i>)**: Menciutkan sidebar menjadi mode ikon ramping untuk memperluas ruang pandang matriks tabel monitoring.
* **Mobile Drawer**: Pada layar ponsel, klik ikon menu hamburger (<i class="fa-solid fa-bars"></i>) di sudut kiri atas untuk membuka navigasi.

### 3.2 Topbar & Pemilih Periode Global
* Terletak di sudut kanan atas layar untuk memilih **Bulan** dan **Tahun**.
* Mengubah bulan/tahun akan memperbarui seluruh data statistik, matriks checklist, data audit mutu, dan status approval pada halaman yang sedang dibuka seketika.

### 3.3 Penyesuaian Menu Otomatis Berdasarkan Role
* Sistem menyaring dan menyusun item menu sidebar secara dinamis:
  * **Supervisor**: *Dashboard Supervisor*, *Inspeksi Mutu (QA)*, *Rekapitulasi*, *Profil Akun*.
  * **Admin**: Menampilkan seluruh modul tanpa pembatasan.
  * **Petugas CS / PST / Satpam**: Menampilkan *Dashboard Personal*, *Modul Monitoring Terkait*, *Rekapitulasi*, *Profil Akun*.

---

## 4. Panduan Modul: Dashboard Eksekutif Supervisor & Kasubbag Umum

Modul ini adalah pusat kendali pengawasan bagi Kasubbag Umum, PPK, dan Koordinator Lapangan untuk memantau performa makro seluruh unit kerja alih daya BPS Provinsi Kalimantan Barat.

```
+-------------------------------------------------------------------------------+
|  PORTAL PENGAWASAN MANAJERIAL & APPROVAL                                       |
|  Dashboard Pengawasan Kasubbag Umum / PPK                                     |
|  [⚡ Inspeksi Mutu (QA)]  [🛡️ Jadwal Satpam]  [📜 Approval Bulanan]           |
+-------------------------------------------------------------------------------+
| [ Total: 92% ] [ CS: 94% ] [ PST: 98% ] [ Satpam: 86% ] [ Mutu QA: 4.8 ⭐ ]    |
+-------------------------------------------------------------------------------+
| STATUS PERSETUJUAN BULANAN (September 2026):                                  |
| [ CS: ✓ TELAH DISETUJUI ]   [ PST: ✓ TELAH DISETUJUI ]   [ SEC: ⏳ MENUNGGU ]  |
+-------------------------------------------------------------------------------+
| TAB UNIT KERJA: [ ( Semua Unit ) ] [ Kebersihan ] [ Pelayanan ] [ Keamanan ]  |
| Filter Lantai : [ Semua Lantai v ] | Cari Pegawai: [                     ]    |
+-------------------------------------------------------------------------------+
| === UNIT KEBERSIHAN (CLEANING SERVICE) === [Subtotal: 94% (580/617 Tugas)]    |
| +---------------------------------------------------------------------------+ |
| | Slamet Riyadi | Kebersihan | 120   | 118   | 98%   | 🟢 Sangat Baik | [QA] | |
| +---------------------------------------------------------------------------+ |
| === UNIT KEAMANAN (SATPAM / SECURITY) === [Subtotal: 86% (128/148 Shift)]     |
| +---------------------------------------------------------------------------+ |
| | Eddy Suryadi  | Keamanan   | 22    | 20    | 91%   | 🟢 Sangat Baik |[Shift]|
| +---------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------+
```

### 4.1 Banner Pengawasan & Aksi Cepat
* **Tombol Inspeksi Mutu (QA)**: Melompat langsung ke formulir inspeksi mutu terpadu (Kebersihan, Keamanan, Pelayanan, Sarpras).
* **Tombol Jadwal Satpam**: Membuka modal matriks kalender shift security seluruh personil untuk memantau atau mengedit jadwal dinas.
* **Tombol Approval Bulanan**: Membuka modal konfirmasi persetujuan laporan bulanan alih daya.

### 4.2 Kartu Ringkasan Performa Makro (5 Indikator Utama)
1. **Kepatuhan Total**: Persentase agregat kepatuhan seluruh unit alih daya pada bulan aktif.
2. **Kepatuhan Kebersihan (CS)**: Tingkat penyelesaian checklist kebersihan gedung dan toilet.
3. **Kepatuhan Pelayanan (PST)**: Tingkat kepatuhan standar pembukaan loket, kebersihan ruang tunggu PST, dan perlengkapan ATK tamu.
4. **Kepatuhan Keamanan (Satpam)**: Persentase pelaksanaan checklist patroli dan tugas jaga shift keamanan.
5. **Indeks Mutu Terpadu (QA)**: Rata-rata skor bintang (1.0 – 5.0 ⭐) gabungan dari seluruh kategori sidak lapangan oleh Supervisor.

---

### 4.3 Pemisahan Unit Kerja Terpadu & Subtotal Metrik
Data pegawai alih daya tidak lagi dicampur dalam satu tabel datar, melainkan dikelompokkan secara terpisah:
* **Tab Navigasi Unit**: Memungkinkan Supervisor beralih cepat antara tab **Semua Unit**, **Unit Kebersihan (CS)**, **Unit Pelayanan (PST)**, dan **Unit Keamanan (Satpam)**.
* **Header Kartu Unit & Subtotal**: Setiap unit memiliki kartu tersendiri dengan informasi subtotal target, tugas terselesaikan, dan persentase kepatuhan unit tersebut.
* **Filter Lantai & Pencarian**: Tetap responsif dalam menyaring personil di dalam masing-masing blok unit.

---

### 4.4 Pengelolaan & Pengubahan Jadwal Shift Satpam (P, S, M, O)

Supervisor dan Admin TI memiliki wewenang penuh untuk mengatur pembagian shift piket satpam langsung dari aplikasi:

```
+-------------------------------------------------------------------------------+
|  MODAL PENGELOLAAN & JADWAL SHIFT SECURITY                                    |
|  Periode: September 2026 (Klik cell shift untuk mengubah P/S/M/O)             |
+-------------------------------------------------------------------------------+
| Petugas          | Tgl 1 | Tgl 2 | Tgl 3 | Tgl 4 | Tgl 5 | ... | Tgl 30 | Tgl 31|
|------------------+-------+-------+-------+-------+-------+-----+--------+-------|
| Eddy Suryadi     | [ P ] | [ P ] | [ S ] | [ M ] | [ O ] | ... | [ P ]  | [ O ] |
| Syarif Reza      | [ S ] | [ S ] | [ M ] | [ O ] | [ P ] | ... | [ S ]  | [ P ] |
| Feri Yustami     | [ M ] | [ M ] | [ O ] | [ P ] | [ S ] | ... | [ M ]  | [ S ] |
+-------------------------------------------------------------------------------+
| [ 🔵 P = Pagi ]  [ 🟡 S = Siang/Sore ]  [ 🟣 M = Malam ]  [ ⚪ O = Off/Libur ]   |
+-------------------------------------------------------------------------------+
```

#### Langkah Mengubah Shift Satpam:
1. Klik tombol **🛡️ Jadwal Satpam** di banner dashboard supervisor atau tombol **Shift** di tabel satpam.
2. Modal matriks jadwal seluruh personil satpam untuk bulan aktif akan ditampilkan.
3. Cari nama petugas dan tanggal dinas yang ingin diubah.
4. Pilih kode shift baru dari dropdown/pilihan cell:
   * **`P`** : Dinas Pagi (06.00 – 16.00)
   * **`S`** : Dinas Siang/Sore (15.30 – 23.30)
   * **`M`** : Dinas Malam (23.00 – 07.30)
   * **`O`** : Lepas Dinas / Libur (Off)
5. Sistem langsung mengirim pembaruan ke backend dan mencatatnya ke sheet **`JadwalPiketSecurity`** di spreadsheet tanpa perlu reload halaman.
6. Badge warna shift pada tabel akan berubah seketika dan jadwal checklist petugas bersangkutan langsung terupdate.

---

### 4.5 Modul Verifikasi & Approval Laporan Bulanan Tenaga Alih Daya

Fasilitas resmi bagi Kasubbag Umum / PPK untuk memverifikasi dan menandatangani persetujuan laporan bulanan sebagai dasar evaluasi kinerja dan kelengkapan administrasi pembayaran alih daya:

```
+-------------------------------------------------------------------------------+
|  MODAL VERIFIKASI & APPROVAL LAPORAN BULANAN                                  |
+-------------------------------------------------------------------------------+
|  Unit Kerja        : [ Kebersihan (CS) v ]                                    |
|  Periode Laporan   : September 2026                                           |
|  Nama Verifikator  : Kasubbag Umum / PPK                                      |
|  Catatan Evaluasi  : [ Seluruh area lantai 1-3 bersih, tingkatkan toilet lt2] |
|                                                                               |
|  [ Batal ]                        [ ✓ Simpan Verifikasi & Setujui Laporan ]   |
+-------------------------------------------------------------------------------+
```

#### Langkah-langkah Melakukan Approval:
1. Pada Dashboard Supervisor, periksa kartu status **Persetujuan Laporan Bulanan** (tersedia untuk unit CS, PST, Security, atau Keseluruhan).
2. Klik tombol **Verifikasi Sekarang** pada kartu unit yang bersangkutan, atau klik tombol **Approval Bulanan** di banner atas.
3. Dialog pop-up verifikasi akan terbuka:
   * Pilih **Unit Kerja** yang disetujui (*CS*, *PELAYANAN*, *SECURITY*, atau *SEMUA UNIT*).
   * Masukkan **Nama Verifikator** (otomatis terisi nama supervisor yang login).
   * Ketikkan **Catatan Evaluasi / Rekomendasi Manajerial** untuk unit kerja tersebut.
4. Klik tombol **Simpan Verifikasi & Setujui Laporan**.
5. Sistem mencatat persetujuan ke sheet **`Monthly_Approvals`** di database spreadsheet lengkap dengan ID unik, timestamp, dan catatan.
6. Kartu status di dashboard akan langsung berubah menjadi badge hijau: **TELAH DIVERIFIKASI & DISETUJUI** disertai nama verifikator, tanggal, dan catatan evaluasi.

---

## 5. Panduan Modul: Quality Assurance (Inspeksi Mutu Terpadu)

Modul **Quality Assurance (QA)** kini diperluas untuk mengaudit **seluruh aspek mutu layanan dan sarana kantor**, tidak terbatas hanya pada kebersihan saja.

```
+-------------------------------------------------------------------------------+
|  FORMULIR INSPEKSI & AUDIT MUTU TERPADU                                       |
+-------------------------------------------------------------------------------+
|  1. Kategori Mutu: [ 🛡️ Keamanan & Patroli v ]                                |
|  2. Area Objek   : [ Pos Satpam & Barrier Gate v ]   Lantai: [ Luar/Halaman ] |
|  3. Tanggal Sidak: [ 2026-09-21 ]                                             |
|  4. Skor Mutu    : [ ⭐ ] [ ⭐ ] [ ⭐ ] [ ⭐ ] [ ⭐ ]  -> (5.0 - Sangat Baik)   |
|  5. Catatan      : [ Palang barrier gate berfungsi prima, buku tamu tertib ]  |
|  6. URL Foto     : [ https://drive.google.com/.../foto_temuan.jpg ]           |
|                                                                               |
|                           [ 💾 Simpan Hasil Audit ]                           |
+-------------------------------------------------------------------------------+
| REKAPITULASI RATA-RATA SKOR PER ASPEK MUTU:                                   |
| [ 🧹 Kebersihan: 4.8 ⭐ ] [ 🛡️ Keamanan: 4.9 ⭐ ] [ 👥 Pelayanan: 5.0 ⭐ ] [ ⚙️ Sarpras: 4.6 ⭐ ] |
+-------------------------------------------------------------------------------+
| TIMELINE RIWAYAT AUDIT TERKINI:                                               |
| [21 Sep] [Keamanan] Pos Satpam - 5 ⭐ ("Tertib & Siaga") oleh Kasubbag Umum   |
| [20 Sep] [Kebersihan] Toilet Lt 2 - 4 ⭐ ("Wastafel bersih") oleh Supervisor  |
| [19 Sep] [Pelayanan] Loket PST - 5 ⭐ ("Display brosur rapi") oleh Supervisor |
+-------------------------------------------------------------------------------+
```

### 5.1 4 Kategori Aspek Mutu
Supervisor dapat memilih kategori inspeksi yang sesuai dari dropdown:
1. **🧹 Kebersihan**: Kebersihan toilet, koridor, ruang rapat, mushola, ruang kerja, dan kaca.
2. **🛡️ Keamanan**: Kesiapsiagaan pos satpam, kepatuhan buku tamu, ketertiban parkir kendaraan, fungsi CCTV, dan patroli perimeter.
3. **👥 Pelayanan**: Kesiapan loket PST, keramahan front office, ruang konsultasi statistik, dan fasilitas ramah difabel/anak.
4. **⚙️ Sarana & Prasarana**: Kesiapan genset, penerangan, sistem pendingin AC, pompa air/tandon, dan kesiapan APAR.

---

### 5.2 Formulir Penilaian Cepat Rating Bintang 1–5 & Preset Area
* **Preset Area Dinamis**: Saat memilih kategori mutu, daftar dropdown area objek sidak otomatis menyesuaikan (misal memilih *Keamanan* menampilkan *Pos Satpam*, *Barrier Gate*, *CCTV Control*, dsb).
* **Rating Bintang Universal (1–5 ⭐)**:
  * ⭐ (1 Bintang): **Buruk** (Banyak kekurangan, tidak sesuai SOP).
  * ⭐⭐ (2 Bintang): **Kurang** (Kurang tertib / ada kendala operasional).
  * ⭐⭐⭐ (3 Bintang): **Cukup** (Kondisi standar, ada poin catatan pembenahan).
  * ⭐⭐⭐⭐ (4 Bintang): **Baik** (Tertib, bersih, berfungsi baik sesuai SOP).
  * ⭐⭐⭐⭐⭐ (5 Bintang): **Sangat Baik** (Prima, higienis, sempurna, memuaskan).

---

### 5.3 Catatan Evaluasi & Dokumentasi Foto Temuan
* **Catatan Evaluasi**: Tuliskan temuan positif atau aspek yang perlu dibenahi oleh petugas bersangkutan.
* **URL Foto Bukti**: Tautkan link foto dokumentasi dari Google Drive / Google Photos jika ada temuan khusus.

---

### 5.4 Widget Skor Mutu Per Kategori Aspek & Timeline Riwayat Audit
* **4 Kartu Skor Aspek**: Menampilkan rata-rata skor bintang untuk masing-masing pilar (*Kebersihan*, *Keamanan*, *Pelayanan*, *Sarpras*).
* **Timeline Riwayat Audit**: Daftar kronologis seluruh audit mutu lengkap dengan badge warna kategori, skor bintang, catatan, nama auditor, dan tautan foto.

---

### 5.5 Fitur Pintas "Audit Cepat" dari Tabel Pegawai
Pada Dashboard Supervisor, klik tombol **[Sidak]** di samping nama pegawai untuk otomatis memilih kategori unit dan mengisi area kerja pegawai tersebut.

---

## 6. Panduan Modul: Dashboard Personal Pegawai Pelaksana

Bagi petugas operasional (CS, PST, Satpam), halaman dashboard personal memberikan ringkasan status tugas harian pribadi pada bulan berjalan:
* **Kartu Sambutan**: Ucapan selamat bertugas dan nama pegawai yang login.
* **Statistik 4 Kartu**:
  * *Total Checklist*: Jumlah kegiatan yang harus dikerjakan pada bulan ini.
  * *Selesai (Hijau)*: Tugas yang sudah dicentang selesai (*TRUE*).
  * *Belum (Merah)*: Tugas yang masih tersisa (*FALSE*).
  * *Persentase Kepatuhan*: Persentase ketercapaian kegiatan.
* **Progress Bar Per Ruangan**: Rincian ketercapaian checklist untuk setiap ruangan yang ditugaskan.
* **Tombol Pintas Aksi**: Pintasan untuk langsung membuka lembar checklist monitoring harian atau grafik rekapitulasi.

---

## 7. Panduan Modul: Monitoring Kebersihan & Pelayanan

Modul ini adalah lembar kerja utama untuk mencatat dan menandai pelaksanaan tugas sehari-hari bagi petugas kebersihan dan pelayanan.

```
Pilihan Periode: [ [Harian (Default)] | [Mingguan] | [Bulanan] ]
---------------------------------------------------------------------------------------
Sub-Nav Harian : [ Hari Ini ] | [<] Mg 1 (1-6) [>] | [Sen 1] [Sel 2] [Rab 3] [Kam 4] ...
Format Tampilan: [ (o) Format Kartu ] [ ( ) Format Tabel ]
Filter Bar     : [ Filter Ruangan: Semua v ] [ Filter Status: Semua v ] [ Cari Kegiatan... ]
```

### 7.1 Mode Tampilan Harian
Mode Harian merupakan format yang paling praktis dan fokus untuk operasional sehari-hari di ponsel maupun komputer:

#### A. Format Kartu (Cards)
* Daftar kegiatan dikelompokkan berdasarkan nama ruangan untuk **satu tanggal terpilih**.
* **Item Belum Selesai**: Berlatar merah muda dengan tombol **Centang Selesai**. Klik kartu untuk mencentang.
* **Item Sudah Selesai**: Berlatar hijau dengan badge **✓ TRUE** dan teks kegiatan tercoret rapi.

#### B. Format Tabel (Table)
* Menampilkan daftar kegiatan dalam baris tabel dengan kolom tanggal di sisi kanan.
* Kotak merah menandakan belum dikerjakan, kotak hijau menandakan telah selesai.

#### C. Navigasi Slider Tanggal
* **Tombol Hari Ini**: Langsung melompat ke tanggal hari ini secara instan.
* **Pills Tanggal**: Kotak tanggal kalender (1, 2, 3, dst.) dengan nama hari.
* **Navigasi Minggu (Mg 1 s/d Mg 5)**: Memilih rentang kelompok tanggal pekan kalender.

---

### 7.2 Mode Tampilan Mingguan & Bulanan
* **Mode Mingguan**: Menampilkan matriks kegiatan untuk 1 minggu kalender penuh (Senin s/d Minggu).
* **Mode Bulanan**: Menampilkan matriks kegiatan satu bulan penuh yang dilengkapi pembagian per minggu kalender agar tampilan tabel tidak meluber dan nyaman dibaca di layar.

---

### 7.3 Fitur Filter Ruangan, Status, dan Pencarian Cepat
1. **Filter Ruangan**: Memilih satu ruangan tertentu atau menampilkan seluruh ruangan.
2. **Filter Status**:
   * *Semua Item Checkbox*: Menampilkan semua kegiatan.
   * *Belum Dicentang (Kotak Merah)*: Hanya menampilkan tugas yang belum selesai (memudahkan memeriksa sisa pekerjaan).
   * *Sudah Dicentang (TRUE)*: Hanya menampilkan tugas yang sudah tuntas.
3. **Pencarian Cepat**: Ketik kata kunci (misal: *pel*, *wastafel*, *kaca*, *sampah*, *air galon*) untuk menemukan item tugas seketika.

---

### 7.4 Aturan Penguncian Data (Hari Ini vs Tanggal Lampau)

| Kondisi Tanggal | Status Saat Ini | Aksi Saat Diklik | Logika & Penjelasan Sistem |
| :--- | :---: | :---: | :--- |
| **Hari Ini** | Belum (Merah) | Menjadi **Selesai (Hijau / TRUE)** | Menandai tugas hari ini berhasil dikerjakan. |
| **Hari Ini** | Selesai (Hijau) | Berubah kembali menjadi **Belum (Merah)** | **Dapat Dibatalkan:** Mencegah salah klik pada hari berjalan. |
| **Tanggal Lampau** | Selesai (Hijau) | **Terkunci 🔒 (Kunci Otomatis)** | Menjaga validitas dan integritas data riwayat pekerjaan. |
| **Tanggal Lampau** | Belum (Merah) | Dapat diisi menjadi **Selesai (TRUE)** | Mengakomodasi pengisian susulan jika baru sempat mencatat. |

---

### 7.5 Penanganan Otomatis Hari Libur (Sabtu & Minggu)
* Hari **Sabtu** dan **Minggu** otomatis diidentifikasi sebagai **Hari Libur Kerja**.
* Pada mode harian, muncul banner informatif *Hari Libur - Seluruh checklist tugas tidak wajib diisi pada hari ini.*
* Pada tabel matriks, kolom hari libur diberi label *Libur* dan berlatar aksen lembut.

---

## 8. Panduan Modul: Monitoring & Piket Keamanan (Satpam)

Modul khusus bagi **Petugas Keamanan / Satpam** yang terhubung langsung dengan jadwal piket security kantor.

```
+-------------------------------------------------------------------------------+
| Ringkasan Shift: [Total: 22 Hari] [Pagi: 10] [Sore: 6] [Malam: 6]             |
|-------------------------------------------------------------------------------|
| Kalender Shift : [ 1 Sen - Pagi ] [ 2 Sel - Pagi ] [ 3 Rab - Malam ] ...      |
|-------------------------------------------------------------------------------|
| Tanggal Terpilih: Senin, 1 September 2026 - Shift Pagi (06.00 - 16.00)        |
| Pencapaian Tugas: 7 / 7 Selesai (100%)                                        |
| [v] Mengatur lalu lintas dan membantu menyeberangkan karyawan ke kantor       |
| [v] Mengatur dan mengarahkan parkiran kendaraan roda-4                        |
| [v] Menyambut dan membukakan pintu kendaraan pimpinan                         |
| [v] Patroli keamanan gedung dan memeriksa area kantor melalui CCTV            |
+-------------------------------------------------------------------------------+
```

### 8.1 Ringkasan Distribusi Shift Kerja Bulanan
Di bagian atas modul terdapat 4 kartu informasi shift:
* **Total Hari Kerja**: Jumlah hari dinas aktif dalam 1 bulan.
* **Shift Pagi**: Jumlah dinas Pagi (06.00 – 16.00).
* **Shift Sore**: Jumlah dinas Sore (15.30 – 23.30).
* **Shift Malam**: Jumlah dinas Malam (23.00 – 07.30).

### 8.2 Memilih Tanggal & Membaca Legenda Shift
* 🔵 **Pagi (P)**: Dinas Pagi.
* 🟡 **Sore (S)**: Dinas Sore.
* 🟣 **Malam (M)**: Dinas Malam.
* ⚪ **Libur (O)**: Lepas Dinas / Bebas Tugas.
* Klik kotak tanggal pada kalender shift untuk memuat checklist tugas jaga sesuai jadwal dinas tanggal tersebut.

### 8.3 Pengisian Checklist Tugas Sesuai Jam Dinas
Daftar checklist otomatis menyesuaikan kode shift pada tanggal yang dipilih:
1. **Shift Pagi (P)**:
   * Menampilkan tugas: **PAGI (06.00–07.30)** *(penyeberangan jalan, parkir pimpinan & karyawan, pagar utama)* dan tugas **SELAMA JAM KERJA (07.30–16.00)** *(patroli CCTV tiap 2 jam, buku tamu, pengawasan aset)*.
2. **Shift Sore (S) atau Malam (M)**:
   * Menampilkan tugas: **MALAM (23.00–07.30)** *(patroli keliling gedung, memastikan seluruh pintu/jendela/ruangan terkunci rapat, memadamkan lampu/AC yang menyala, pencegahan kebakaran & pencurian)*.
3. **Status Libur (O)**:
   * Menampilkan keterangan bebas dinas pengamanan.
4. **Cara Mencentang**:
   * Klik baris tugas untuk menandai selesai. Persentase pencapaian shift akan bertambah secara instan.

---

## 9. Panduan Modul: Rekapitulasi & Penanganan Kendala (Error State & Coba Lagi)

Modul Rekapitulasi menyajikan analisis visual dan tabular untuk pelaporan bulanan dengan proteksi integritas data:

```
+-------------------------------------------------------------------------------+
|  KONDISI KETIKA REKAPITULASI MENGALAMI KENDALA (ERROR STATE)                  |
+-------------------------------------------------------------------------------+
|  ⚠️ Gagal Memuat Data Rekapitulasi                                             |
|  Terjadi kendala saat menyusun data rekapitulasi: [Koneksi jaringan terputus] |
|  Silakan periksa koneksi internet Anda atau coba muat ulang data.             |
|                                                                               |
|                      [ 🔄 Coba Lagi (Muat Ulang Data) ]                       |
+-------------------------------------------------------------------------------+
```

### 9.1 Penanganan Kegagalan Rekapitulasi & Tombol Coba Lagi
* **Proteksi Tampilan Palsu**: Jika terjadi kegagalan jaringan atau kendala pembacaan spreadsheet, sistem **tidak akan** menampilkan grafik kosong yang menyesatkan seolah-olah data 0% atau berhasil.
* **Kotak Peringatan Interaktif**: Menampilkan kotak pesan error berlatar merah/oranye lengkap dengan penyebab teknis kegagalan.
* **Tombol Coba Lagi**: Pengguna cukup mengklik tombol **Coba Lagi (Muat Ulang Data)** untuk melakukan sinkronisasi ulang tanpa perlu me-refresh seluruh halaman browser.

---

### 9.2 Grafik Tren Harian & Grafik Pencapaian Ruangan
1. **Grafik Tren Kepatuhan Checklist Harian (Line Chart)**:
   * Menggambarkan kurva fluktuasi jumlah kegiatan yang diselesaikan dari tanggal 1 hingga akhir bulan.
2. **Grafik Pencapaian Berdasarkan Ruangan (Bar Chart)**:
   * Menampilkan perbandingan diagram batang hijau (selesai) vs batang abu-abu (target) untuk setiap area kerja.

### 9.3 Tabel Matriks Rekapitulasi Per Ruangan
Menyajikan tabel rincian data:
* Nama Ruangan / Area
* Jumlah Item Tugas
* Total Target Checklist 1 Bulan
* Jumlah Tugas Berhasil Diselesaikan
* Persentase Capaian (%)
* Bar Indikator Warna Kinerja

---

## 10. Panduan Modul: Profil Akun & Ganti Kredensial Mandiri

Modul Profil memungkinkan pegawai memeriksa identitas akun serta memperbarui username dan password login secara mandiri tanpa harus meminta bantuan admin spreadsheet.

```
+-------------------------------------------------------------------------------+
| [Avatar]  Nama Pegawai (@username)           [Role: SUPERVISOR / CS / DLL]    |
|-------------------------------------------------------------------------------|
| [Formulir Pembaruan Kredensial Akun]                                          |
| Password Saat Ini *        : [ •••••••• ]                                     |
| Username Baru *            : [ slamet ]                                       |
| Password Baru              : [ •••••••• ] (Minimal 4 karakter)                |
| Konfirmasi Password Baru   : [ •••••••• ]                                     |
|                                                                               |
|                     [ 💾 Simpan Perubahan Kredensial ]                        |
+-------------------------------------------------------------------------------+
```

### Langkah Mengubah Username & Password:
1. Buka menu **Profil Akun** di navigasi sidebar.
2. Masukkan **Password Saat Ini** pada kolom verifikasi keamanan.
3. Masukkan **Username Baru** jika ingin mengganti nama pengguna login (minimal 3 karakter).
4. Masukkan **Password Baru** (minimal 4 karakter) dan ketik ulang pada **Konfirmasi Password Baru**. *(Biarkan kolom password baru kosong jika Anda hanya ingin mengganti username).*
5. Klik tombol **Simpan Perubahan Kredensial**.
6. Sistem memverifikasi password lama dan seketika memperbarui sheet **`Users`** pada Google Spreadsheet.
7. Muncul notifikasi sukses berwarna hijau. Gunakan kredensial baru tersebut untuk login berikutnya.

---

## 11. Tanya Jawab (FAQ) & Solusi Kendala Teknis

#### Q1: Siapa saja yang dapat melihat Dashboard Supervisor, mengubah Jadwal Satpam, dan melakukan Approval?
> **Jawaban:** Hanya akun dengan peran **SUPERVISOR** (Kasubbag Umum / PPK / Koordinator) dan **ADMIN** (Admin TI) yang memiliki wewenang untuk membuka Dashboard Pengawasan, mengedit matriks Jadwal Piket Security, mengisi formulir Sidak Mutu (QA), serta menandatangani Approval Laporan Bulanan.

#### Q2: Apa saja yang bisa dinilai pada modul Quality Assurance (QA) sekarang?
> **Jawaban:** Modul QA kini mencakup 4 pilar mutu terpadu: **Kebersihan** (ruangan, toilet, koridor), **Keamanan** (pos satpam, CCTV, barrier gate), **Pelayanan** (loket PST, keramahan, ruang tunggu), dan **Sarana & Prasarana** (genset, AC, APAR, pompa air).

#### Q3: Bagaimana jika Supervisor ingin menukar jadwal dinas petugas keamanan?
> **Jawaban:** Pada Dashboard Supervisor, klik tombol **Jadwal Satpam** di banner atas atau tombol **Shift** di tabel pegawai unit keamanan. Matriks kalender satpam akan terbuka. Klik cell shift tanggal yang ingin diubah lalu pilih kode shift baru (`P`, `S`, `M`, atau `O`). Perubahan langsung tersimpan ke sheet `JadwalPiketSecurity`.

#### Q4: Mengapa muncul kotak peringatan merah saat saya membuka menu Rekapitulasi?
> **Jawaban:** Kotak tersebut menandakan bahwa aplikasi mengalami kendala saat membaca data spreadsheet (misalnya jaringan internet sempat terputus). Cukup klik tombol **Coba Lagi (Muat Ulang Data)** di dalam kotak tersebut untuk memuat ulang data.

#### Q5: Mengapa saya tidak bisa membatalkan centang (TRUE) pada tanggal yang sudah lewat beberapa hari lalu?
> **Jawaban:** Untuk menjamin akuntabilitas data, checklist pada tanggal lampau yang sudah berstatus selesai (*TRUE*) terkunci secara otomatis oleh sistem. Pembatalan centang hanya diperbolehkan untuk checklist pada **Hari Ini**.

#### Q6: Di mana data hasil Sidak Mutu (QA) disimpan?
> **Jawaban:** Seluruh data penilaian bintang, kategori aspek mutu, area objek, lantai, auditor, catatan evaluasi, dan tautan foto temuan otomatis tersimpan di sheet **`Quality_Audits`** pada spreadsheet database SIMPEL-KU.

#### Q7: Saya lupa password akun saya, bagaimana cara resetnya?
> **Jawaban:** Hubungi Admin TI atau Kasubbag Umum BPS Provinsi Kalimantan Barat. Admin dapat mereset password akun Anda secara langsung melalui sheet `Users` di Google Spreadsheet.

---

**Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum (SIMPEL-KU)**  
*Subbagian Umum / Tim TI - BPS Provinsi Kalimantan Barat*  
*Versi Aplikasi: 3.5 (Multi-Aspect QA, Unit Segregation, Error Handling & Security Shift Matrix)*


