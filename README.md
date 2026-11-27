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
- [Capacitor](https://capacitorjs.com/) untuk membungkus aplikasi web menjadi aplikasi Android.

## Menjalankan secara lokal

Karena aplikasi ini menggunakan file web statis, kamu dapat menjalankannya melalui local web server.

Contoh menggunakan Python:

```bash
python -m http.server 8000
```

Lalu buka http://localhost:8000.

## Build APK Android

Repository sudah disiapkan dengan Capacitor dan GitHub Actions.

1. Buka tab **Actions** di repository GitHub.
2. Pilih workflow **Android APK**.
3. Tekan **Run workflow** untuk memulai build manual.
4. Setelah workflow berhasil, buka hasil run dan unduh artifact:
   - `c-library-debug-apk` — APK debug untuk pengujian.
   - `c-library-release-apk-unsigned` — APK release yang belum ditandatangani.

Workflow juga berjalan otomatis saat ada push ke branch `main` atau branch dengan awalan `setup/`.

### Konfigurasi Android

- Nama aplikasi: **C-Library**
- Application ID sementara: `id.cyrro.library`
- Orientation: mengikuti pengaturan default aplikasi Android.
- Notifikasi native Android: belum diaktifkan.
- Web assets disiapkan dari file statis repository ke folder `www/` saat workflow berjalan.
- Folder `android/` dihasilkan oleh Capacitor pada runner GitHub Actions dan tidak perlu disimpan di repository.

**Catatan signing:** APK release saat ini dihasilkan dalam bentuk unsigned. Untuk distribusi dan pembaruan aplikasi secara konsisten, siapkan keystore Android dan GitHub Actions Secrets sebelum mengaktifkan signing release. Jangan commit file keystore atau password ke repository.

## Deployment

Repository ini terhubung ke Vercel. Perubahan pada branch produksi `main` dapat memicu deployment otomatis sesuai konfigurasi proyek.

## Catatan

Beberapa fitur yang terhubung ke Supabase atau layanan eksternal memerlukan koneksi internet dan konfigurasi backend yang sesuai. Build APK tidak memindahkan database Supabase ke perangkat; aplikasi tetap menggunakan layanan Supabase yang sudah ada.
