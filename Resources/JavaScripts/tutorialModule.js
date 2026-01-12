

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

  render() {
    const step = this.steps[this.index];
    if (!step) return;

    const el = step.target ? document.querySelector(step.target) : null;

    // Update text and buttons
    this.titleEl.textContent = step.title || `Step ${this.index + 1} of ${this.steps.length}`;
    this.contentEl.innerHTML = step.content || '';
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.textContent = this.index === this.steps.length - 1 ? 'Finish ▶' : 'Next ▶';

    if (this.centered) {
      // Hide spotlight and center the panel
      this.spotlight.style.width = '0';
      this.spotlight.style.height = '0';
      this.spotlight.style.left = '0';
      this.spotlight.style.top = '0';
      this.panel.classList.add('centered');
      return; // nothing else to position
    }

    // Default behavior: highlight target + position panel
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
      let panelTop = 16;

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

      this.panel.classList.remove('centered'); // ensure default positioning
      this.panel.style.left = `${panelLeft}px`;
      this.panel.style.top  = `${panelTop}px`;
    } else {
      // No target: center panel as fallback
      this.panel.classList.add('centered');
      this.spotlight.style.width = '0';
      this.spotlight.style.height = '0';
    }
  }
}

/*
(function () {
  const arrowEl = document.getElementById('tutorial-arrow');
  let currentTarget = null;
  let rafId = null;

  function positionArrowBelow(target) {
    if (!arrowEl || !target) return;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const belowY  = rect.bottom + 10; // 10px gap

    arrowEl.style.left = `${centerX}px`;
    arrowEl.style.top  = `${belowY}px`;
  }

  function onScrollOrResize() {
    if (!currentTarget) return;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => positionArrowBelow(currentTarget));
  }

  // Public API on window for re-use in tutorial steps
  window.TutorialArrow = {
    showBelow(targetEl, labelText = 'Export\nhere') {
      if (!arrowEl || !targetEl) return;
      currentTarget = targetEl;

      // Optional: update label dynamically
      const body = arrowEl.querySelector('.arrow-body');
      if (body) body.innerHTML = labelText.replace('\n', '<br>');

      positionArrowBelow(targetEl);
      arrowEl.hidden = false;
      arrowEl.setAttribute('data-show', 'true');

      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize);
    },
    hide() {
      if (!arrowEl) return;
      currentTarget = null;
      arrowEl.removeAttribute('data-show');
      arrowEl.hidden = true;
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    }
  };
})();
*/
// Expose singleton
window.Tutorial = new Tutorial();




