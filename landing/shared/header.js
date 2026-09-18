/* THE BAR, moving. Loaded by every page after shared/header.html is in the
   document. Three things, none decorative:

   1. THE CURRENT PAGE. The markup is the same bytes on every page, so the
      page says which link is itself here: aria-current on the bar's link,
      and the amber square before the panel's.

   2. THE PANEL. Scroll is locked on the DOCUMENT, not the panel — otherwise
      the page keeps travelling under the thumb and the menu closes onto
      somewhere else. One frame separates `display` from the class, or there
      is no state to transition from. The PANEL takes the focus, not its
      close button: focusing a button lights the browser's ring for a reader
      who opened the menu with a thumb. A frame widened past the band closes
      it: two navigations at once, one of them unreachable, is not a state.

   3. THE GROUND. The bar has no ground of its own; it reads which
      `[data-ground]` element passes under each of its two groups and sets
      that group's ink. Luminance is computed once per ground, not per
      scroll. Pages without `data-ground` keep the bar's paper ink. */
(() => {
  'use strict';
  const bar = document.querySelector('header');
  if (!bar) return;

  /* ---- the current page ---- */
  const here = location.pathname.replace(/index\.html$/, '');
  const same = (a) => {
    try {
      const u = new URL(a.getAttribute('href'), location.href);
      return u.origin === location.origin && u.pathname.replace(/index\.html$/, '') === here;
    } catch { return false; }
  };
  for (const a of bar.querySelectorAll('.hnav a')) {
    if (same(a)) a.setAttribute('aria-current', 'page');
  }
  const menu = document.getElementById('menu');
  if (menu) {
    for (const a of menu.querySelectorAll('nav a')) {
      if (!same(a)) continue;
      a.setAttribute('aria-current', 'page');
      if (!a.querySelector('i')) a.prepend(document.createElement('i'));
    }
  }

  /* ---- the panel ---- */
  const hmenu = document.getElementById('hmenu');
  const mclose = document.getElementById('mclose');
  if (menu && hmenu && mclose) {
    let before = null;
    const open = () => {
      before = document.activeElement;
      menu.hidden = false;
      hmenu.setAttribute('aria-expanded', 'true');
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(() => { menu.classList.add('open'); menu.focus(); });
    };
    const close = () => {
      if (menu.hidden) return;
      menu.classList.remove('open');
      hmenu.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
      setTimeout(() => { menu.hidden = true; }, 300);
      if (before) before.focus();
    };
    hmenu.addEventListener('click', open);
    mclose.addEventListener('click', close);
    for (const a of menu.querySelectorAll('a')) a.addEventListener('click', close);
    matchMedia('(min-width:861px)').addEventListener('change', (m) => { if (m.matches) close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) close(); });
  }

  /* ---- the ground ---- */
  const grounds = [...document.querySelectorAll('[data-ground]')];
  if (!grounds.length) return;
  const groups = [bar.querySelector('.wordmark'), bar.querySelector('.hnav')].filter(Boolean);

  const light = new Map();
  const isLight = (hex) => {
    if (light.has(hex)) return light.get(hex);
    const h = hex.trim().replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    const v = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55;
    light.set(hex, v);
    return v;
  };

  /* The LAST ground under the point wins: sections overlap while one slides
     over another, and the one written later in the page is on top. */
  const groundAt = (x, y) => {
    let hit = null;
    for (const el of grounds) {
      const r = el.getBoundingClientRect();
      if (r.top <= y && r.bottom > y && r.left <= x && r.right > x) hit = el;
    }
    return hit;
  };

  let queued = false;
  const read = () => {
    queued = false;
    const y = bar.getBoundingClientRect().height / 2;
    let all = 0;
    for (const g of groups) {
      const r = g.getBoundingClientRect();
      const hit = groundAt(r.left + r.width / 2, y);
      if (!hit) continue;
      const on = isLight(hit.dataset.ground);
      g.classList.toggle('onlight', on);
      if (on) all += 1;
    }
    /* The bar itself carries the class only when both groups agree, for the
       pages that still style `header.onlight`. */
    bar.classList.toggle('onlight', all === groups.length);
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(read); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  addEventListener('load', ask);
  read();
})();
