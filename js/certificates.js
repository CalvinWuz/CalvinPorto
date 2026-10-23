/**
 * Data slot sertifikat Calvin.
 *
 * Mengisi slot berarti mengganti `null` menjadi nilai sebenarnya; markup dan perilaku
 * tidak perlu disentuh. Jangan menulis penerbit, tanggal, nomor kredensial, atau tautan
 * verifikasi yang belum benar-benar ada pada dokumennya.
 *
 * Bentuk satu slot:
 *   id              string stabil, dipakai untuk id elemen; jangan diubah setelah dipakai
 *   category        'course' | 'training' | 'competition' | 'organization' | null
 *   title           nama sertifikat apa adanya, atau null
 *   issuer          nama penerbit, atau null
 *   issuedAt        tanggal terbit, format ISO 'YYYY-MM-DD' atau 'YYYY-MM', atau null
 *   skills          array nama keterampilan; biarkan [] bila belum ada
 *   note            konteks singkat yang tertulis di dokumen (peran, tim, tingkat,
 *                   nomor sertifikat). Jangan menambah tafsiran yang tidak tertulis.
 *   documentUrl     path berkas bukti di repo, atau null
 *   documentType    'image' | 'pdf' | null, mengikuti documentUrl
 *   verificationUrl URL verifikasi penerbit, atau null
 *
 * Setelah mengubah data di sini, perbarui juga ringkasan statis slot itu di `index.html`
 * supaya tampilan tanpa JavaScript tetap cocok.
 */
export const CERTIFICATE_SLOTS = [
  {
    id: 'slot-a',
    category: 'course',
    title: 'C for Beginners',
    issuer: 'Great Learning Academy',
    issuedAt: '2024-10',
    skills: ['Data types', 'Variables', 'Operators', 'Arrays', 'Strings', 'Pointers', 'Functions', 'I/O operations', 'Structure and unions'],
    note: 'Kursus online gratis, durasi 1,5 jam menurut halaman kursusnya.',
    documentUrl: 'img/cert/c-for-beginners.webp',
    documentType: 'image',
    verificationUrl: null
  },
  {
    id: 'slot-b',
    category: 'competition',
    title: 'Capture the Flag I-FEST#13',
    issuer: 'Universitas Atma Jaya Yogyakarta',
    issuedAt: '2025-05-24',
    skills: [],
    note: 'Sebagai peserta, tim Lipet lipet. Tingkat nasional, tema "Hack and Seek: Conquering Layers by Breaking Barriers". Nomor sertifikat 607.113/SF-FTI/2025.',
    documentUrl: 'img/cert/ctf-ifest-13.webp',
    documentType: 'image',
    verificationUrl: null
  }
];

export const CATEGORY_LABELS = {
  course: 'Kursus',
  training: 'Pelatihan',
  competition: 'Lomba',
  organization: 'Organisasi'
};
