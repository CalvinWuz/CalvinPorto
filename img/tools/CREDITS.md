# Logo tools

Setiap PNG di folder ini dibuat dari **Simple Icons** (https://simpleicons.org),
koleksi ikon merek yang file ikonnya dirilis di bawah **CC0 1.0 Universal**.
Sumber yang dipakai: `simple-icons@13.21.0` melalui jsDelivr.

Proses pembuatannya: hanya geometri `path` yang diambil dari tiap SVG, lalu digambar
ulang sebagai siluet putih di atas latar transparan dan diekspor ke PNG 160 x 160
(perangkat 2x). Tidak ada markup lain dari berkas sumber yang ikut. Di halaman, PNG
ini dipakai sebagai `mask-image` dengan `currentColor`, jadi satu berkas melayani tema
terang dan gelap tanpa versi warna terpisah.

| Berkas | Merek | Dipakai untuk |
| --- | --- | --- |
| `python.png` | Python | Dipakai dalam proyek |
| `javascript.png` | JavaScript | Dipakai dalam proyek |
| `react.png` | React | Dipakai dalam proyek |
| `nodedotjs.png` | Node.js | Dipakai dalam proyek |
| `pytorch.png` | PyTorch | Dipakai dalam proyek |
| `mediapipe.png` | MediaPipe | Dipakai dalam proyek |
| `opencv.png` | OpenCV | Dipakai dalam proyek |
| `qt.png` | Qt | Dipakai dalam proyek (PySide6 adalah binding Python untuk Qt) |
| `docker.png` | Docker | Dipakai dalam proyek |
| `git.png` | Git | Dipakai dalam proyek |
| `owasp.png` | OWASP | Sedang dipelajari (OWASP MASVS) |
| `burpsuite.png` | Burp Suite | Sedang dipelajari |

## Yang sengaja tidak memakai logo

Simple Icons tidak memuat **Frida** dan **jadx**, jadi keduanya tampil sebagai label
teks, bukan logo buatan sendiri. **Application security** dan **pengujian keamanan
aplikasi mobile** adalah bidang, bukan produk, jadi keduanya juga tetap teks.

## Catatan merek

Lisensi CC0 berlaku untuk berkas ikonnya, bukan untuk merek dagangnya. Logo di sini
hanya menandai teknologi yang benar-benar dipakai atau dipelajari, bukan menyatakan
dukungan, afiliasi, atau sertifikasi dari pemilik merek.
