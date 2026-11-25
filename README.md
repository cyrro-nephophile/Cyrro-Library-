# Cyrro Library

Cyrro Library adalah hub hiburan pribadi berbasis web untuk mengakses mini game, melihat leaderboard, dan mengelola profil pemain dalam satu tempat.

🌐 **Live app:** https://cyr-library-git-main-cyrro.vercel.app

## Fitur

- **Home** — halaman utama untuk mengakses game yang tersedia.
- **Leaderboard** — melihat peringkat dan skor pemain, termasuk tampilan berdasarkan cakupan yang tersedia di aplikasi.
- **Profil** — mengelola akun dan informasi profil pemain.
- **Pertemanan** — mengirim, menerima, dan menolak permintaan pertemanan.
- **Notifikasi** — pemberitahuan aktivitas seperti permintaan pertemanan dan perubahan peringkat.
- **Push notification** — dukungan notifikasi browser pada perangkat dan browser yang kompatibel.
- **Playlist** — kumpulan tautan playlist yang dapat dibuka melalui menu di bagian atas.
- **Tema** — pilihan tampilan terang dan gelap.
- **Efek visual** — animasi dan efek gerak dapat disesuaikan.
- **PWA** — dapat dipasang sebagai aplikasi web pada perangkat yang mendukung.

## Navigasi

Aplikasi menggunakan tiga tab navigasi utama:

1. **Home** — game.
2. **Leaderboard** — papan peringkat.
3. **Profil** — akun, pengaturan profil, dan fitur terkait pengguna.

Menu di kanan atas menyediakan akses ke playlist, pengaturan efek, tema, dan changelog.

## Teknologi

- HTML, CSS, dan JavaScript.
- [Supabase](https://supabase.com/) untuk layanan autentikasi dan data aplikasi.
- Service Worker dan Web App Manifest untuk kemampuan Progressive Web App (PWA).
- [Vercel](https://vercel.com/) untuk hosting dan deployment.

## Menjalankan secara lokal

Karena aplikasi ini menggunakan file web statis, kamu dapat menjalankannya melalui local web server.

Contoh menggunakan Python:

```bash
python -m http.server 8000
```

Lalu buka http://localhost:8000 di browser.

> Beberapa fitur yang terhubung ke Supabase atau layanan push memerlukan konfigurasi backend dan kredensial yang sesuai. Menjalankan file secara lokal saja tidak otomatis menyiapkan layanan tersebut.

## Struktur proyek

File utama aplikasi:

- `index.html` — antarmuka dan logika utama aplikasi.
- `manifest.json` — metadata instalasi PWA.
- `sw.js` — service worker.
- `icon-192.png` — ikon aplikasi.

## Deployment

Repository ini terhubung ke Vercel. Perubahan pada branch produksi `main` dapat memicu deployment otomatis sesuai konfigurasi proyek.

## Catatan

Cyrro Library merupakan proyek yang terus dikembangkan. Fitur dan tampilan dapat berubah seiring pembaruan berikutnya.
