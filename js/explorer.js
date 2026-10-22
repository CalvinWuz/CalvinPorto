/* Progressive enhancement: without JS, every project and chapter remains readable. */
export function initProjectExplorer({ onLayout } = {}) {
  const root = document.querySelector('[data-project-explorer]');
  if (!root || root.dataset.pxReady === 'true') return;
  const projectButtons = [...root.querySelectorAll('[data-px-select]')];
  const chapterButtons = [...root.querySelectorAll('[data-px-chapter]')];
  const projects = [...root.querySelectorAll('[data-px-project]')];
  const live = root.querySelector('[data-px-live]');
  if (!projects.length || !projectButtons.length || !chapterButtons.length) return;
  let project = 'cookies';
  let chapter = 'masalah';

  const update = (announce = true) => {
    const selected = projects.find(item => item.dataset.pxProject === project);
    if (!selected) return;
    projectButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.pxSelect === project));
      button.setAttribute('aria-controls', `px-project-${button.dataset.pxSelect}`);
    });
    chapterButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.pxChapter === chapter));
      button.setAttribute('aria-controls', `px-${project}-${button.dataset.pxChapter}`);
    });
    projects.forEach(item => {
      const active = item === selected;
      item.hidden = !active;
      item.querySelectorAll('[data-px-page]').forEach(page => {
        page.hidden = !active || page.dataset.pxPage !== chapter;
      });
    });
    if (announce && live) {
      const title = selected.querySelector('h3').textContent.trim();
      const pageName = chapterButtons.find(button => button.dataset.pxChapter === chapter).textContent.trim();
      live.textContent = `${title}. ${pageName}`;
    }
    if (typeof onLayout === 'function') onLayout();
    root.dispatchEvent(new CustomEvent('calvin:project-layout', { bubbles: true }));
    // Memilih lembar proyek: maskot memperhatikan sebentar. Intent kosmetik, bukan syarat.
    if (announce) window.dispatchEvent(new CustomEvent('calvin:companion', { detail: { action: 'inspect' } }));
  };

  projectButtons.forEach(button => button.addEventListener('click', () => {
    project = button.dataset.pxSelect;
    update();
  }));
  chapterButtons.forEach(button => button.addEventListener('click', () => {
    chapter = button.dataset.pxChapter;
    update();
  }));

  // Buttons retain normal Tab/Shift+Tab and Enter/Space behavior; no tab widget is implied.
  projects.forEach(item => { item.id = `px-project-${item.dataset.pxProject}`; });
  root.querySelector('.px-project-tabs').hidden = false;
  root.querySelector('.px-controls').hidden = false;
  root.dataset.pxReady = 'true';
  root.classList.add('px-enhanced');
  update(false);
}
