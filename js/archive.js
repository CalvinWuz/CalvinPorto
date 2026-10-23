/**
 * Map arsip sertifikat.
 *
 * Tanpa JavaScript kedua lembar dan detailnya tampil terbuka dari markup. Script
 * mengubahnya menjadi satu map dengan tab, lalu mengisi ulang nilai tiap lembar dari
 * `certificates.js` supaya datanya punya satu sumber terstruktur.
 *
 * Datanya diimpor secara dinamis dengan penanda versi yang diteruskan dari `main.js`.
 * Import statis relatif tidak ikut membawa query versi, sehingga modul data bisa
 * tertinggal di cache browser sementara HTML-nya sudah baru.
 *
 * Reaksi kucing dikirim sebagai intent ke controller global lewat `calvin:companion`.
 * Tidak ada actor kedua di dalam katalog, dan katalog tetap berfungsi penuh ketika kucing
 * sedang sibuk, dijeda, atau gerak dimatikan.
 */
const EMPTY_VALUE = 'Belum diisi';
const EMPTY_LINK = 'Belum ditambahkan';
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const letter = index => String.fromCharCode(65 + index);

function formatDate(value) {
  if (!value) return EMPTY_VALUE;
  const parts = String(value).split('-').map(Number);
  if (!parts[0] || Number.isNaN(parts[0])) return String(value);
  if (parts.length === 1) return String(parts[0]);
  const month = MONTHS[parts[1] - 1] || '';
  return parts.length >= 3 ? `${parts[2]} ${month} ${parts[0]}` : `${month} ${parts[0]}`;
}

const intent = action => window.dispatchEvent(new CustomEvent('calvin:companion', { detail: { action } }));

export async function initCertificateArchive({ onLayout, dataVersion = '' } = {}) {
  const root = document.querySelector('[data-cert-archive]');
  if (!root || root.dataset.certReady === 'true') return;

  // Markup sudah memuat data sertifikat yang lengkap. Kalau modul datanya gagal dimuat,
  // biarkan markup itu apa adanya: lebih baik terbaca daripada berubah jadi serba kosong.
  let CERTIFICATE_SLOTS, CATEGORY_LABELS;
  try {
    const data = await import('./certificates.js' + (dataVersion ? '?v=' + encodeURIComponent(dataVersion) : ''));
    CERTIFICATE_SLOTS = data.CERTIFICATE_SLOTS; CATEGORY_LABELS = data.CATEGORY_LABELS;
  } catch (error) {
    console.error('[portofolio] data sertifikat gagal dimuat, memakai isi dari HTML', error);
    return;
  }
  if (!Array.isArray(CERTIFICATE_SLOTS) || !CERTIFICATE_SLOTS.length) {
    console.error('[portofolio] data sertifikat kosong, memakai isi dari HTML');
    return;
  }
  const tabs = [...root.querySelectorAll('[data-cert-tab]')];
  const panels = [...root.querySelectorAll('[data-cert-panel]')];
  const live = root.querySelector('[data-cert-live]');
  if (!tabs.length || panels.length !== tabs.length) return;
  // Data dan markup harus berasal dari rilis yang sama. Kalau jumlahnya berbeda, modul
  // datanya hampir pasti versi lama dari cache; markup yang sudah benar dibiarkan utuh.
  if (CERTIFICATE_SLOTS.length !== panels.length) {
    console.error(`[portofolio] data sertifikat (${CERTIFICATE_SLOTS.length} slot) tidak cocok dengan markup (${panels.length} panel); memakai isi dari HTML`);
    return;
  }

  let selected = 0;
  const announce = text => { if (live) live.textContent = text; };
  const layout = () => {
    if (typeof onLayout === 'function') onLayout();
    window.dispatchEvent(new Event('calvin:geometry'));
  };
  const slotOf = index => CERTIFICATE_SLOTS[index] || null;
  const filled = slot => Boolean(slot && slot.title);

  /** Menulis nilai satu lembar dari data; markup hanya menyediakan tempatnya. */
  function render(panel, index) {
    const slot = slotOf(index), label = letter(index);
    const set = (key, value) => { const node = panel.querySelector(`[data-cert-field=${key}]`); if (node) node.textContent = value; };
    set('tag', `Lembar ${label}`);
    set('status', filled(slot) ? 'Terisi' : EMPTY_VALUE);
    set('heading', filled(slot) ? slot.title : 'Dokumen sertifikat belum ditambahkan.');
    set('detailTitle', `Isi slot ${label}`);
    set('title', (slot && slot.title) || EMPTY_VALUE);
    set('issuer', (slot && slot.issuer) || EMPTY_VALUE);
    set('category', slot && slot.category ? (CATEGORY_LABELS[slot.category] || slot.category) : EMPTY_VALUE);
    set('issued', formatDate(slot && slot.issuedAt));
    set('skills', slot && slot.skills && slot.skills.length ? slot.skills.join(', ') : EMPTY_VALUE);
    set('note', (slot && slot.note) || EMPTY_VALUE);

    // Tautan verifikasi hanya dibuat ketika URL-nya ada; tidak ada href="#" yang berpura-pura.
    const verify = panel.querySelector('[data-cert-field=verify]');
    if (verify) {
      verify.replaceChildren();
      if (slot && slot.verificationUrl) {
        const link = document.createElement('a');
        link.className = 'link'; link.href = slot.verificationUrl;
        link.target = '_blank'; link.rel = 'noopener';
        link.textContent = 'Buka halaman verifikasi';
        verify.append(link, Object.assign(document.createElement('span'), { className: 'vh', textContent: ', terbuka di tab baru' }));
      } else verify.textContent = EMPTY_LINK;
    }

    const area = panel.querySelector('[data-cert-document]');
    if (!area) return;
    area.replaceChildren();
    if (slot && slot.documentUrl && slot.documentType === 'image') {
      const image = document.createElement('img');
      image.src = slot.documentUrl; image.loading = 'lazy'; image.decoding = 'async';
      image.alt = slot.title ? `Sertifikat ${slot.title}` : `Dokumen slot ${label}`;
      area.append(image);
    } else if (slot && slot.documentUrl) {
      const link = document.createElement('a');
      link.className = 'link'; link.href = slot.documentUrl; link.target = '_blank'; link.rel = 'noopener';
      link.textContent = 'Buka dokumen (PDF)';
      area.append(link);
    } else {
      area.append(
        Object.assign(document.createElement('strong'), { textContent: 'Dokumen belum ditambahkan' }),
        Object.assign(document.createElement('span'), { textContent: 'Nanti gambar atau PDF sertifikat tampil di sini.' })
      );
    }
  }

  function select(index, { announceChange = true } = {}) {
    selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-pressed', String(i === index));
      const small = tab.querySelector('small');
      if (small) small.textContent = filled(slotOf(i)) ? 'terisi' : 'belum diisi';
    });
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    const panel = panels[index], sheet = panel.querySelector('[data-cert-sheet]');
    if (sheet && announceChange && document.documentElement.dataset.motion !== 'paused') {
      sheet.classList.remove('is-changing'); void sheet.offsetWidth; sheet.classList.add('is-changing');
    }
    if (announceChange) {
      const slot = slotOf(index);
      announce(`Slot ${letter(index)} dipilih. ${filled(slot) ? 'Sudah diisi.' : 'Belum diisi.'}`);
    }
    layout();
  }

  panels.forEach((panel, index) => {
    const detail = panel.querySelector('[data-cert-detail]');
    const openButton = panel.querySelector('[data-cert-open]');
    const closeButton = panel.querySelector('[data-cert-close]');
    const folder = panel.querySelector('[data-cert-folder]');
    const sheet = panel.querySelector('[data-cert-sheet]');
    if (!detail || !openButton || !closeButton) return;
    render(panel, index);
    detail.id = `cert-detail-${index}`;
    openButton.setAttribute('aria-controls', detail.id);
    detail.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');

    const open = () => {
      detail.hidden = false; folder?.classList.add('is-open');
      openButton.setAttribute('aria-expanded', 'true');
      intent('archive-open');
      const slot = slotOf(index);
      announce(`Detail slot ${letter(index)} dibuka.${filled(slot) ? '' : ' Dokumen belum ditambahkan.'}`);
      layout();
      try { closeButton.focus({ preventScroll: true }); } catch { closeButton.focus(); }
    };
    const close = () => {
      detail.hidden = true; folder?.classList.remove('is-open');
      openButton.setAttribute('aria-expanded', 'false');
      intent('archive-close');
      announce('Detail slot ditutup.');
      layout();
      try { openButton.focus({ preventScroll: true }); } catch { openButton.focus(); }
    };
    openButton.addEventListener('click', () => { detail.hidden ? open() : close(); });
    closeButton.addEventListener('click', close);
    // Detail berada di alur halaman; Escape menutup tanpa memerangkap fokus.
    panel.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || detail.hidden) return;
      event.preventDefault(); close();
    });
    sheet?.addEventListener('animationend', () => sheet.classList.remove('is-changing'));
  });

  tabs.forEach((tab, index) => tab.addEventListener('click', () => select(index)));
  root.querySelector('[data-cert-tabs]')?.removeAttribute('hidden');
  root.dataset.certReady = 'true';
  root.classList.add('cert-enhanced');
  select(0, { announceChange: false });
}
