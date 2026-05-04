import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Penghapusan Data Pengguna — Adably",
  description: "Instruksi dan kebijakan penghapusan data pengguna platform Adably",
};

export default function PenghapusanDataPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Penghapusan Data Pengguna</h1>
        <p className="text-sm text-slate-400 mb-8">Terakhir diperbarui: 4 Mei 2026</p>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-emerald-600">
          <h2>1. Hak Anda atas Data Pribadi</h2>
          <p>
            Sesuai dengan komitmen kami terhadap privasi, Anda memiliki hak penuh untuk meminta
            penghapusan data pribadi Anda dari platform Adably. Kami menghormati hak ini dan akan
            memproses setiap permintaan dengan serius dan tepat waktu.
          </p>

          <h2>2. Data yang Dapat Dihapus</h2>
          <p>Ketika Anda meminta penghapusan data, kami akan menghapus:</p>
          <ul>
            <li><strong>Informasi akun:</strong> Nama, alamat email, nomor telepon, bio, dan foto profil.</li>
            <li><strong>Informasi keuangan:</strong> Data rekening bank yang tersimpan untuk keperluan reward.</li>
            <li><strong>Riwayat aktivitas:</strong> Riwayat login, notifikasi, dan log aktivitas internal.</li>
            <li><strong>Token sosial media:</strong> Token akses Facebook/Instagram yang terenkripsi (jika ada).</li>
            <li><strong>Pesan pribadi:</strong> Percakapan dan pesan dalam fitur messaging.</li>
          </ul>

          <h2>3. Data yang Dipertahankan</h2>
          <p>
            Beberapa data mungkin dipertahankan sesuai ketentuan lisensi dan kepentingan publik:
          </p>
          <ul>
            <li><strong>Konten yang telah dipublikasikan:</strong> Artikel, kisah, dan tanya jawab yang telah dipublikasikan dapat tetap tersedia di platform sesuai lisensi konten yang diberikan saat pengiriman. Namun, nama penulis akan dianonimkan.</li>
            <li><strong>Data agregat:</strong> Statistik anonim yang tidak dapat dikaitkan dengan identitas Anda (total views, rating, dll).</li>
            <li><strong>Data hukum:</strong> Data yang wajib dipertahankan berdasarkan peraturan perundang-undangan yang berlaku.</li>
          </ul>

          <h2>4. Cara Mengajukan Penghapusan Data</h2>
          <p>Anda dapat meminta penghapusan data melalui salah satu cara berikut:</p>

          <h3>a. Melalui Email</h3>
          <p>
            Kirim email ke <a href="mailto:adably.id@gmail.com">adably.id@gmail.com</a> dengan
            subjek <strong>&quot;Permintaan Penghapusan Data&quot;</strong> dan sertakan informasi berikut:
          </p>
          <ul>
            <li>Nama lengkap sesuai akun</li>
            <li>Alamat email yang terdaftar di Adably</li>
            <li>Alasan permintaan penghapusan (opsional)</li>
          </ul>

          <h3>b. Melalui Facebook</h3>
          <p>
            Jika Anda telah menghubungkan akun Facebook dengan Adably, Anda juga dapat
            menghapus data melalui pengaturan Facebook:
          </p>
          <ol>
            <li>Buka <strong>Pengaturan Facebook</strong> → <strong>Keamanan dan Login</strong>.</li>
            <li>Pilih <strong>Aplikasi dan Situs Web</strong>.</li>
            <li>Cari <strong>Adably</strong> dan pilih <strong>Hapus</strong>.</li>
            <li>Konfirmasi penghapusan data.</li>
          </ol>
          <p>
            Ketika Anda menghapus koneksi melalui Facebook, kami akan secara otomatis menghapus
            token akses dan data koneksi sosial media terkait.
          </p>

          <h2>5. Proses dan Waktu Penghapusan</h2>
          <ul>
            <li><strong>Konfirmasi:</strong> Kami akan mengkonfirmasi penerimaan permintaan Anda dalam waktu 2 hari kerja.</li>
            <li><strong>Verifikasi:</strong> Kami akan memverifikasi identitas Anda untuk mencegah penghapusan data yang tidak sah.</li>
            <li><strong>Pelaksanaan:</strong> Penghapusan data akan dilaksanakan dalam waktu maksimal 30 hari kalender setelah verifikasi berhasil.</li>
            <li><strong>Pemberitahuan:</strong> Anda akan menerima email konfirmasi setelah penghapusan selesai dilakukan.</li>
          </ul>

          <h2>6. Konsekuensi Penghapusan</h2>
          <p>Setelah data dihapus:</p>
          <ul>
            <li>Anda tidak akan dapat mengakses akun kontributor Anda.</li>
            <li>Poin reward yang belum dicairkan akan hangus.</li>
            <li>Riwayat penarikan dana yang sudah diproses tetap tersimpan untuk keperluan audit keuangan.</li>
            <li>Tindakan ini tidak dapat dibatalkan.</li>
          </ul>

          <h2>7. Hubungi Kami</h2>
          <p>
            Jika Anda memiliki pertanyaan tentang proses penghapusan data, silakan hubungi kami
            melalui email: <a href="mailto:adably.id@gmail.com">adably.id@gmail.com</a>
          </p>
        </div>
      </div>
    </main>
  );
}
