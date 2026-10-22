/**
 * Data slot sertifikat Calvin.
 *
 * Tiga slot sengaja kosong. Mengisi berarti mengganti `null` menjadi nilai sebenarnya;
 * markup dan perilaku tidak perlu disentuh. Jangan menulis penerbit, tanggal, nomor
 * kredensial, atau tautan verifikasi yang belum benar-benar ada.
 *
 * Bentuk satu slot:
 *   id              string stabil, dipakai untuk id elemen; jangan diubah setelah dipakai
 *   category        'course' | 'training' | 'competition' | 'organization' | null
 *   title           nama sertifikat apa adanya, atau null
 *   issuer          nama penerbit, atau null
 *   issuedAt        tanggal terbit, format ISO 'YYYY-MM-DD' atau 'YYYY-MM', atau null
 *   skills          array nama keterampilan; biarkan [] bila belum ada
 *   documentUrl     path berkas bukti di repo, atau null
 *   documentType    'image' | 'pdf' | null, mengikuti documentUrl
 *   verificationUrl URL verifikasi penerbit, atau null
 *
 * Contoh bentuk terisi (bukan data Calvin, jangan disalin sebagai isi):
 *   { id: 'slot-a', category: 'course', title: '<nama kursus>', issuer: '<penerbit>',
 *     issuedAt: '2026-03', skills: ['<keterampilan>'], documentUrl: 'img/cert/slot-a.webp',
 *     documentType: 'image', verificationUrl: 'https://<penerbit>/verify/<kode>' }
 */
export const CERTIFICATE_SLOTS = [
  { id: 'slot-a', category: null, title: null, issuer: null, issuedAt: null, skills: [], documentUrl: null, documentType: null, verificationUrl: null },
  { id: 'slot-b', category: null, title: null, issuer: null, issuedAt: null, skills: [], documentUrl: null, documentType: null, verificationUrl: null },
  { id: 'slot-c', category: null, title: null, issuer: null, issuedAt: null, skills: [], documentUrl: null, documentType: null, verificationUrl: null }
];

export const CATEGORY_LABELS = {
  course: 'Kursus',
  training: 'Pelatihan',
  competition: 'Lomba',
  organization: 'Organisasi'
};
