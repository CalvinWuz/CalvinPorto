#!/usr/bin/env python3
"""Server pratinjau lokal dengan revalidasi.

`python3 -m http.server` hanya mengirim Last-Modified, tanpa Cache-Control dan tanpa
ETag. Browser lalu memakai heuristik kesegaran: kira-kira 10 persen dari umur berkas.
Modul yang sudah lama ada di disk mendapat jendela segar berhari-hari dan dipakai ulang
tanpa bertanya ke server, sementara index.html yang baru diubah tetap divalidasi. Hasilnya
HTML baru bertemu modul lama, dan isi halaman jadi campuran dua versi.

Server ini mengirim `Cache-Control: no-cache` untuk HTML, CSS, dan JS sehingga browser
selalu bertanya dulu. Aset lain (font, gambar) tetap boleh di-cache seperti biasa.
Perilakunya sejajar dengan aturan di vercel.json, jadi pratinjau lokal tidak lagi
berbeda dari produksi.

Pakai:
    python3 dev/serve.py            # port 4321
    python3 dev/serve.py 8080
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVALIDATE = ('.html', '.css', '.js', '.json', '.svg')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        path = self.path.split('?')[0]
        if path.endswith('/') or path.endswith(REVALIDATE):
            self.send_header('Cache-Control', 'no-cache')
        self.end_headers_original()

    # SimpleHTTPRequestHandler memanggil end_headers() sesudah semua header lain,
    # jadi header tambahan disisipkan tepat sebelum baris kosong penutup.
    def end_headers_original(self):
        http.server.BaseHTTPRequestHandler.end_headers(self)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
    print(f'Melayani {ROOT}')
    print(f'Buka http://127.0.0.1:{port}/   (HTML, CSS, JS selalu divalidasi ulang)')
    http.server.HTTPServer(('127.0.0.1', port), Handler).serve_forever()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
