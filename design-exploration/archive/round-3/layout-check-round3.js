/* Independent R0-to-R3 observation: includes every body element and all text.
 * Does not read the calibration reference to decide geometry PASS/FAIL.
 */
(async () => {
  const pages = ['../../r0-current.html', '../../r3-1-bluebold.html', '../../r3-2-berryround.html',
    '../r3-3-blueming.html', '../r3-4-blueberrykai.html', '../r3-5-berryreading.html', '../r3-6-blueberrysoft.html'];
  const report = {status: 'NOT MEASURED', userAgent: navigator.userAgent,
    tolerance: 1, viewportHeight: 900, widths: []};
  const output = document.querySelector('#result');
  function textLines(doc) {
    const walker = doc.createTreeWalker(doc.body, 4);
    const result = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim() || node.parentElement.closest('.study-disclaimer')) continue;
      const range = doc.createRange(), lines = [];
      for (let i = 0; i < node.length;) {
        const length = node.textContent.codePointAt(i) > 0xffff ? 2 : 1;
        range.setStart(node, i); range.setEnd(node, i + length);
        const r = range.getBoundingClientRect();
        if (node.textContent.slice(i, i + length).trim() && r.width > .01) {
          // Intersecting vertical glyph ranges belong to the same line.
          const last = lines.at(-1);
          if (!last || r.top >= last.bottom - 1) lines.push({start: i, top: r.top, bottom: r.bottom});
          else { last.top = Math.max(last.top, r.top); last.bottom = Math.min(last.bottom, r.bottom); }
        }
        i += length;
      }
      result.push({text: node.textContent, starts: lines.map(l => l.start)});
    }
    return result;
  }
  function render(page, width) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.title = `${page} at ${width}px`;
      frame.style.cssText = `display:block;width:${width}px;height:900px;border:0;max-width:none`;
      frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');
      const timer = setTimeout(() => { frame.remove(); reject(new Error(`Timed out: ${page}`)); }, 20000);
      frame.onload = async () => {
        try {
          const doc = frame.contentDocument;
          await doc.fonts.ready;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const rows = [doc.body, ...doc.body.querySelectorAll('*')].map((el, index) => {
            const b = el.getBoundingClientRect();
            return {index, tag: el.tagName, selector: el.id || el.className || el.tagName,
              x: b.x, y: b.y, width: b.width, height: b.height};
          });
          const result = {rows, text: textLines(doc), calibration: frame.contentWindow.r3Metrics || null,
            requestedTitleFamily: frame.contentWindow.getComputedStyle(doc.querySelector('.hero-title')).fontFamily,
            requestedBodyFamily: frame.contentWindow.getComputedStyle(doc.querySelector('.home-task-entry p')).fontFamily};
          clearTimeout(timer); frame.remove(); resolve(result);
        } catch (error) { clearTimeout(timer); frame.remove(); reject(error); }
      };
      frame.src = page;
      document.querySelector('#frames').append(frame);
    });
  }
  try {
    for (const width of [390, 1280]) {
      const base = await render(pages[0], width), variants = [];
      for (const page of pages.slice(1)) {
        const actual = await render(page, width), mismatches = [];
        if (actual.rows.length !== base.rows.length) throw new Error(`Element count differs: ${page}`);
        let maximum = 0;
        actual.rows.forEach((row, i) => {
          if (row.tag !== base.rows[i].tag) throw new Error(`DOM order differs: ${page}, ${i}`);
          const differences = Object.fromEntries(['x', 'y', 'width', 'height'].map(k => [k, Math.abs(row[k] - base.rows[i][k])]));
          const delta = Math.max(...Object.values(differences));
          maximum = Math.max(maximum, delta);
          if (delta > 1) mismatches.push({index: i, selector: row.selector, differences});
        });
        const sameTextAndWrap = JSON.stringify(actual.text) === JSON.stringify(base.text);
        const ready = actual.calibration && actual.calibration.status === 'FITTED';
        variants.push({page, elementsCompared: actual.rows.length, maxDelta: maximum,
          status: !mismatches.length && sameTextAndWrap && ready ? 'PASS' : 'FAIL',
          sameTextAndWrap, mismatches, calibration: actual.calibration,
          requestedTitleFamily: actual.requestedTitleFamily, requestedBodyFamily: actual.requestedBodyFamily});
      }
      report.widths.push({width, variants});
    }
    report.status = report.widths.every(w => w.variants.every(v => v.status === 'PASS')) ? 'PASS' : 'FAIL';
  } catch (error) { report.status = 'NOT MEASURED'; report.reason = String(error); }
  output.textContent = JSON.stringify(report, null, 2);
})();
