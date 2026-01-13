

class Tutorial {
  constructor(root = document.getElementById('tutorial-root')) {
    if (!root) throw new Error('Tutorial root element not found');
    this.root = root;
    this.overlay = root.querySelector('.tut-overlay');
    this.spotlight = root.querySelector('.tut-spotlight');
    this.panel = root.querySelector('.tut-panel');
    this.titleEl = root.querySelector('.tut-title');
    this.contentEl = root.querySelector('.tut-content');
    this.prevBtn = root.querySelector('.tut-prev');
    this.nextBtn = root.querySelector('.tut-next');
    this.doneBtn = root.querySelector('.tut-done');

    this.steps = [];
    this.index = 0;
    this.centered = false; // NEW

    this.boundKeyHandler = this.onKeyDown.bind(this);

    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.doneBtn.addEventListener('click', () => this.end());
    this.overlay.addEventListener('click', () => this.end());
    window.addEventListener('resize', () => this.render());
    window.addEventListener('scroll', () => this.render(), { passive: true });
  }

  /** Pass { centered: true } to force the tutorial panel to center */
  start(steps, options = {}) {
    this.steps = steps || [];
    this.centered = !!options.centered; // NEW
    if (!this.steps.length) return;

    this.root.hidden = false;
    this._prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    this.index = 0;
    this.skipMissingTargets();
    this.render();
    this.nextBtn.focus();
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  end() {
    this.root.hidden = true;
    document.body.style.overflow = this._prevOverflow || '';
    document.removeEventListener('keydown', this.boundKeyHandler);
    this.panel.classList.remove('centered'); // cleanup
  }

  next() {
    if (this.index < this.steps.length - 1) {
      this.index++;
      this.skipMissingTargets();
      this.render();
    } else {
      this.end();
    }
  }

  prev() {
    if (this.index > 0) {
      this.index--;
      this.skipMissingTargets(true);
      this.render();
    }
  }

  onKeyDown(e) {
    if (e.key === 'Escape') this.end();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
  }

  skipMissingTargets(backwards = false) {
    while (this.index >= 0 && this.index < this.steps.length) {
      const sel = this.steps[this.index]?.target;
      if (!sel) break;
      if (document.querySelector(sel)) break;
      this.index += backwards ? -1 : 1;
    }
  }



/* my code recommendation: */
// REPLACEMENT: replace the entire render() function in tutorialModule.js with this one.
render() {
  const step = this.steps[this.index];
  if (!step) return;

  const el = step.target ? document.querySelector(step.target) : null;

  // Update title & content
  this.titleEl.textContent = step.title || `Step ${this.index + 1} of ${this.steps.length}`;
  this.contentEl.innerHTML = step.content || '';

  // Stages
  const isFirst = this.index === 0;                  // Intro screen
  const isSecond = this.index === 1;                 // First real step
  const isLast = this.index === this.steps.length - 1;

  // ---------- Button visibility ----------
  // Intro: Begin Tour + Skip Tour; no Prev
  // Step 1: Next + Exit; no Prev
  // Step ≥ 2: Back + Next/Finish + Exit
  this.prevBtn.style.display  = (isFirst || isSecond) ? 'none' : '';
  this.nextBtn.style.display  = '';        // always visible
  this.doneBtn.style.display  = '';        // always visible

  // ---------- Button labels (icon AFTER text) ----------
  // Prev: Back (only when visible) — regular icon
  this.prevBtn.innerHTML = '<span>Back</span><i class="fa-regular fa-square-caret-left" aria-hidden="true" style="margin-left:6px"></i>';
  this.prevBtn.setAttribute('aria-label', 'Back');

  // Next: Begin Tour on intro; Next afterward; Finish on last — SOLID icon
  if (isFirst) {
    this.nextBtn.innerHTML = '<span>Begin Tour</span><i class="fa-solid fa-square-caret-right" aria-hidden="true" style="margin-left:6px"></i>';
    this.nextBtn.setAttribute('aria-label', 'Begin Tour');
  } else if (isLast) {
    this.nextBtn.innerHTML = '<span>Finish</span><i class="fa-solid fa-square-caret-right" aria-hidden="true" style="margin-left:6px"></i>';
    this.nextBtn.setAttribute('aria-label', 'Finish');
  } else {
    this.nextBtn.innerHTML = '<span>Next</span><i class="fa-solid fa-square-caret-right" aria-hidden="true" style="margin-left:6px"></i>';
    this.nextBtn.setAttribute('aria-label', 'Next');
  }

  // Done: Skip Tour on intro; Exit thereafter — text-only (no icon)
  this.doneBtn.textContent = isFirst ? 'Skip Tour' : 'Exit';
  this.doneBtn.setAttribute('aria-label', isFirst ? 'Skip tutorial' : 'Exit tutorial');

  // ---------- Centered intro handling ----------
  if (this.centered) {
    this.spotlight.style.width = '0';
    this.spotlight.style.height = '0';
    this.spotlight.style.left = '0';
    this.spotlight.style.top = '0';
    this.panel.classList.add('centered');
    return; // intro stays centered
  }

  // ---------- Default: spotlight target + float panel ----------
  if (el) {
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });

    const rect = el.getBoundingClientRect();
    const pad = step.padding ?? 8;
    const x = rect.left - pad;
    const y = rect.top - pad;
    const w = rect.width + pad * 2;
    const h = rect.height + pad * 2;

    Object.assign(this.spotlight.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: `${step.radius ?? 8}px`
    });

    const panelMargin = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const panelW = Math.min(380, viewportW * 0.9);
    const panelH = this.panel.offsetHeight || 140;

    let panelLeft = viewportW - panelW - 16;
    let panelTop  = 16;

    const preferred = step.position || 'top-right';
    if (preferred === 'top-right') {
      panelLeft = Math.min(viewportW - panelW - 16, x + w + panelMargin);
      panelTop  = Math.max(16, y - panelH - panelMargin);
      if (panelTop < 0) panelTop = y + h + panelMargin;
      if (panelLeft + panelW > viewportW - 16) panelLeft = viewportW - panelW - 16;
    } else if (preferred === 'bottom') {
      panelLeft = Math.max(16, Math.min(viewportW - panelW - 16, x));
      panelTop  = y + h + panelMargin;
    } else if (preferred === 'right') {
      panelLeft = x + w + panelMargin;
      panelTop  = Math.max(16, Math.min(viewportH - panelH - 16, y));
    }

    this.panel.classList.remove('centered');
    this.panel.style.left = `${panelLeft}px`;
    this.panel.style.top  = `${panelTop}px`;
  } else {
    this.panel.classList.add('centered');
    this.spotlight.style.width = '0';
    this.spotlight.style.height = '0';
  }
}




/* my code recommendation: */
// REPLACEMENT: replace the entire render() function in tutorialModule.js with this one.
render() {
  const step = this.steps[this.index];
  if (!step) return;

  const el = step.target ? document.querySelector(step.target) : null;

  // Update title & content
  this.titleEl.textContent = step.title || `Step ${this.index + 1} of ${this.steps.length}`;
  this.contentEl.innerHTML = step.content || '';

  // Stages
  const isFirst = this.index === 0;                  // Intro screen
  const isSecond = this.index === 1;                 // First real step
  const isLast = this.index === this.steps.length - 1;

  // ---------- Button visibility ----------
  // Intro: Begin Tour + Skip Tour; no Prev
  // Step 1: Next + Exit; no Prev
  // Step >= 2: Back + Next/Finish + Exit
  this.prevBtn.style.display  = (isFirst || isSecond) ? 'none' : '';
  this.nextBtn.style.display  = '';        // always visible
  this.doneBtn.style.display  = '';        // always visible

  // ---------- Button labels (icon + text) ----------
  // Prev: Back (only when visible)
  this.prevBtn.innerHTML = '<i class="fa-regular fa-square-caret-left" aria-hidden="true"></i><span style="margin-left:6px">Back</span>';
  this.prevBtn.setAttribute('aria-label', 'Back');

  // Next: Begin Tour on intro; Next afterward; Finish on last step
  if (isFirst) {
    this.nextBtn.innerHTML = '<i class="fa-regular fa-square-caret-right" aria-hidden="true"></i><span style="margin-left:6px">Begin Tour</span>';
    this.nextBtn.setAttribute('aria-label', 'Begin Tour');
  } else if (isLast) {
    this.nextBtn.innerHTML = '<i class="fa-regular fa-square-caret-right" aria-hidden="true"></i><span style="margin-left:6px">Finish</span>';
    this.nextBtn.setAttribute('aria-label', 'Finish');
  } else {
    this.nextBtn.innerHTML = '<i class="fa-regular fa-square-caret-right" aria-hidden="true"></i><span style="margin-left:6px">Next</span>';
    this.nextBtn.setAttribute('aria-label', 'Next');
  }

  // Done: Skip Tour on intro; Exit thereafter
  this.doneBtn.textContent = isFirst ? 'Skip Tour' : 'Exit';
  this.doneBtn.setAttribute('aria-label', isFirst ? 'Skip tutorial' : 'Exit tutorial');

  // ---------- Centered intro handling ----------
  if (this.centered) {
    this.spotlight.style.width = '0';
    this.spotlight.style.height = '0';
    this.spotlight.style.left = '0';
    this.spotlight.style.top = '0';
    this.panel.classList.add('centered');
    return; // intro stays centered
  }

  // ---------- Default: spotlight target + float panel ----------
  if (el) {
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });

    const rect = el.getBoundingClientRect();
    const pad = step.padding ?? 8;
    const x = rect.left - pad;
    const y = rect.top - pad;
    const w = rect.width + pad * 2;
    const h = rect.height + pad * 2;

    Object.assign(this.spotlight.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: `${step.radius ?? 8}px`
    });

    const panelMargin = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const panelW = Math.min(380, viewportW * 0.9);
    const panelH = this.panel.offsetHeight || 140;

    let panelLeft = viewportW - panelW - 16;
    let panelTop  = 16;

    const preferred = step.position || 'top-right';
    if (preferred === 'top-right') {
      panelLeft = Math.min(viewportW - panelW - 16, x + w + panelMargin);
      panelTop  = Math.max(16, y - panelH - panelMargin);
      if (panelTop < 0) panelTop = y + h + panelMargin;
      if (panelLeft + panelW > viewportW - 16) panelLeft = viewportW - panelW - 16;
    } else if (preferred === 'bottom') {
      panelLeft = Math.max(16, Math.min(viewportW - panelW - 16, x));
      panelTop  = y + h + panelMargin;
    } else if (preferred === 'right') {
      panelLeft = x + w + panelMargin;
      panelTop  = Math.max(16, Math.min(viewportH - panelH - 16, y));
    }

    this.panel.classList.remove('centered');
    this.panel.style.left = `${panelLeft}px`;
    this.panel.style.top  = `${panelTop}px`;
  } else {
    this.panel.classList.add('centered');
    this.spotlight.style.width = '0';
    this.spotlight.style.height = '0';
  }
}



}

// Expose singleton
window.Tutorial = new Tutorial();




