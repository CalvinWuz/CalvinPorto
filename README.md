# Portofolio Calvin

Website portofolio pribadi Calvin, mahasiswa Computer Science di Bina Nusantara
University yang mendalami keamanan aplikasi. Halaman ini dipakai untuk melamar magang di
Application Security, Pentesting, atau Security Engineering: isinya memperkenalkan tiga
proyek beserta kontribusi pribadi dan batasnya, pengalaman yang relevan, arsip
sertifikat, serta jalur kontak dan CV.

Situs statis: HTML, CSS, dan JavaScript biasa. Tidak ada build step, tidak ada
dependency, dan tidak ada permintaan ke host pihak ketiga. Font pun disalin ke dalam
repository.

## Isi website

- **Tiga proyek** (Cookies Risk Analyzer, BISINDO Translator, PapanTulis). Tiap proyek
  memperlihatkan masalahnya, bagian yang dikerjakan Calvin, apa yang sudah berjalan, dan
  tautan bukti ke repository. Pendalamannya ada di satu `<details>` per proyek:
  keputusan teknis, batas, pembelajaran, dan status.
- **Tentang dan pengalaman**: pendidikan, kompetisi, kepanitiaan, serta ringkasan
  organisasi dan sekolah.
- **Arsip sertifikat**: map dengan dua lembar yang bisa dibuka. Saat ini berisi
  sertifikat kursus C for Beginners dan sertifikat peserta Capture the Flag I-FEST#13.
- **Tools** yang membedakan "sudah dipakai di proyek" dari "sedang dipelajari". Tidak ada
  bar persentase, karena angkanya tidak punya dasar.
- **Kontak dan CV**: email, LinkedIn, GitHub, dan `resume.pdf`.
- **Tema terang dan gelap**, maskot kucing yang bisa diseret dan disapa, tiga stiker yang
  bisa digeser, serta tombol jeda gerak.

Seluruh teks ada di `index.html`. Tanpa JavaScript halaman tetap terbaca lengkap; tidak
ada konten yang disembunyikan oleh kelas yang hanya bisa dilepas script.

## Struktur

```text
index.html            seluruh konten dan markup
main.js               penyalaan fitur; tiap bagian dibungkus feature()
styles.css            token warna, layout dasar, dua tema
page-polish.css       tipografi dan jarak antarbagian
polish-07.css         dekorasi dan titik tepi
archive-10.css        map arsip sertifikat
expressions-10.css    lapisan ilustrasi kucing (variabel --cat10-*)
companion-08.css      lapisan fisik kucing dan override komposisinya
js/
  companion.js        pemilik posisi, rute, pose, dan tur kucing
  expressions.js      pustaka pose murni; tanpa listener atau timer sendiri
  route.js            pencarian rute di antara penghalang
  archive.js          perilaku map sertifikat
  certificates.js     data sertifikat (satu-satunya tempat mengisi)
  ambient.js          titik tepi latar
assets/               rig kucing sebagai berkas mandiri dan mask titik tepi
img/                  foto proyek, logo, dekorasi, logo tools, dokumen sertifikat
fonts/                Barlow Condensed (woff2) beserta lisensinya
dev/                  alat bantu lokal; tidak ikut ter-deploy
resume.pdf            CV
vercel.json           header keamanan dan aturan cache
robots.txt, sitemap.xml
```

## Menjalankan secara lokal

Perlu Python 3. Halaman memakai ES module, jadi harus lewat HTTP; membuka `index.html`
langsung dari berkas tidak akan menjalankan modulnya.

```bash
python3 dev/serve.py 4321
```

Buka `http://127.0.0.1:4321/`. Hentikan dengan `Ctrl+C`.

Pakai `dev/serve.py`, bukan `python3 -m http.server`. Server bawaan hanya mengirim
`Last-Modified` tanpa `Cache-Control`, sehingga browser memakai heuristik kesegaran:
modul yang sudah lama ada di disk dianggap segar berhari-hari dan dipakai ulang tanpa
bertanya, sementara `index.html` yang baru diubah tetap divalidasi. Hasilnya HTML baru
bertemu modul lama dan halaman menampilkan campuran dua versi. `dev/serve.py` mengirim
`Cache-Control: no-cache` untuk HTML, CSS, dan JS, sejajar dengan aturan `vercel.json`.

`dev/expressions.html` menampilkan seluruh ekspresi kucing pada ukuran aslinya, berguna
saat mengubah rig. Folder `dev/` ada di `.vercelignore` sehingga tidak ikut ter-deploy.

## Merawat konten

| Yang diubah | Tempatnya |
| --- | --- |
| Teks proyek, studi kasus, pengalaman, About, kontak | `index.html` |
| Data sertifikat | `js/certificates.js` |
| Dokumen sertifikat | `img/cert/` |
| CV | `resume.pdf` |
| Daftar tools | `index.html`, bagian marquee |

### Mengisi sertifikat

`js/certificates.js` memuat satu entri per lembar. Field yang tersedia: `id`, `category`,
`title`, `issuer`, `issuedAt`, `skills`, `note`, `documentUrl`, `documentType`, dan
`verificationUrl`. Nilai yang belum ada ditulis `null` atau array kosong, dan tampil apa
adanya sebagai "Belum diisi" atau "Belum ditambahkan". Tautan verifikasi hanya muncul
bila URL-nya benar-benar ada, jadi tidak ada tautan kosong. `note` diisi konteks yang
memang tertulis di dokumen, misalnya peran, nama tim, tingkat lomba, atau nomor
sertifikat.

Markup di `index.html` memuat salinan statis isi tiap lembar untuk pembaca tanpa
JavaScript. Setelah mengubah data, perbarui juga salinan statis itu agar keduanya cocok.

### Menaikkan versi aset

Modul dirantai: `index.html` memuat `main.js`, yang mengimpor `js/archive.js`, yang
mengimpor `js/certificates.js`. Import relatif tidak mewarisi query versi dari modul
induknya, jadi menaruh `?v=` pada satu berkas saja tidak cukup. `main.js` membaca `?v=`
dari tag `<script>` miliknya sendiri lalu meneruskannya ke modul anak.

Setiap kali modul JavaScript berubah, naikkan satu angka ini saja:

```html
<script src="main.js?v=2026-10-23" defer></script>
```

Tanggal rilis sudah cukup; yang penting nilainya berubah. Tanpa itu, pengunjung yang
pernah membuka situs bisa mendapat HTML baru dengan modul lama dari cache.

Dua penjaga melengkapinya di `js/archive.js`: bila modul data gagal dimuat, atau jumlah
slotnya tidak sama dengan jumlah lembar di markup, script berhenti dan membiarkan isi
HTML apa adanya, lalu menulis pesan `console.error` yang menyebut angkanya. Kegagalan
import tidak pernah mengubah sertifikat yang sudah benar menjadi serba kosong.

## Interaksi dan aksesibilitas

- **Kucing** bisa diseret, ditahan, diusap, dan disapa. Reaksinya nonverbal: tidak ada
  teks atau suara yang keluar darinya. Menekannya membuka tawaran tur portofolio yang
  sepenuhnya opsional; Escape menutupnya.
- **Keyboard**: tombol kucing menerima Enter dan Space, tombol panah memindahkannya saat
  fokus, dan Escape mengembalikannya ke tepi. Tab sertifikat dan `<details>` memakai
  kontrol native, jadi urutan fokusnya wajar. Menutup detail mengembalikan fokus ke
  tombol pembukanya.
- **Stiker** di hero bisa digeser dengan pointer maupun tombol panah, dan ada tombol
  untuk mengembalikan posisinya.
- **Tombol jeda** di topbar menghentikan maskot, deretan logo, dan titik tepi sekaligus.
  Jeda efektif dihitung sekali: jeda manual, `prefers-reduced-motion`, atau tab
  tersembunyi. Saat gerak dijeda, semua kontrol tetap bisa dipakai.
- Pada layar sempit yang padat, kucing memakai bentuk mengintip yang lebih ramping di
  margin agar tidak menutupi teks, dan tetap bisa disapa.

## Deployment

Konfigurasi yang ada menargetkan hosting statis: `vercel.json` memuat header keamanan,
Content-Security-Policy tanpa origin eksternal, dan aturan cache. HTML, CSS, serta JS
wajib divalidasi ulang; font dan gambar boleh di-cache. Tidak ada build command dan
output directory-nya adalah root.

Repository ini hanya menyiapkan isinya. Menerbitkan adalah langkah manual terpisah, dan
URL publik tidak otomatis mengikuti perubahan di sini.

## Pemeriksaan

Tidak ada test runner di repository ini. Pemeriksaan dilakukan dengan menjalankan server
lokal lalu memeriksa di browser: kedua tema pada lebar desktop dan sekitar 390 px,
ketiga proyek beserta studi kasusnya, kedua lembar sertifikat beserta gambarnya, tautan
CV dan kontak, perilaku keyboard, serta tampilan tanpa JavaScript.

## Batas yang perlu diketahui

- BISINDO Translator dan PapanTulis masih prototipe. Tidak ada angka akurasi, FPS, atau
  hasil pengujian pengguna di halaman ini karena pengukurannya memang belum dilakukan.
- Cookies Risk Analyzer adalah proyek kampus lima orang. Kontribusi Calvin adalah bot
  analisis indikator terkait UU PDP; scanner, dashboard, scoring, dan arsitektur
  keseluruhan dikerjakan tim. Hasil alat itu bukan sertifikasi kepatuhan.
- Sertifikat yang ditampilkan mengikuti dokumen aslinya. Tidak ada badge, peringkat, atau
  nomor kredensial yang ditambahkan sendiri.

## Kredit dan lisensi

- Barlow Condensed berada di bawah SIL Open Font License 1.1. Teks lisensinya ada di
  `fonts/OFL.txt` dan ringkasan sumbernya di `fonts/README.md`.
- Logo tools berasal dari Simple Icons (CC0). Rincian per berkas ada di
  `img/tools/CREDITS.md`.
- Logo C, foto, dan gambar dekorasi adalah aset milik Calvin.
- Dokumen sertifikat diterbitkan oleh Great Learning Academy dan Universitas Atma Jaya
  Yogyakarta; keduanya ditampilkan apa adanya.

Lisensi untuk kode repository ini belum ditetapkan.
