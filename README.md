# Portofolio Calvin

Situs statis: HTML, CSS, dan JavaScript biasa. Tidak ada build step dan tidak ada
dependency. Semua yang dibutuhkan ada di folder ini, termasuk fontnya, jadi halaman
ini tidak memanggil host pihak ketiga sama sekali.

```text
portfolio/
├── index.html      seluruh konten, tetap terbaca tanpa JavaScript
├── styles.css      token warna, layout, dan kedua tema
├── main.js         hanya tambahan; setiap bagian dibungkus feature()
├── vercel.json     header keamanan dan aturan cache
├── robots.txt, sitemap.xml
├── resume.pdf
├── fonts/          Barlow Condensed (woff2, subset latin) — lihat catatan lisensi di bawah
└── img/
    ├── me.webp, bisindo.webp, cookierisk.webp, boardly.webp, og-image.png
    ├── *.jpg       sumber asli, tidak ditampilkan
    └── cat/        puppet.webp dan accessories.webp untuk maskot
```

## Pratinjau lokal

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory .
```

Buka http://127.0.0.1:8765. Periksa kedua tema, ketiga studi kasus, tautan
repository, dan CV sebelum menerbitkan.

## Cara halaman ini disusun

- **Konten lebih dulu.** Seluruh bagian, termasuk isi studi kasus, ditulis di
  `index.html`. Tanpa JavaScript halaman tetap terbaca lengkap; tidak ada konten
  yang disembunyikan oleh kelas yang hanya bisa dilepas oleh script.
- **`main.js` hanya menambah.** Menu ponsel, tombol tema, stiker yang bisa digeser,
  huruf nama yang merespons, tautan studi kasus, penanda bagian aktif, dan maskot.
  Masing-masing ada di dalam `feature()`, jadi satu kegagalan tidak menjatuhkan
  halaman.
- **Studi kasus memakai `<details>` dengan `id`.** Membukanya menulis hash ke alamat
  lewat `replaceState`, jadi tautannya bisa dibagikan tanpa membuat tombol Back
  membingungkan. Tanpa JavaScript `<details>` tetap bisa dibuka sendiri.
- **Token warna** ada di `:root`, ditulis ulang pada `html[data-theme=dark]` dan pada
  `@media (prefers-color-scheme: dark)` untuk kondisi tanpa JavaScript. Warna merek
  biru, ungu, dan cyan dipakai untuk bidang; untuk teks dipakai turunannya yang
  sedikit lebih pekat agar kontrasnya memenuhi WCAG AA pada kedua tema.
- **Maskot** adalah satu tubuh dengan layer ekspresi dari `img/cat/puppet.webp`, bukan
  dua belas karakter berbeda. Mesin state-nya memakai waktu logis sendiri, jadi tidak
  ada pose yang kedaluwarsa saat tab disembunyikan, saat dijeda, atau saat maskot di
  luar area tampilan. Kecepatan 90 px/detik dan jeda 7 detik.

## Perawatan konten

- Isi proyek dan studi kasusnya ada langsung di `index.html`.
- Cookies Risk Analyzer adalah proyek kampus tim lima orang; peran Calvin adalah
  pengembang bot analisis indikator terkait UU PDP. Jangan menulisnya sebagai
  sertifikasi, jaminan, atau keputusan kepatuhan.
- BISINDO mencakup 26 huruf dan 32 isyarat kata terpisah. Evaluasi pada penutur baru
  belum dibuktikan, jadi jangan memasang angka akurasi tanpa metode dan batasnya.
- PapanTulis adalah proyek pribadi, bukan proyek tim. Jangan mengarang angka FPS atau
  hasil pengujian.
- Tulis "sertifikasi" hanya jika memang ada sertifikasi bernama yang dimiliki.
- Jaga agar situs, CV, dan dokumentasi repository tetap konsisten.

## Aset dan lisensi

- Font Barlow Condensed berada di bawah SIL Open Font License 1.1, disalin ke
  `fonts/` agar tidak ada permintaan ke host font pihak ketiga.
- Atlas maskot dibuat dari gambar referensi milik Calvin.

## Perilaku baru di halaman

- **Jalur maskot.** `--catlane` memesan satu pita di sisi kanan (76 px desktop,
  66 px di bawah 981 px) lewat `padding-right` pada `.section`, `.field`, `.hero`
  dan `.foot`. Hanya satu sisi yang dipesan, bukan dua.
- **Dock per section.** Tiap bagian punya `<span class="cat-slot">` yang menentukan
  *ketinggian* maskot; sisi horizontalnya selalu pita kanan tadi, jadi maskot tidak
  pernah menyapu teks pada posisi scroll mana pun. Jalan kecil dibatasi lebar pita
  yang benar-benar tersedia; kalau sempit maskot berdiri saja.
- **Posisi stiker.** Default dihitung dari scene dan blok teks hero, bukan dari
  posisi maskot. Dulu itulah sebabnya ketiga stiker menumpuk di kiri saat pembukaan.
  Posisi maskot hanya dipakai sebagai batas tambahan setelah ia benar-benar
  ditempatkan. Skema penyimpanan posisi stiker sekarang `v:3`; skema lama diabaikan
  tanpa menyentuh preferensi tema atau gerakan.
- **Kanvas coretan mini** di bagian PapanTulis. Satu sumber state mengatur mode,
  label, class, dan visibilitas tombol: pada mouse menggambar langsung aktif dan
  tombol aktivasi benar-benar tersembunyi; pada pointer kasar pengunjung menekan
  "Mulai menggambar" dulu sehingga swipe tetap menggulir halaman. `touch-action`
  hanya diubah pada kanvas saat mode aktif.
- **Koordinat kanvas ternormalisasi (0..1), bukan piksel CSS absolut.** Titik
  dipetakan ke ukuran kanvas saat digambar ulang, jadi coretan di kiri, tengah, dan
  kanan tetap utuh setelah desktop → mobile → desktop, pergantian orientasi, dan
  pergantian tema. Ukuran backing store mengikuti `offsetWidth` dan dibatasi 2x DPR,
  sehingga transform dari animasi reveal tidak memengaruhinya.
- **Posisi stiker disusun ulang saat ruang berubah** selama pengguna belum
  memindahkannya; posisi hasil drag atau keyboard dipertahankan dan hanya di-clamp
  ke bidang baru.
- **Satu sumber state untuk marquee.** Jeda bila manual, reduced motion, tab
  tersembunyi, di luar layar, atau pointer/fokus sedang di atasnya. Hover sementara
  tidak pernah menulis preferensi manual yang tersimpan.
- **Tombol jeda gerakan** di topbar mengendalikan maskot dan marquee sekaligus.

## Logo

Logo C yang disetujui ada di `img/brand/`. Berkasnya **PNG**, bukan SVG: tidak ada
master vektor untuk aset ini. `logo-c.png` sudah dipangkas ke bentuknya (padding
transparan asli sekitar 14 persen dibuang), jadi ukuran CSS 30 px juga 30 px optis.
Logo dipakai apa adanya tanpa kotak bergradasi. Favicon dan apple-touch-icon berasal
dari bentuk yang sama.

## Kredit aset

Logo tools berasal dari Simple Icons (CC0). Rincian per berkas, termasuk alasan
Frida dan jadx tampil sebagai teks, ada di `img/tools/CREDITS.md`.

## Menerbitkan

Deployment statis di Vercel. Framework preset: Other; tanpa build command; output
directory: root.

```bash
npx vercel --prod --yes --scope calvinwuzs-projects
```

`vercel.json` memuat header keamanan, CSP tanpa origin eksternal, serta cache satu
tahun untuk `fonts/` dan satu minggu untuk `img/`.
