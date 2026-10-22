# Portofolio Calvin

Situs statis: HTML, CSS, dan JavaScript biasa. Tidak ada build step dan tidak ada
dependency. Semua yang dibutuhkan ada di folder ini, termasuk fontnya, jadi halaman
ini tidak memanggil host pihak ketiga sama sekali.

```text
portfolio/
├── index.html          seluruh konten, tetap terbaca tanpa JavaScript
├── styles.css          token warna, layout dasar, dan kedua tema
├── polish-07.css       dekorasi, titik tepi, dan penyesuaian komposisi
├── page-polish.css     perapian tipografi dan jarak antarbagian
├── archive-10.css      map arsip sertifikat
├── expressions-10.css  lapisan ilustrasi kucing: sendi, wajah, dan efek (--cat10-*)
├── companion-08.css    lapisan fisik kucing dan lima override komposisi
├── main.js             hanya tambahan; setiap bagian dibungkus feature()
├── js/
│   ├── companion.js    satu-satunya pemilik posisi, rute, pose, dan tur kucing
│   ├── expressions.js  renderer pose murni; tanpa listener, timer, atau loop sendiri
│   ├── route.js        pencarian rute visibility-graph di antara penghalang
│   ├── explorer.js     bedah proyek: 3 proyek x 4 bab
│   ├── archive.js      map arsip sertifikat
│   ├── certificates.js data slot sertifikat; satu-satunya tempat mengisi datanya
│   └── ambient.js      titik tepi latar
├── dev/
│   └── expressions.html alat pemeriksaan 26 wajah; ada di .vercelignore, tidak ikut deploy
├── assets/
│   ├── cat-rig.svg     master rig kucing sebagai berkas mandiri (acuan gambar,
│   │                   bukan aset runtime; rig yang dipakai halaman ditulis inline)
│   ├── cat-expressions-manifest.json  id, label, dan selector tiap ekspresi
│   └── edge-dots.svg   mask untuk titik tepi
├── vercel.json         header keamanan dan aturan cache
├── robots.txt, sitemap.xml
├── resume.pdf
├── fonts/              Barlow Condensed (woff2, subset latin) — lihat catatan lisensi
└── img/
    ├── me.webp, bisindo.webp, cookierisk.webp, boardly.webp, og-image.png
    ├── brand/          logo C, favicon, apple-touch-icon
    ├── decor/          doodle dan goresan pensil
    └── tools/          logo tools monokrom
```

## Pratinjau lokal

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory .
```

Buka http://127.0.0.1:8765. Periksa kedua tema, ketiga studi kasus, bedah proyek,
tautan repository, dan CV sebelum menerbitkan.

## Cara halaman ini disusun

- **Konten lebih dulu.** Seluruh bagian, termasuk isi studi kasus dan ke-12 bab
  bedah proyek, ditulis di `index.html`. Tanpa JavaScript halaman tetap terbaca
  lengkap; tidak ada konten yang disembunyikan oleh kelas yang hanya bisa dilepas
  oleh script.
- **`main.js` hanya menambah.** Menu ponsel, tombol tema, stiker yang bisa digeser,
  huruf nama yang merespons, penanda bagian aktif, marquee tools, dan maskot.
  Masing-masing ada di dalam `feature()`, jadi satu kegagalan tidak menjatuhkan
  halaman.
- **Studi kasus memakai `<details>` dengan `id`.** Membukanya menulis hash ke alamat
  lewat `replaceState`, jadi tautannya bisa dibagikan tanpa membuat tombol Back
  membingungkan. Tanpa JavaScript `<details>` tetap bisa dibuka sendiri.
- **Token warna** ada di `:root`, ditulis ulang pada `html[data-theme=dark]` dan pada
  `@media (prefers-color-scheme: dark)` untuk kondisi tanpa JavaScript. Warna merek
  biru, ungu, dan cyan dipakai untuk bidang; untuk teks dipakai turunannya yang
  sedikit lebih pekat agar kontrasnya memenuhi WCAG AA pada kedua tema.

## Bedah proyek

`js/explorer.js` mengubah tiga artikel proyek menjadi satu catatan yang bisa
dibuka per bab: Masalah, Keputusan, Kontribusiku, Bukti & batas.

- Tombolnya adalah tombol biasa dengan `aria-pressed` dan `aria-controls`, bukan
  widget tab palsu, jadi Tab/Shift+Tab dan Enter/Space bekerja seperti biasanya dan
  fokus tetap pada tombol yang ditekan.
- Nav proyek dan kontrol bab ditulis `hidden` di HTML dan baru dibuka oleh script.
  Tanpa JavaScript ketiga proyek dan keduabelas babnya tampil terbuka semua, dan
  tidak ada tombol yang menjanjikan interaksi yang tidak ada.
- Pergantian diumumkan sekali lewat satu live region `aria-live="polite"`.
- Gambar bukti memakai `loading="lazy"`. Selama babnya belum dibuka gambarnya memang
  belum dimuat; itu perilaku yang diharapkan, bukan aset yang hilang.

## Maskot

`js/companion.js` dan `js/route.js` adalah satu-satunya pemilik posisi, rute, ritme
kaki, pose, dan tur kucing.

- **Rig SVG, bukan atlas PNG.** Seluruh anatominya digambar inline di `index.html`.
  Peran node dipisah: posisi viewport, lean badan, arah hadap, pose, dan gait tidak
  pernah menulis transform node yang sama. Fase kaki dihitung dari jarak yang
  benar-benar ditempuh.
- **26 wajah, satu yang aktif.** Sepuluh wajah lama ditambah 16 ekspresi paket 10
  (penasaran, tertawa, malu, kaget, berpikir, usil, bangga, fokus, bosan, bingung,
  sedih, sayang, mengedip, menguap, bersin, bertekad). Semuanya berada di dalam
  `.pet-head` yang sama, jadi telinga, dahi, pipi, dan kumis ikut kepala.
- **Satu pemilik transform ilustrasi.** `expressions-10.css` memegang anatomi, sendi,
  wajah, dan efek lewat variabel `--cat10-*`. `companion-08.css` hanya memegang
  lapisan fisik (posisi, pantulan, skala saat diangkat) dan lima override yang memang
  perlu mengomposisikan nilai tambahan: anatomi (squash saja, karena lift/lean ada di
  lapisan fisik), kepala (pengaruh telinga dan pembesaran marah), dua kaki (scaleY saat
  melangkah), dan mata (animasi kedip). Jangan menambah stylesheet baru yang menyentuh
  node yang sama.
- **`js/expressions.js` adalah renderer, bukan controller.** Ia tidak mengatur rute,
  kecepatan, pointer, waktu, tur, atau fokus. `paint()` di `companion.js` menyusun satu
  pose, menumpuknya di atas gait perjalanan, lalu menuliskannya sekali lewat
  `CalvinCatExpressions.apply()`.
- **Karakter tidak berbicara.** Tidak ada bubble reaksi, teks marah, atau suara. Yang
  tersisa hanyalah cue kecil "geser / sapa" dan panel tur yang sengaja dibuka pengunjung.
- **Tidak ada lajur khusus kucing.** `--catlane` sudah dihapus seluruhnya dari semua
  stylesheet; isi halaman memakai grid yang sama di semua lebar. Kucing hidup di
  lapisan interaksi terpisah dan menghindari materi lewat daftar penghalang.
- **Penghalang dipasang pada blok materi, bukan wadahnya.** Daftar selektornya ada di
  `main.js`. Untuk paragraf dan judul yang dipakai adalah kotak tiap baris teks,
  bukan kotak bloknya, supaya baris terakhir yang pendek tidak menjadi dinding
  selebar kolom.
- **Jejak kucing tidak simetris.** Caption kecil di bawah badan ikut terlihat, jadi
  penghalang diberi jarak lebih besar di sisi atasnya (`padDown`) daripada di sisi
  bawahnya (`padUp`). Tanpa itu label tersebut menimpa baris teks di bawah kucing
  saat ia berhenti.
- **Tumpang tindih sesaat diterima.** Saat diseret, dijatuhkan, atau saat halaman
  di-scroll cepat kucing boleh melewati materi; setelah berhenti ia berjalan ke tepi
  yang paling sedikit mengganggu. Yang dijaga adalah CTA, CV, email, dan tombol
  kontak tetap bisa diklik — ini yang diukur, bukan nol overlap.
- **Reaksi jatuh berjalan tanpa teks.** Lempar cepat atau guncangan: held → dizzy →
  angry-build → angry-burst → angry → sulk → wink, lalu kembali ke tepi. Jatuh pelan:
  surprised → proud → wink. Caption dan bubble dimatikan di sepanjang kedua urutan.
- **Sentuhan dibedakan.** Seret dimulai setelah perpindahan sekitar 6 px. Tahan diam
  sekitar 350 ms memberi respons nyaman (`love`), lalu `shy` dan `wink` saat dilepas.
  Tap singkat di kepala bergantian wink/shy/love, di badan laugh/mischievous/surprised
  (kejutan boleh berlanjut ke puzzled lalu sneeze, sekali saja). Usapan panjang di atas
  karakter memicu satu tawa dengan cooldown, bukan puluhan respons.
- **Satu jalur aktivasi.** Tap singkat memberi ekspresi sekaligus membuka tawaran tur
  bila belum terbuka; tap berikutnya tidak membuka ulang atau merebut fokus. Enter dan
  Space mengikuti jalur yang sama. Seret, tahan, dan input yang dibatalkan tidak
  membuka tawaran.
- **Prioritas intent.** Seret dan rangkaian pendaratan/marah tidak bisa dipotong intent
  kosmetik dari UI; intent arsip dan sapaan boleh saling menggantikan.
- **Menguap dulu, baru tidur.** Sekitar 13 detik tanpa interaksi memunculkan `yawn`,
  lalu `sleep` sampai ada input yang relevan.
- **Tur bersifat sukarela.** Klik atau Enter pada kucing membuka tawaran dengan
  pilihan "Mulai tur" dan "Main saja". Escape menutupnya. Saat bubble ditutup,
  fokus dikembalikan ke kucing supaya tidak jatuh ke `<body>`; modalitas dibaca
  sebelum fokus dipindah, jadi menutup dengan mouse tidak menahan kucing di tempat.
- **Menyeberang layar** hanya dilakukan bila benar-benar ada koridor bebas selebar
  viewport. Bila tidak ada, kucing tidak memaksakannya; tidak ada teleport sebagai
  jalan biasa.

## Arsip sertifikat

Bagian "Catatan dari prosesnya" yang mengulang ketiga proyek diganti map arsip
sertifikat. Tidak ada fakta yang hilang: isinya sudah ada di studi kasus dan di bedah
proyek. Map-nya ada di dalam About, dengan id `#sertifikat`.

- **Datanya ada di `js/certificates.js`, bukan di markup.** Tiga slot berisi `null` dan
  array kosong. Mengisi berarti mengganti nilainya; markup dan perilaku tidak perlu
  disentuh. Berkas itu memuat penjelasan tiap field dan contoh bentuk terisi.
- **Yang kosong ditulis apa adanya**: "Belum diisi" dan "Belum ditambahkan". Tidak ada
  badge verified, nomor kredensial, tanggal, ranking, atau gambar sertifikat palsu.
  Tautan verifikasi dan tombol dokumen hanya dibuat ketika URL-nya benar-benar ada,
  jadi tidak ada `href="#"` yang berpura-pura memverifikasi.
- **Tanpa JavaScript ketiga lembar dan detailnya tampil terbuka** dari markup, dan tab
  pemilih slot tetap `hidden` supaya tidak menjanjikan interaksi yang tidak ada. Karena
  itu, kalau slot benar-benar diisi, perbarui juga ringkasan statis di `index.html`.
- **Reaksi kucing memakai kucing global yang sama.** Membuka slot mengirim intent
  `archive-open` (penasaran lalu bangga), menutup mengirim `archive-close` (mengedip).
  Tidak ada actor kedua di dalam katalog, dan katalog tetap berfungsi penuh ketika
  kucing sedang diseret, dijeda, atau gerak dimatikan.
- **Fokus**: membuka memindahkan fokus ke tombol Tutup, menutup dan Escape
  mengembalikannya ke tombol Buka slot. Detail berada di alur halaman, jadi fokusnya
  tidak diperangkap.

## Alat pemeriksaan

`dev/expressions.html` menampilkan ke-26 wajah pada ukuran karakter yang sebenarnya
(96 x 104 px), dengan penggeser progres dan intensitas serta tombol ganti tema. Berkas
itu ada di `.vercelignore`, jadi tidak ikut ter-deploy. Jalankan server statis dari root
repository lalu buka `/dev/expressions.html`.

## Satu pemilik state gerak

Effective pause = jeda manual (`calvin-motion`) ATAU reduced motion ATAU tab
tersembunyi. Keputusannya dihitung sekali di `main.js`, ditulis ke
`html[data-motion]`, lalu disiarkan ke kucing, marquee, titik tepi, dan dekorasi.
Fitur lain ikut siaran itu dan tidak mendengarkan `visibilitychange` sendiri-sendiri.

Tombol jeda gerakan di topbar mengendalikan semuanya sekaligus.

## Perilaku lain di halaman

- **Posisi stiker disusun ulang saat ruang berubah** selama pengguna belum
  memindahkannya; posisi hasil drag atau keyboard dipertahankan dan hanya di-clamp
  ke bidang baru. Bidang stiker tidak membaca posisi kucing.
- **Satu sumber state untuk marquee.** Jeda bila manual, reduced motion, tab
  tersembunyi, di luar layar, atau pointer/fokus sedang di atasnya. Hover sementara
  tidak pernah menulis preferensi manual yang tersimpan.
- **Titik tepi** (`js/ambient.js` dan `.ambient-edges`) bergeser sangat pelan di dua
  tepi luar dengan `pointer-events:none`, dan ikut berhenti saat gerak dijeda.

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

## Logo

Logo C yang disetujui ada di `img/brand/`. Berkasnya **PNG**, bukan SVG: tidak ada
master vektor untuk aset ini. `logo-c.png` sudah dipangkas ke bentuknya (padding
transparan asli sekitar 14 persen dibuang), jadi ukuran CSS 30 px juga 30 px optis.
Logo dipakai apa adanya tanpa kotak bergradasi. Favicon dan apple-touch-icon berasal
dari bentuk yang sama.

## Kredit aset

- Font Barlow Condensed berada di bawah SIL Open Font License 1.1, disalin ke
  `fonts/` agar tidak ada permintaan ke host font pihak ketiga.
- Logo tools berasal dari Simple Icons (CC0). Rincian per berkas, termasuk alasan
  Frida dan jadx tampil sebagai teks, ada di `img/tools/CREDITS.md`.
- Rig kucing dan 16 ekspresi tambahan berasal dari paket aset 10 milik Calvin; rig 08
  di dalamnya tidak diubah (sha256 cocok dengan master sebelumnya).
- Doodle di `img/decor/` disimpan sebagai WebP 560 px. Sumbernya PNG 1254 px dari
  paket dekorasi; ukuran tampilnya tidak pernah lebih dari 250 px, jadi versi PNG
  (1,6 MB untuk tiga berkas) tidak dibawa ke repository.

## Menerbitkan

Deployment statis di Vercel. Framework preset: Other; tanpa build command; output
directory: root.

```bash
npx vercel --prod --yes --scope calvinwuzs-projects
```

`vercel.json` memuat header keamanan, CSP tanpa origin eksternal, serta cache satu
tahun untuk `fonts/` dan satu minggu untuk `img/`.
