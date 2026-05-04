import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Adably",
  description: "Kebijakan privasi platform edukasi Islam anak Adably",
};

export default function KebijakanPrivasiPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Kebijakan Privasi</h1>
        <p className="text-sm text-slate-400 mb-8">Terakhir diperbarui: 4 Mei 2026</p>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-emerald-600">
          <h2>1. Pendahuluan</h2>
          <p>
            Adably (&quot;kami&quot;, &quot;milik kami&quot;) menghargai privasi setiap pengguna (&quot;Anda&quot;).
            Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi
            informasi pribadi Anda saat menggunakan platform edukasi Islam anak Adably
            (adably.id) beserta layanan terkait.
          </p>

          <h2>2. Informasi yang Kami Kumpulkan</h2>
          <h3>a. Informasi yang Anda Berikan</h3>
          <ul>
            <li><strong>Akun Penulis/Admin:</strong> Nama, alamat email, kata sandi (terenkripsi), nomor telepon (opsional), bio (opsional), dan informasi rekening bank untuk keperluan reward.</li>
            <li><strong>Konten:</strong> Artikel, kisah, tanya jawab, dan konten edukasi lainnya yang Anda buat melalui platform.</li>
            <li><strong>Feedback:</strong> Kritik, saran, dan laporan error yang Anda kirimkan.</li>
          </ul>

          <h3>b. Informasi yang Dikumpulkan Secara Otomatis</h3>
          <ul>
            <li><strong>Data Penggunaan:</strong> Halaman yang dikunjungi, waktu akses, interaksi (like, bookmark, rating, view).</li>
            <li><strong>Data Perangkat:</strong> User agent browser dan alamat IP (untuk keamanan login).</li>
            <li><strong>Cookie:</strong> Kami menggunakan cookie untuk autentikasi sesi (access token dan refresh token).</li>
          </ul>

          <h2>3. Bagaimana Kami Menggunakan Informasi</h2>
          <ul>
            <li>Menyediakan dan meningkatkan layanan edukasi Islam untuk anak.</li>
            <li>Mengelola akun penulis dan sistem reward poin.</li>
            <li>Memproses donasi dan penarikan dana.</li>
            <li>Mengirim notifikasi terkait aktivitas konten (review, publikasi, dll).</li>
            <li>Menganalisis penggunaan platform untuk peningkatan kualitas.</li>
            <li>Menjaga keamanan platform dan mencegah penyalahgunaan.</li>
          </ul>

          <h2>4. Integrasi Sosial Media</h2>
          <p>
            Jika Anda (sebagai admin) menghubungkan akun Facebook dan Instagram ke Adably untuk fitur
            publikasi konten, kami akan menyimpan:
          </p>
          <ul>
            <li>Token akses halaman Facebook (disimpan terenkripsi menggunakan AES-256-GCM).</li>
            <li>ID akun Instagram Business yang terhubung.</li>
            <li>Nama halaman Facebook dan username Instagram.</li>
          </ul>
          <p>
            Token ini hanya digunakan untuk mempublikasikan konten atas perintah Anda dan tidak
            pernah dibagikan kepada pihak ketiga.
          </p>

          <h2>5. Perlindungan Data</h2>
          <p>Kami mengambil langkah-langkah keamanan berikut:</p>
          <ul>
            <li>Kata sandi disimpan dalam bentuk hash (bcrypt).</li>
            <li>Token sosial media dienkripsi dengan AES-256-GCM.</li>
            <li>Semua komunikasi menggunakan HTTPS/TLS.</li>
            <li>Akses admin dilindungi dengan JWT dan role-based access control.</li>
            <li>Rate limiting untuk mencegah serangan brute force.</li>
          </ul>

          <h2>6. Berbagi Informasi</h2>
          <p>
            Kami <strong>tidak menjual, menyewakan, atau membagikan</strong> informasi pribadi Anda
            kepada pihak ketiga untuk tujuan pemasaran. Informasi hanya dapat dibagikan dalam keadaan:
          </p>
          <ul>
            <li>Diperlukan oleh hukum yang berlaku.</li>
            <li>Untuk melindungi hak, keselamatan, atau properti kami dan pengguna.</li>
            <li>Dengan penyedia layanan terpercaya yang membantu operasional platform
                (hosting, penyimpanan file) dengan perjanjian kerahasiaan.</li>
          </ul>

          <h2>7. Hak Pengguna</h2>
          <p>Anda memiliki hak untuk:</p>
          <ul>
            <li>Mengakses dan memperbarui informasi profil Anda.</li>
            <li>Menghapus akun dan data terkait (hubungi admin).</li>
            <li>Memutuskan koneksi sosial media kapan saja.</li>
            <li>Menarik persetujuan penggunaan cookie (dengan konsekuensi tidak dapat login).</li>
          </ul>

          <h2>8. Penyimpanan Data</h2>
          <p>
            Data Anda disimpan selama akun Anda aktif atau selama diperlukan untuk menyediakan
            layanan. Data yang dihapus (soft delete) disimpan sementara di &quot;Tempat Sampah&quot; dan
            dihapus permanen setelah 30 hari.
          </p>

          <h2>9. Anak-Anak</h2>
          <p>
            Konten Adably ditujukan untuk anak usia 3-10 tahun, namun platform admin dan pengelolaan
            akun hanya ditujukan untuk orang dewasa (orang tua, pendidik, dan penulis).
            Kami tidak secara sengaja mengumpulkan informasi pribadi dari anak-anak.
          </p>

          <h2>10. Perubahan Kebijakan</h2>
          <p>
            Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan signifikan
            akan diberitahukan melalui platform. Tanggal pembaruan terakhir akan selalu ditampilkan
            di bagian atas halaman ini.
          </p>

          <h2>11. Hubungi Kami</h2>
          <p>
            Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami
            melalui email: <a href="mailto:adably.id@gmail.com">adably.id@gmail.com</a>
          </p>
        </div>
      </div>
    </main>
  );
}
