import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ketentuan Layanan — Adably",
  description: "Ketentuan layanan penggunaan platform edukasi Islam anak Adably",
};

export default function KetentuanLayananPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Ketentuan Layanan</h1>
        <p className="text-sm text-slate-400 mb-8">Terakhir diperbarui: 4 Mei 2026</p>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-emerald-600">
          <h2>1. Persetujuan</h2>
          <p>
            Dengan mengakses dan menggunakan platform Adably (adably.id), Anda menyetujui dan terikat
            oleh Ketentuan Layanan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak
            menggunakan layanan kami.
          </p>

          <h2>2. Deskripsi Layanan</h2>
          <p>
            Adably adalah platform edukasi parenting Islami yang menyediakan konten berupa tanya jawab,
            artikel, kisah, dan materi pembelajaran untuk anak usia 3–10 tahun. Konten disusun
            berdasarkan referensi Al-Qur&apos;an, Hadits, dan literatur ulama.
          </p>

          <h2>3. Akun Pengguna</h2>
          <h3>a. Pendaftaran</h3>
          <ul>
            <li>Akun kontributor (penulis dan admin) dibuat melalui undangan atau pendaftaran yang disetujui oleh SuperAdmin.</li>
            <li>Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda.</li>
            <li>Anda wajib memberikan informasi yang akurat dan terkini saat mendaftar.</li>
          </ul>

          <h3>b. Keamanan Akun</h3>
          <ul>
            <li>Segera laporkan kepada kami jika Anda mengetahui adanya penggunaan tidak sah atas akun Anda.</li>
            <li>Kami tidak bertanggung jawab atas kerugian yang timbul akibat kegagalan Anda menjaga keamanan akun.</li>
          </ul>

          <h2>4. Konten dan Hak Kekayaan Intelektual</h2>
          <h3>a. Konten Pengguna</h3>
          <ul>
            <li>Dengan mengirimkan konten ke Adably, Anda memberikan lisensi non-eksklusif, bebas royalti, dan dapat disublisensikan kepada Adably untuk menggunakan, menampilkan, mendistribusikan, dan mempublikasikan konten tersebut melalui platform dan kanal sosial media resmi Adably.</li>
            <li>Anda menjamin bahwa konten yang Anda kirimkan tidak melanggar hak cipta, merek dagang, atau hak kekayaan intelektual pihak ketiga.</li>
            <li>Konten yang merujuk pada dalil (ayat Al-Qur&apos;an, Hadits) harus menyertakan sumber yang dapat diverifikasi.</li>
          </ul>

          <h3>b. Proses Review</h3>
          <ul>
            <li>Semua konten yang dikirimkan akan melalui proses peninjauan (review) oleh tim redaksi sebelum dipublikasikan.</li>
            <li>Tim redaksi berhak menolak, meminta revisi, atau mengedit konten untuk menjaga kualitas dan kesesuaian dengan nilai-nilai Islam.</li>
          </ul>

          <h3>c. Hak Milik Platform</h3>
          <ul>
            <li>Desain, logo, kode sumber, dan elemen visual Adably adalah milik Adably dan dilindungi hak cipta.</li>
            <li>Dilarang menyalin, memodifikasi, atau mendistribusikan elemen-elemen tersebut tanpa izin tertulis.</li>
          </ul>

          <h2>5. Sistem Reward dan Poin</h2>
          <ul>
            <li>Kontributor dapat memperoleh poin berdasarkan kontribusi konten yang memenuhi syarat.</li>
            <li>Poin dapat ditukarkan sesuai kebijakan yang berlaku dan dicairkan melalui proses penarikan (withdrawal) yang telah ditentukan.</li>
            <li>Adably berhak mengubah ketentuan perolehan dan penukaran poin dengan pemberitahuan sebelumnya.</li>
            <li>Penyalahgunaan sistem poin (termasuk spam konten) dapat mengakibatkan pembatalan poin dan penangguhan akun.</li>
          </ul>

          <h2>6. Penggunaan yang Dilarang</h2>
          <p>Anda dilarang menggunakan platform untuk:</p>
          <ul>
            <li>Mengirimkan konten yang mengandung ujaran kebencian, pornografi, kekerasan, atau konten yang bertentangan dengan nilai-nilai Islam.</li>
            <li>Menyebarkan informasi palsu atau menyesatkan terkait ajaran Islam.</li>
            <li>Melakukan tindakan yang dapat mengganggu atau merusak operasional platform.</li>
            <li>Menggunakan bot, scraper, atau alat otomatis untuk mengakses platform tanpa izin.</li>
            <li>Mencoba mengakses sistem, data, atau akun yang bukan milik Anda.</li>
          </ul>

          <h2>7. Integrasi Sosial Media</h2>
          <p>
            Fitur publikasi ke Instagram dan Facebook hanya tersedia untuk SuperAdmin.
            Dengan menghubungkan akun sosial media, Anda menyetujui bahwa:
          </p>
          <ul>
            <li>Adably akan menyimpan token akses secara terenkripsi untuk keperluan publikasi.</li>
            <li>Konten yang dipublikasikan ke sosial media mewakili platform Adably.</li>
            <li>Anda dapat memutuskan koneksi sosial media kapan saja melalui halaman pengaturan.</li>
          </ul>

          <h2>8. Donasi</h2>
          <ul>
            <li>Donasi yang diberikan melalui platform bersifat sukarela dan tidak dapat dikembalikan.</li>
            <li>Dana donasi digunakan untuk operasional dan pengembangan platform.</li>
            <li>Bukti donasi harus diunggah untuk proses verifikasi.</li>
          </ul>

          <h2>9. Pembatasan Tanggung Jawab</h2>
          <ul>
            <li>Adably menyediakan layanan &quot;sebagaimana adanya&quot; (as is) tanpa jaminan tersurat maupun tersirat.</li>
            <li>Kami tidak bertanggung jawab atas kerugian langsung, tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan platform.</li>
            <li>Konten edukasi di Adably bersifat informatif dan bukan pengganti konsultasi langsung dengan ulama atau ahli agama.</li>
          </ul>

          <h2>10. Penghentian Layanan</h2>
          <ul>
            <li>Kami berhak menangguhkan atau menghentikan akun Anda jika terjadi pelanggaran terhadap Ketentuan Layanan ini.</li>
            <li>Anda dapat menghentikan penggunaan layanan kapan saja dengan menghubungi admin untuk penghapusan akun.</li>
            <li>Konten yang telah dipublikasikan dapat tetap tersedia di platform meskipun akun Anda dihentikan, sesuai dengan lisensi yang telah diberikan.</li>
          </ul>

          <h2>11. Perubahan Ketentuan</h2>
          <p>
            Kami dapat memperbarui Ketentuan Layanan ini dari waktu ke waktu. Perubahan signifikan
            akan diberitahukan melalui platform. Dengan terus menggunakan layanan setelah perubahan
            berlaku, Anda dianggap menyetujui ketentuan yang telah diperbarui.
          </p>

          <h2>12. Hukum yang Berlaku</h2>
          <p>
            Ketentuan Layanan ini tunduk pada dan ditafsirkan sesuai dengan hukum yang berlaku
            di Republik Indonesia. Setiap perselisihan akan diselesaikan secara musyawarah mufakat
            terlebih dahulu.
          </p>

          <h2>13. Hubungi Kami</h2>
          <p>
            Jika Anda memiliki pertanyaan tentang Ketentuan Layanan ini, silakan hubungi kami
            melalui email: <a href="mailto:adably.id@gmail.com">adably.id@gmail.com</a>
          </p>
        </div>
      </div>
    </main>
  );
}
