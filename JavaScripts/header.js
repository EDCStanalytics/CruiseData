
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
    if (!btn.dataset.scene) {
      const label = (btn.textContent || '').trim().toLowerCase();
      if (label.includes('summary')) {
        btn.dataset.scene = '';
      } else if (label.includes('vessels') || label.includes('visits')) {
        btn.dataset.scene = 'left';
      } else if (label.includes('services') || label.includes('shore') || label.includes('power')) {
        btn.dataset.scene = 'right';
      } else {
        btn.dataset.scene = (index === 0) ? '' : (index === 1) ? 'left' : 'right';
      }
    }

    // 2) Click handler: underline + scene + mirror KPI focus
    btn.addEventListener('click', (e) => {
      // underline selection (existing behavior)
      nav_Bar_Selected(index);

      const scene = (e.currentTarget.dataset.scene || '').trim();

      // Guard: ensure Scene exists; if not, retry once next tick
      if (!window.Scene || typeof window.Scene.set !== 'function') {
        console.warn('Scene coordinator not ready; deferring one tick');
        return setTimeout(() => btn.click(), 0);
      }

      window.Scene.set(scene);

      if (scene === 'right') {
        const right = document.getElementById('rightChartContainer');
        if (!right) return;
        if (!right.classList.contains('focused')) right.click();
      } else if (scene === 'left') {
        const left = document.getElementById('leftChartContainer');
        if (!left) return;
        if (!left.classList.contains('focused')) left.click();
      } else {
        // base scene: unfocus the currently focused bucket (if any)
        const focused = document.querySelector('.kpiBucket.focused');
        if (focused) focused.click();
      }
    });
  });

  // initialize underline on first item (Summary) without triggering scene change
  if (navItems.length) {
    nav_Bar_Selected(0);
  }
} catch (error) {
  console.error("Error:", error.message);
}
