
//we need a function that highlights the selected nav bar item
let selected_navItem = 0;
let navItems = [];

/* underline helper */
let nav_Bar_Selected = function(itemIndex) {
  if (!navItems.length) return;
  nb_UnSelect(selected_navItem);
  selected_navItem = itemIndex;
  navItems[itemIndex].setAttribute('class', 'selectedNavItem');
};

//we might need a function that sets the un-selected nav bar item back to its default style
let nb_UnSelect = function(itemIndex) {
  if (!navItems.length) return;
  const el = navItems[itemIndex];
  if (el) el.removeAttribute('class');
};

//i'd like the user to be able to do a little bit of navigation with the keyboard as well
let nb_incrementalSelect = function(up) {
  if (!navItems.length) return;
  if (selected_navItem === navItems.length - 1 && up) {
    // at end; no-op
  } else if (selected_navItem === 0 && !up) {
    // at start; no-op
  } else if (up) {
    nav_Bar_Selected(selected_navItem + 1);
    // also trigger click behavior to keep scene in sync
    navItems[selected_navItem].click();
  } else {
    nav_Bar_Selected(selected_navItem - 1);
    navItems[selected_navItem].click();
  }
};

document.addEventListener('keydown', function(event) {
  if (event.key === 'ArrowRight') {
    nb_incrementalSelect(true);
  }
  else if (event.key ==='ArrowLeft') {
    nb_incrementalSelect(false);
  }
});

//get header li elements and wire them in a single pass
try {
  navItems = Array.from(document.querySelectorAll("#navBarItems li"));

  // Single pass: assign scene + wire click handler
  navItems.forEach((btn, index) => {
    // 1) Robust scene assignment:
    //    - Honor any explicit data-scene set in HTML.
    //    - Else infer from label text.
    //    - Else fall back by index (0→'', 1→'left', 2→'right').


  /* my code recommendation: REPLACEMENT — header.js (scene inference) */
  // INSERT HERE 👉 new intent-based mapping: '' | 'calls' | 'osp'
  if (!btn.dataset.scene) {
    const label = (btn.textContent || '').trim().toLowerCase();
    if (label.includes('summary')) {
      btn.dataset.scene = '';
    } else if (label.includes('visits') || label.includes('vessels') || label.includes('calls')) {
      btn.dataset.scene = 'calls';
    } else if (label.includes('shore') || label.includes('power') || label.includes('osp') || label.includes('services')) {
      btn.dataset.scene = 'osp';
    } else {
      btn.dataset.scene = (index === 0) ? '' : (index === 1) ? 'calls' : 'osp';
    }
  }



    // 2) Click handler: underline + scene + mirror KPI focus
    btn.addEventListener('click', (e) => {
      // underline selection (existing behavior)
      //nav_Bar_Selected(index);

  /* my code recommendation: REPLACEMENT — header.js (click handler core) */
  // INSERT HERE 👉 scene-driven; compute new names and set Scene
  const scene = (e.currentTarget.dataset.scene || '').trim();

  // Guard: ensure Scene exists; if not, retry once next tick
  if (!window.Scene || typeof window.Scene.set !== 'function') {
    console.warn('Scene coordinator not ready; deferring one tick');
    return setTimeout(() => btn.click(), 0);
  }
 
window.CueDirector.emit('NAVIGATE', {
  source: 'header',
  targetScene: scene
});


  // Mirror KPI focus to keep buckets in sync (accept new + legacy names during migration)
  const isOsp = (s) => s === 'osp' || s.startsWith('osp-') || s === 'right' || s.startsWith('right-');
  if (isOsp(scene)) {
    const right = document.getElementById('rightChartContainer');
    if (!right) return;
    if (!right.classList.contains('focused')) right.click();
  } else if (scene === 'calls' || scene === 'left') {
    const left = document.getElementById('leftChartContainer');
    if (!left) return;
    if (!left.classList.contains('focused')) left.click();
  } else {
    // baseline: unfocus any focused bucket
    const focused = document.querySelector('.kpiBucket.focused');
    if (focused) focused.click();
  }
});

  });

  // initialize underline on first item (Summary) without triggering scene change
  if (navItems.length) {
    nav_Bar_Selected(0);
  }



/* my code recommendation: REPLACEMENT — header.js */
// INSERT HERE 👉 scene-driven underline (supports calls/osp + legacy left/right*)
(function registerHeaderNavUnderline() {
  const selectFor = (scene) => {
    const s = (scene || '').trim();
    if (s === 'calls' || s === 'left') return 1;
    if (s === '' || s == null) return 0;
    if (s === 'osp' || s.startsWith('osp-') || s === 'right' || s.startsWith('right-')) return 2;
    return 0;
  };
  function sync() {
    try { if (window.Scene?.get) nav_Bar_Selected(selectFor(window.Scene.get())); } catch (e) {}
  }
  if (window.Scene && typeof window.Scene.register === 'function') {
    
/* my code recommendation: INSERTION — header underline observer */

(function observeSceneForHeaderUnderline() {
  let lastScene = null;

  function update() {
    const scene = window.Scene?.get();
    if (scene === lastScene) return;
    lastScene = scene;

    const s = (scene || '').trim();
    if (s === 'calls' || s === 'left') nav_Bar_Selected(1);
    else if (s === 'osp' || s.startsWith('osp-') || s === 'right') nav_Bar_Selected(2);
    else nav_Bar_Selected(0); // overview
  }

  // poll once per frame — cheap and safe
  function tick() {
    update();
    requestAnimationFrame(tick);
  }

  tick();
})();

    /*
    window.Scene.register('header-nav-underline', {
      scenes: {
        'overview':            { mount: sync },
        'calls':       { mount: () => nav_Bar_Selected(1) },
        'osp':         { mount: () => nav_Bar_Selected(2) },
        'osp-usage':   { mount: () => nav_Bar_Selected(2) },
        'osp-impact':  { mount: () => nav_Bar_Selected(2) },
        // legacy keys (kept until Step 2 is finished)
        'left':        { mount: () => nav_Bar_Selected(1) },
        'right':       { mount: () => nav_Bar_Selected(2) },
        'right-usage': { mount: () => nav_Bar_Selected(2) },
        'right-impact':{ mount: () => nav_Bar_Selected(2) }
      }
    });
    */
    // initial sync
    sync();
  } else {
    requestAnimationFrame(registerHeaderNavUnderline);
  }
})();


} catch (error) {
  console.error("Error:", error.message);
}
