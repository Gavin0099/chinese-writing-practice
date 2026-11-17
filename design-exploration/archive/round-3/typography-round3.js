/* Preview-only metric fitting. No product code, storage, network or hidden copy.
 * Measure the visible page in R0's fonts, reserve those same border boxes, then
 * change the fonts. Text stays in its original nodes and normal document flow.
 * A failed fit is reported, never hidden by clipping, ellipsis or a fake PASS.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const targets = [...document.querySelectorAll(
    '.minimal-header, .minimal-header *, .home-container, .home-container *')];
  const all = [document.body, ...document.body.querySelectorAll('*')];
  const original = new Map(targets.map(el => [el, el.getAttribute('style')]));
  const directText = el => [...el.childNodes].filter(n =>
    n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  const textTargets = targets.filter(el => directText(el).length);

  function lineBreaks(el) {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    return directText(el).map(node => {
      let firstY = null, previousLine = -1;
      const starts = [];
      const range = document.createRange();
      // The offsets are from the unchanged source text, including whitespace.
      for (let i = 0; i < node.length;) {
        const length = node.textContent.codePointAt(i) > 0xffff ? 2 : 1;
        range.setStart(node, i); range.setEnd(node, i + length);
        const box = range.getBoundingClientRect();
        if (box.width > .01 && box.height > .01 && node.textContent.slice(i, i + length).trim()) {
          if (firstY === null) firstY = box.y;
          const line = Math.round((box.y - firstY) / lineHeight);
          if (line !== previousLine) starts.push(i);
          previousLine = line;
        }
        i += length;
      }
      return starts;
    });
  }

  function fitText(el, expected, metrics) {
    const same = () => JSON.stringify(lineBreaks(el)) === expected;
    if (same()) return {status: 'unchanged', scale: 1, tracking: metrics.tracking};
    const desired = getComputedStyle(el);
    const size = parseFloat(desired.fontSize);
    const tracking = parseFloat(desired.letterSpacing) || 0;
    // Prefer original size; only tighten/loosen tracking when a break differs.
    // The floor is 94% of the original size. Keep line-height in original px.
    for (const scale of [1, .99, .98, .97, .96, .95, .94]) {
      el.style.fontSize = `${size * scale}px`;
      for (let step = 0; step <= 16; step++) {
        for (const sign of step ? [-1, 1] : [1]) {
          const value = tracking + sign * step * .05;
          el.style.letterSpacing = `${value}px`;
          if (same()) return {status: 'fitted', scale, tracking: value};
        }
      }
    }
    el.style.removeProperty('font-size');
    el.style.removeProperty('letter-spacing');
    return {status: 'NEEDS REVIEW', reason: 'Original line breaks could not be retained within 6% size / 0.8px tracking bounds'};
  }

  function calibrate() {
    root.classList.remove('r3-type-ready');
    for (const [el, style] of original) {
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    }
    const reference = all.map(el => el.getBoundingClientRect());
    const boxes = targets.map(el => {
      const b = el.getBoundingClientRect(), s = getComputedStyle(el);
      return {width: b.width, height: b.height, lineHeight: s.lineHeight,
        tracking: s.letterSpacing, breaks: JSON.stringify(lineBreaks(el)),
        overflowX: Math.max(0, el.scrollWidth - el.clientWidth),
        overflowY: Math.max(0, el.scrollHeight - el.clientHeight)};
    });
    // Only the header and main controls need font fitting. The complete legal /
    // attribution footer and exploration disclaimer retain their R0 fonts.
    targets.forEach((el, i) => {
      const b = boxes[i];
      for (const prop of ['width', 'min-width', 'max-width']) el.style.setProperty(prop, `${b.width}px`);
      for (const prop of ['height', 'min-height', 'max-height']) el.style.setProperty(prop, `${b.height}px`);
      el.style.lineHeight = b.lineHeight;
      el.style.flexShrink = '0';
    });
    root.classList.add('r3-type-ready');
    const fits = textTargets.map(el => {
      const b = boxes[targets.indexOf(el)];
      return {selector: el.id || el.className || el.tagName, ...fitText(el, b.breaks, b)};
    });
    const deltas = all.map((el, i) => {
      const now = el.getBoundingClientRect();
      return {index: i, selector: el.id || el.className || el.tagName,
        delta: Math.max(...['x', 'y', 'width', 'height'].map(k => Math.abs(now[k] - reference[i][k])))};
    });
    const overflow = targets.map((el, i) => ({selector: el.id || el.className || el.tagName,
      x: Math.max(0, el.scrollWidth - el.clientWidth), y: Math.max(0, el.scrollHeight - el.clientHeight),
      baselineX: boxes[i].overflowX, baselineY: boxes[i].overflowY}))
      .filter(row => row.x > 1 || row.y > 1);
    const newOverflow = overflow.filter(row => row.x > row.baselineX + 1 || row.y > row.baselineY + 1);
    // A browser may expose pre-existing overflow in R0. Report it for review;
    // do not cut text or assert overall accessibility from a geometry result.
    window.r3Metrics = {status: fits.some(f => f.status === 'NEEDS REVIEW') || deltas.some(d => d.delta > 1) || newOverflow.length ? 'NEEDS REVIEW' : 'FITTED',
      width: innerWidth, height: innerHeight, fits, maxDelta: Math.max(...deltas.map(d => d.delta)),
      mismatches: deltas.filter(d => d.delta > 1), overflow, newOverflow,
      reference: 'Same page before typography, using unchanged R0 font tokens; external R0 comparison still required'};
    root.dataset.typographyState = window.r3Metrics.status;
  }
  let frame;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(calibrate); };
  calibrate();
  addEventListener('resize', schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
})();
