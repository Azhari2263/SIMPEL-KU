# 📘 BUKU PANDUAN PENGGUNAAN APLIKASI
## **SIMPEL-KU**
### *(Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum)*
**Badan Pusat Statistik (BPS) Provinsi Kalimantan Barat**

---

## 📑 DAFTAR ISI
1. [Tentang Aplikasi SIMPEL-KU](#1-tentang-aplikasi-simpel-ku)
2. [Sistem Multi-Role dan Hak Akses Berjenjang](#2-sistem-multi-role-dan-hak-akses-berjenjang)
3. [Akses dan Autentikasi Pengguna](#3-akses-dan-autentikasi-pengguna)
   - 3.1 Membuka Aplikasi & Persyaratan Browser
   - 3.2 Prosedur Login Akun
   - 3.3 Sesi Aman & Prosedur Logout
4. [Mengenal Antarmuka & Tata Letak Sistem](#4-mengenal-antarmuka--tata-letak-sistem)
   - 4.1 Sidebar & Fitur Collapse Ramping
   - 4.2 Topbar & Pemilih Periode Global (Bulan/Tahun)
   - 4.3 Navigasi Dinamis Berbasis Peran
5. [Panduan Modul: Dashboard Supervisor & Kasubbag Umum](#5-panduan-modul-dashboard-supervisor--kasubbag-umum)
   - 5.1 Kartu Metrik Utama Pengawasan Manajerial
   - 5.2 Status Inspeksi Mutu & Ringkasan Shift Keamanan
   - 5.3 Rekapitulasi Kinerja Per Unit (Kebersihan, Pelayanan, Keamanan)
   - 5.4 Rekapitulasi Progres Pegawai & Modal Rincian Tugas
   - 5.5 Visualisasi Grafik Tren & Rekapitulasi Terpadu
   - 5.6 Penanganan Error & Tombol Coba Lagi (Retry)
6. [Panduan Modul: Monitoring Terpadu (Admin & Supervisor)](#6-panduan-modul-monitoring-terpadu-admin--supervisor)
   - 6.1 Filter Multi-Kriteria (Unit, Pegawai, Ruangan, Status, Periode)
   - 6.2 Navigasi Tanggal & Mode Harian/Mingguan/Bulanan
   - 6.3 Kartu & Matriks Checklist Kegiatan
7. [Panduan Modul: Pengaturan & Pertukaran Shift Security](#7-panduan-modul-pengaturan--pertukaran-shift-security)
   - 7.1 Matriks Jadwal Piket Petugas Satpam Bulanan
   - 7.2 Kode Shift Kerja: P, S, M, O (Off / Bebas Tugas)
   - 7.3 Mengubah Shift Kerja Cepat Per Tanggal
   - 7.4 Pertukaran Shift Antar Petugas (Fitur Swap)
8. [Panduan Modul: Inspeksi Mutu Lintas Unit](#8-panduan-modul-inspeksi-mutu-lintas-unit)
   - 8.1 Evaluasi Mutu Standar Layanan BPS Kalbar
   - 8.2 Skala Penilaian Skor Mutu (1-5 Bintang) & Kelayakan
   - 8.3 Menambahkan Rekam Inspeksi Mutu Baru
   - 8.4 Memfilter & Memantau Rekam Mutu Serta Rekomendasi
9. [Panduan Modul: Dashboard & Monitoring Staf Teknis](#9-panduan-modul-dashboard--monitoring-staf-teknis)
   - 9.1 Dashboard Personal Staf
   - 9.2 Checklist Kebersihan & Standar Pelayanan
   - 9.3 Aturan Pengisian (Hari Ini vs Tanggal Lampau Terkunci)
   - 9.4 Monitoring Jadwal Shift Petugas Keamanan (Personal)
10. [Panduan Modul: Profil Akun & Ganti Kredensial](#10-panduan-modul-profil-akun--ganti-kredensial)
    - 10.1 Melihat Detail Informasi Akun & NIP
    - 10.2 Prosedur Mengubah Username & Password Mandiri
11. [Daftar Akun Pengguna & Default Kredensial](#11-daftar-akun-pengguna--default-kredensial)
12. [Tanya Jawab (FAQ) & Penyelesaian Masalah](#12-tanya-jawab-faq--penyelesaian-masalah)

---

## 1. Tentang Aplikasi SIMPEL-KU

**SIMPEL-KU** (*Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum*) adalah aplikasi operasional dan pengawasan manajerial berbasis web yang dirancang khusus untuk memonitor, mencatat, mengevaluasi, dan merekapitulasi pelaksanaan tugas harian seluruh staf pendukung operasional kantor di lingkungan **Badan Pusat Statistik (BPS) Provinsi Kalimantan Barat**.

### 🌟 Nilai Tambah & Fitur Unggulan SIMPEL-KU:
* **Pengawasan Manajerial Terpusat (Supervisor Dashboard)**: Memberikan pimpinan dan pengawas ringkasan eksekutif menyeluruh mulai dari target, kepatuhan checklist, distribusi beban shift satpam, hingga rekam inspeksi mutu layanan.
* **Sistem Multi-Role & Otorisasi Berjenjang**: Memisahkan kewenangan pimpinan/pengawas dengan petugas pelaksana teknis secara ketat tanpa tumpang tindih menu.
* **Modul Inspeksi Mutu Lintas Unit**: Memungkinkan Kasubbag Umum, Tim Humas, dan Korlap melakukan audit kualitas mutu kebersihan, keamanan pos, dan standar pelayanan resepsionis/PST dengan rating bintang dan rekomendasi perbaikan.
* **Pengaturan & Pertukaran Shift Security**: Fleksibilitas mengubah atau menukar jadwal shift kerja satpam (*Pagi, Sore, Malam, Off*) secara atomik langsung ke database Google Sheets.
* **Integritas Data Valid**: Menerapkan aturan penguncian (*lock*) data tanggal lampau yang sudah berstatus selesai (*TRUE*), serta perlindungan pembatalan hanya untuk hari kerja berjalan.

---

## 2. Sistem Multi-Role dan Hak Akses Berjenjang

Aplikasi SIMPEL-KU membagi peran pengguna menjadi beberapa level hak akses:

| Peran (Role) | Unit Kerja | Deskripsi Wewenang | Menu Utama yang Diakses |
| :--- | :--- | :--- | :--- |
| **Admin** | Manajemen | Administrator teknis sistem dengan wewenang konfigurasi database, jadwal shift, dan evaluasi. | Dashboard Supervisor, Rekap Monitoring, Monitoring Terpadu, Jadwal & Shift Security, Inspeksi Mutu, Profil Akun |
| **Supervisor / Kabag Umum** | Manajemen | Pengawasan manajerial operasional kantor, penetapan shift satpam, monitoring mutu, dan analisis tren kepatuhan. | Dashboard Supervisor, Rekap Monitoring, Monitoring Terpadu, Jadwal & Shift Security, Inspeksi Mutu, Profil Akun |
| **Tim Umum dan Humas** | Umum / Humas | Pengawasan pelayanan PST, kebersihan area publik, audit standar layanan tamu, dan inspeksi mutu. | Dashboard Supervisor, Rekap Monitoring, Monitoring Terpadu, Inspeksi Mutu, Profil Akun |
| **Koordinator Lapangan (Korlap)** | Umum / Operasional | Koordinasi teknis lapangan, inspeksi operasional, dan pengelolaan kesiapsiagaan shift satpam. | Dashboard Supervisor, Monitoring Terpadu, Jadwal & Shift Security, Inspeksi Mutu, Profil Akun |
| **Petugas Kebersihan** | Kebersihan | Pelaksana teknis kebersihan ruangan, toilet, lobby, dan lingkungan gedung kantor BPS Kalbar. | Dashboard Personal, Monitoring Kebersihan, Rekapitulasi Ruangan Pribadi, Profil Akun |
| **Petugas Pelayanan** | Pelayanan | Pelaksana standar operasional front office, resepsionis, buku tamu, dan Pelayanan Statistik Terpadu (PST). | Dashboard Personal, Monitoring Pelayanan, Rekapitulasi Pribadi, Profil Akun |
| **Petugas Keamanan (Satpam)** | Keamanan | Petugas pengamanan kantor, pos jaga, patroli berkala, penyeberangan jalan, dan lalu lintas kendaraan. | Monitoring Keamanan (Jadwal Shift & Tugas), Profil Akun |

---

## 3. Akses dan Autentikasi Pengguna

### 3.1 Membuka Aplikasi & Persyaratan Browser
Aplikasi dapat dibuka melalui browser web modern (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari) baik pada komputer/laptop maupun tablet dan smartphone melalui tautan resmi yang telah disediakan.

### 3.2 Prosedur Login Akun
1. Buka laman utama SIMPEL-KU.
2. Masukkan **Username** akun Anda.
3. Masukkan **Password** akun Anda.
4. *(Opsional)* Klik ikon mata (<i class="fa-solid fa-eye"></i>) untuk memastikan kata sandi terketik dengan benar.
5. Klik tombol **Masuk ke Dashboard**.
6. Sistem akan memverifikasi kredensial ke sheet `Users` dan otomatis mengarahkan ke dashboard yang sesuai dengan peran Anda.

### 3.3 Sesi Aman & Prosedur Logout
* Sesi login berlaku selama **6 Jam**. Setelah 6 jam tidak aktif, sesi akan kedaluwarsa secara otomatis untuk menjaga keamanan data.
* Untuk keluar, klik tombol **Keluar** pada bagian bawah sidebar atau melalui menu **Profil Akun**.

---

## 4. Mengenal Antarmuka & Tata Letak Sistem

### 4.1 Sidebar & Fitur Collapse Ramping
* **Sidebar Desktop**: Berisi identitas login Anda, NIP/Role, dan daftar menu aktif.
* **Fitur Ciutkan (Collapse)**: Klik ikon panah di pojok kanan atas sidebar untuk menciutkan sidebar menjadi ikon ramping (lebar 80px) agar area tabel monitoring lebih luas.
* **Drawer Mobile**: Pada layar HP, sidebar dapat dibuka-tutup dengan menekan tombol menu hamburger di sudut kiri atas.

### 4.2 Topbar & Pemilih Periode Global (Bulan/Tahun)
Di baris atas layar terdapat:
* **Judul & Subjudul Halaman Aktif**.
* **Dropdown Bulan & Tahun Global**: Mengubah bulan atau tahun pada pemilih ini otomatis memperbarui seluruh data di halaman aktif.
* **Tombol Segarkan (Refresh)**: Klik tombol ikon putar untuk memuat ulang data terkini dari spreadsheet.

---

## 5. Panduan Modul: Dashboard Supervisor & Kasubbag Umum

Dashboard ini berfungsi sebagai pusat kendali pengawasan manajerial operasional kantor:

### 5.1 Kartu Metrik Utama Pengawasan Manajerial
* **Total Monitoring**: Akumulasi seluruh target checklist dari semua staf teknis aktif.
* **Selesai Terlaksana**: Jumlah checklist yang telah dicentang hijau (*TRUE*).
* **Belum Dikerjakan**: Jumlah kegiatan checklist yang masih berstatus kotak merah (*FALSE*).
* **Tingkat Kepatuhan**: Persentase ketercapaian operasional dengan indikator warna progress bar (*Hijau: >=90%, Biru: >=70%, Merah: <70%*).

### 5.2 Status Inspeksi Mutu & Ringkasan Shift Keamanan
* **Kartu Status Mutu**: Menampilkan skor rata-rata mutu keseluruhan (skala 1-5 bintang), predikat mutu (*Sangat Baik, Memenuhi Standar, Perlu Perbaikan*), dan total laporan inspeksi.
* **Kartu Kesiapsiagaan Shift Keamanan**: Menampilkan jumlah dan nama-nama petugas satpam yang bertugas hari ini pada Shift Pagi (P), Shift Sore (S), Shift Malam (M), serta Shift Off (O).

### 5.3 Rekapitulasi Kinerja Per Unit
Menyajikan 3 kartu ringkasan terpisah untuk:
1. **Unit Kebersihan**: Target kegiatan, selesai, belum, dan persentase kepatuhan area kebersihan.
2. **Unit Pelayanan**: Target SOP resepsionis & PST, tingkat pemenuhan, dan persentase kepatuhan.
3. **Unit Keamanan**: Kesiapsiagaan tugas pengamanan gedung dan kehadiran shift.

### 5.4 Rekapitulasi Progres Pegawai & Modal Rincian Tugas
Tabel ini memuat seluruh nama pegawai, NIP, Unit Kerja, total target, checklist selesai, belum, dan progress bar.
* Klik tombol **Detail** pada baris pegawai untuk membuka jendela popup (*modal*) rincian seluruh tugas dan progres checklist per ruangan yang menjadi tanggung jawab pegawai tersebut.

### 5.5 Visualisasi Grafik Tren & Rekapitulasi Terpadu
Tepat di bagian bawah dashboard supervisor disajikan:
* **Grafik Tren Harian**: Garis pergerakan penyelesaian checklist dari tanggal 1 sampai akhir bulan.
* **Grafik Pencapaian Ruangan**: Perbandingan tingkat kepatuhan antar ruangan kantor.

### 5.6 Penanganan Error & Tombol Coba Lagi (Retry)
Jika koneksi spreadsheet mengalami kendala sesaat saat memuat data rekapitulasi, sistem akan menampilkan kotak peringatan *"Gagal Memuat Data Pengawasan"* yang dilengkapi tombol **Coba Lagi** (*Retry*) untuk memicu penarikan data ulang tanpa perlu memuat ulang seluruh halaman web.

---

## 6. Panduan Modul: Monitoring Terpadu (Admin & Supervisor)

Modul ini menggabungkan pemantauan seluruh unit operasional ke dalam 1 tampilan:

### 6.1 Filter Multi-Kriteria
Pengawas dapat menyaring data secara presisi menggunakan:
1. **Filter Unit**: Semua Unit, Unit Kebersihan, Unit Pelayanan, atau Unit Keamanan.
2. **Filter Pegawai**: Semua Pegawai atau memilih salah satu petugas tertentu.
3. **Filter Ruangan / Area**: Memilih area spesifik (misal: Ruang Kepala Kantor, PST, Pos Keamanan, dll.).
4. **Filter Status**: Semua Status, Selesai Dikerjakan (Hijau), atau Belum Dikerjakan (Merah).
5. **Pencarian Kegiatan**: Mengetik kata kunci kegiatan atau nama petugas.

### 6.2 Mode Periode & Pemilih Tanggal
* **Harian (Default)**: Slider baris tanggal 1 s.d. 31 yang dapat diklik untuk memantau hari tertentu.
* **Mingguan**: Tombol filter Minggu ke-1 s.d. Minggu ke-5.
* **Bulanan**: Tampilan akumulasi checklist satu bulan penuh.

---

## 7. Panduan Modul: Pengaturan & Pertukaran Shift Security

Modul ini memungkinkan Admin, Supervisor, dan Korlap mengelola jadwal satpam secara fleksibel:

### 7.1 Matriks Jadwal Piket Petugas Satpam Bulanan
Tabel horizontal yang menampilkan nama seluruh petugas satpam pada kolom kiri dan kolom tanggal 1 sampai 31 di sebelah kanan, disertai kolom ringkasan total shift (P, S, M, O) dan Total Hari Kerja aktif.

### 7.2 Kode Shift Kerja:
* **`P` (Pagi)**: Pukul 06.00 – 16.00 WIB (Kewajiban tugas penyeberangan, parkir, dan pos pagi).
* **`S` (Sore)**: Pukul 15.30 – 23.30 WIB (Kewajiban pengawasan jam pulang dan operasional sore).
* **`M` (Malam)**: Pukul 23.00 – 07.30 WIB (Kewajiban patroli malam, kunci pintu/jendela, dan CCTV).
* **`O` (Off / Libur)**: Bebas tugas (*tidak dihitung sebagai beban kewajiban kerja bulanan*).

### 7.3 Mengubah Shift Kerja Cepat Per Tanggal
1. Buka menu **Jadwal & Shift Security**.
2. Klik langsung pada sel shift kotak tanggal yang ingin diubah.
3. Dialog pop-up ubah shift akan terbuka.
4. Pilih shift baru (P, S, M, atau O).
5. Klik **Simpan Shift**. Sistem akan langsung menyimpan perubahan ke sheet `JadwalPiketSecurity`.

### 7.4 Pertukaran Shift Antar Petugas (Fitur Swap)
1. Klik tombol **Tukar Shift (Swap)** di pojok kanan atas.
2. Pilih tanggal pertukaran.
3. Pilih **Petugas Pertama** dan **Petugas Kedua**.
4. Klik tombol **Konfirmasi Pertukaran**. Jadwal shift kedua petugas pada tanggal tersebut akan otomatis bertukar secara atomik di spreadsheet.

---

## 8. Panduan Modul: Inspeksi Mutu Lintas Unit

Modul untuk menjaga kualitas dan audit standar operasional kantor:

### 8.1 Evaluasi Mutu Standar Layanan BPS Kalbar
Audit mutu mencakup 3 pilar:
* **Mutu Kebersihan**: Kebersihan lantai, kaca, toilet, keharuman ruangan, dan kerapian halaman.
* **Mutu Pelayanan**: Kerapian front office, keramahan petugas resepsionis/PST, kecepatan respon, dan ketersediaan buku tamu.
* **Mutu Keamanan**: Kesiapsiagaan petugas satpam di pos jaga, kerapian kendaraan parkir, dan ketertiban penyeberangan.

### 8.2 Skala Penilaian Skor Mutu (1-5 Bintang)
* ⭐⭐⭐⭐⭐ (5.0): **Sangat Baik / Optimal** (Memenuhi seluruh SOP dengan sempurna).
* ⭐⭐⭐⭐ (4.0): **Baik / Memenuhi Standar Mutu** (Operasional berjalan normal dan tertib).
* ⭐⭐⭐ (3.0): **Cukup / Perlu Perbaikan** (Terdapat catatan temuan minor yang perlu ditindaklanjuti).
* ⭐⭐ (2.0): **Kurang Memadai** (Memerlukan evaluasi langsung dari koordinator).
* ⭐ (1.0): **Kritis** (Pelanggaran standar operasional).

### 8.3 Menambahkan Rekam Inspeksi Mutu Baru
1. Buka menu **Inspeksi Mutu** lalu klik **+ Tambah Inspeksi Mutu**.
2. Pilih **Unit Kerja** (Kebersihan / Pelayanan / Keamanan).
3. Masukkan **Tanggal Inspeksi** dan **Petugas / Area Kerja**.
4. Pilih **Kategori Aspek Mutu**.
5. Tentukan **Rating Skor Bintang** (1 s.d. 5).
6. Tuliskan **Catatan Temuan / Evaluasi** dan **Rekomendasi Tindak Lanjut**.
7. Klik **Simpan Hasil Inspeksi**. Data tersimpan ke sheet `InspeksiMutu`.

---

## 9. Panduan Modul: Dashboard & Monitoring Staf Teknis

Bagi staf pelaksana (Kebersihan, Resepsionis, Satpam), alur kerja tetap sederhana dan fokus pada checklist pribadi:

### 9.1 Dashboard Personal Staf
Menampilkan target checklist pribadi bulan berjalan, jumlah tugas selesai, belum selesai, dan persentase capaian.

### 9.2 Checklist Kebersihan & Standar Pelayanan
* Masuk ke menu **Monitoring Kebersihan** (bagi petugas kebersihan) atau **Monitoring Pelayanan** (bagi petugas resepsionis).
* Pilih tanggal yang aktif pada slider baris tanggal.
* Klik tombol **Tandai Selesai** untuk mengubah kotak merah menjadi hijau (*TRUE*).

### 9.3 Aturan Pengisian Validasi Tanggal
* **Hari Ini**: Pengguna bebas mencentang (*TRUE*) dan dapat membatalkannya (*FALSE*) jika terjadi salah klik.
* **Tanggal Lampau**: Checklist yang sudah bertanda selesai (*TRUE*) dikunci otomatis oleh sistem dan tidak dapat diubah oleh staf teknis untuk mencegah manipulasi data historis.
* **Sabtu & Minggu**: Ditetapkan sebagai hari libur operasional reguler.

### 9.4 Monitoring Jadwal Shift Petugas Keamanan (Personal)
Petugas satpam yang login akan langsung melihat kalender shift pribadinya:
* Kotak tanggal menampilkan hari, tanggal, dan kode shift (**P**, **S**, **M**, atau **O**).
* Memilih tanggal piket kerja akan menampilkan daftar checklist tugas siaga shift tersebut (pos jaga, patroli berkala, CCTV, dll.).

---

## 10. Panduan Modul: Profil Akun & Ganti Kredensial

### 10.1 Melihat Detail Informasi Akun & NIP
Buka menu **Profil Akun** untuk melihat nama lengkap, NIP/ID Petugas, username login, role otorisasi, dan unit kerja yang terdaftar.

### 10.2 Prosedur Mengubah Username & Password Mandiri
1. Pada halaman Profil Akun, gulir ke formulir **Ganti Username & Password**.
2. Masukkan **Password Saat Ini** untuk verifikasi keamanan.
3. Masukkan **Username Baru** (minimal 3 karakter).
4. *(Opsional)* Masukkan **Password Baru** dan ketik ulang pada kolom konfirmasi password baru (minimal 4 karakter). Jika hanya ingin mengganti username tanpa mengganti password, biarkan kolom password baru kosong.
5. Klik **Simpan Perubahan Kredensial**.
6. Perubahan akan langsung disinkronkan ke sheet `Users` pada spreadsheet database SIMPEL-KU.

---

## 11. Daftar Akun Pengguna & Default Kredensial

Sistem SIMPEL-KU telah dikonfigurasi dengan akun multi-role berikut:

| No | Nama Pegawai / Jabatan | Unit Kerja | Role | Username Default | NIP / ID |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Administrator SIMPEL-KU** | Manajemen | Admin | `admin` | 198501012010011001 |
| 2 | **Supervisor / Kabag Umum** | Manajemen | Supervisor | `supervisor` | 198002022005011002 |
| 3 | **Tim Umum dan Humas** | Umum | Tim Umum dan Humas | `humas` | 199003032015012003 |
| 4 | **Koordinator Lapangan** | Umum | Koordinator Lapangan | `korlap` | 199204042017011004 |
| 5 | **Yuni Juniarti** | Kebersihan | Petugas Kebersihan | `yuni` | PJLP-KB-001 |
| 6 | **Slamet Riyadi** | Kebersihan | Petugas Kebersihan | `slamet` | PJLP-KB-002 |
| 7 | **Nurramadhanial (Dede)** | Kebersihan | Petugas Kebersihan | `dede` | PJLP-KB-003 |
| 8 | **Muhammad Syukri** | Kebersihan | Petugas Kebersihan | `syukri` | PJLP-KB-004 |
| 9 | **Ramadhan** | Kebersihan | Petugas Kebersihan | `ramadhan` | PJLP-KB-005 |
| 10 | **Mawardi** | Pelayanan | Petugas Pelayanan | `mawardi` | PJLP-PL-001 |
| 11 | **Rania Naila Husna** | Pelayanan | Petugas Pelayanan | `rania` | PJLP-PL-002 |
| 12 | **Alfiana Ayuni** | Pelayanan | Petugas Pelayanan | `alfiana` | PJLP-PL-003 |
| 13 | **Eddy Suryadi** | Keamanan | Petugas Keamanan | `eddy` | PJLP-KM-001 |
| 14 | **Syarif Reza Nopriadrian** | Keamanan | Petugas Keamanan | `reza` | PJLP-KM-002 |
| 15 | **Feri Yustami** | Keamanan | Petugas Keamanan | `feri` | PJLP-KM-003 |
| 16 | **Eko Prasetyo** | Keamanan | Petugas Keamanan | `eko` | PJLP-KM-004 |
| 17 | **Agus Tetriansyah** | Keamanan | Petugas Keamanan | `agus` | PJLP-KM-005 |
| 18 | **Rizki Fadil** | Keamanan | Petugas Keamanan | `rizki` | PJLP-KM-006 |

---

## 12. Tanya Jawab (FAQ) & Penyelesaian Masalah

#### Q: Mengapa saya tidak bisa membatalkan checklist tanggal kemarin?
> **A:** Sesuai dengan aturan integritas data SIMPEL-KU, checklist tanggal lampau yang sudah berstatus selesai (*TRUE*) dikunci secara otomatis. Pembatalan checklist hanya dapat dilakukan pada tanggal berjalan (Hari Ini).

#### Q: Bagaimana jika muncul pesan "Gagal memuat data rekapitulasi"?
> **A:** Klik tombol **Coba Lagi** (*Retry*) pada kotak pesan merah tersebut. Sistem akan mencoba menghubungkan kembali ke Google Sheets. Pastikan juga koneksi internet Anda dalam kondisi stabil.

#### Q: Bagaimana cara Kasubbag Umum menukar shift satpam yang berhalangan hadir?
> **A:** Buka menu **Jadwal & Shift Security**, lalu klik tombol **Tukar Shift (Swap)**. Pilih tanggal pertukaran, tentukan satpam yang bertukar, dan konfirmasi. Jadwal otomatis diperbarui di database tanpa perlu mengedit spreadsheet manual.

#### Q: Ke mana data inspeksi mutu disimpan?
> **A:** Data hasil penilaian inspeksi mutu langsung disimpan secara permanen ke sheet **`InspeksiMutu`** pada spreadsheet SIMPEL-KU lengkap dengan ID laporan, tanggal, unit, skor, catatan temuan, rekomendasi, dan nama pemeriksa (*inspektor*).

---

## 13. Struktur Kode Modular & Panduan Pengembang (Developer Guide)

Untuk memudahkan pemeliharaan dan pengembangan lanjutan, basis kode SIMPEL-KU telah direfaktor menjadi arsitektur modular yang terstruktur rapi berdasarkan layer dan fitur:

```
[4] SIMPEL-KU/
├── config/
│   ├── Config.gs             # Konfigurasi konstanta backend GAS, Spreadsheet ID, Role Permissions
│   └── config.js             # Konfigurasi frontend JS, daftar role, dan pemetaan bulan
├── utils/
│   ├── Utils.gs              # Utility string, normalisasi nama, alias matching, match score (backend)
│   └── utils.js              # Utility helper frontend (escapeHtml, safePercent, debounce, format tanggal)
├── backend/
│   ├── Database.gs           # Akses Google Spreadsheet, multi-level caching, pencarian sheet pegawai
│   ├── Auth.gs               # Login, autentikasi session token, pergantian username/password
│   ├── StaffMonitoring.gs    # Logika pembacaan & update checklist kebersihan/pelayanan teknis
│   ├── Security.gs           # Parsing jadwal piket matrix satpam, update shift, swap shift
│   ├── Supervisor.gs         # Logika pengawasan manajerial, rekapitulasi terpadu, rincian progres pegawai
│   ├── InspeksiMutu.gs       # Manajemen rekam audit mutu layanan, skor bintang, dan tindak lanjut
│   └── ApiRouter.gs          # Entry point doGet, doPost, dan dispatcher aksi API backend
├── components/
│   ├── header.html           # Komponen Topbar header & date selector
│   ├── sidebar.html          # Komponen Sidebar navigasi dinamis berbasis peran pengguna
│   └── modals.html           # Komponen Modal (detail pegawai, edit shift, swap shift, inspeksi mutu, toast, loader)
├── pages/
│   ├── login.html            # Tampilan halaman login
│   ├── supervisor_dashboard.html   # Halaman Dashboard Supervisor / Kasubbag Umum
│   ├── supervisor_monitoring.html  # Halaman Monitoring Terpadu lintas unit
│   ├── supervisor_shift.html       # Halaman Kelola & Matriks Shift Petugas Satpam
│   ├── supervisor_inspeksi.html    # Halaman Audit Standar Mutu Layanan
│   ├── staff_dashboard.html        # Halaman Dashboard Staf Teknis
│   ├── staff_monitoring.html       # Halaman Monitoring Checklist Kebersihan & Pelayanan
│   ├── staff_rekap.html            # Halaman Rekapitulasi & Grafik Kinerja Staf
│   ├── staff_security.html         # Halaman Jadwal & Checklist Harian Satpam (Personal)
│   └── staff_profile.html          # Halaman Profil Pegawai & Ganti Kredensial
├── js/
│   ├── app.js                # Core controller, inisialisasi state, bridge callBackend, navigasi, toast, loader
│   ├── auth.js               # Handler login, logout, sesi, ganti kredensial mandiri
│   ├── staff_monitoring.js   # Handler checklist, filter ruangan, mode harian/mingguan/bulanan
│   ├── staff_security.js     # Handler checklist tugas satpam & navigasi harian
│   ├── staff_rekap.js        # Handler grafik Chart.js dan tabel rekap staf
│   ├── supervisor_dashboard.js   # Controller dashboard pengawasan, pencarian real-time, modal detail pegawai
│   ├── supervisor_monitoring.js  # Controller monitoring terpadu, filter unit/petugas/status real-time
│   ├── supervisor_shift.js       # Controller kelola jadwal shift satpam, ubah shift langsung, dan swap
│   └── supervisor_inspeksi.js    # Controller inspeksi mutu, rating bintang, audit dan pencarian rekam audit
├── css/
│   ├── main.css              # Styling tema utama, scrollbar, navigasi
│   └── components.css        # Styling komponen modal, badge varian, tabel responsif
├── build.py                  # Skrip otomatisasi build & validator sintaks (GAS & JS)
├── code.gs                   # Master compiled backend Google Apps Script (siap deploy)
└── index.html                # Master compiled frontend HTML/CSS/JS (siap deploy)
```

### 🔨 Cara Melakukan Build / Kompilasi Otomatis
Jika Anda melakukan perubahan pada salah satu file di dalam folder `config/`, `utils/`, `backend/`, `components/`, `pages/`, `js/`, atau `css/`, jalankan perintah berikut di terminal:

```bash
python build.py
```

Skrip `build.py` akan:
1. Menggabungkan seluruh modul backend menjadi `code.gs`.
2. Menggabungkan seluruh komponen UI, view halaman, styling CSS, dan modul JS menjadi `index.html`.
3. Menjalankan validasi sintaks otomatis di Node.js VM untuk memastikan kode bebas dari error sintaks sebelum diunggah ke Google Apps Script.

---
*© 2026 Badan Pusat Statistik Provinsi Kalimantan Barat. Seluruh Hak Cipta Dilindungi.*
