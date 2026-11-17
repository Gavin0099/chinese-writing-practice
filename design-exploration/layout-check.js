/* Browser observation only. No product scripts or storage. */
(async () => {
  const pages = ['r0-current.html', 'archive/r2-1-blueprint.html', 'archive/r2-2-berrypress.html',
    'archive/r2-3-mistink.html', 'archive/r2-4-blueberry.html', 'archive/r2-5-silverlilac.html'];
  const output = document.querySelector('#result');
  const report = {status: 'NOT MEASURED', userAgent: navigator.userAgent,
    tolerance: 1, viewportHeight: 900, widths: []};
  function render(page, width) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.title = `${page} ${width}px geometry observation`;
      frame.style.cssText = `display:block;width:${width}px;height:900px;border:0;max-width:none`;
      frame.setAttribute('sandbox', 'allow-same-origin');
      const timer = setTimeout(() => reject(new Error(`Timed out: ${page}`)), 15000);
      frame.onload = async () => {
        try {
          const doc = frame.contentDocument;
          await doc.fonts.ready;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const rows = [doc.body, ...doc.body.querySelectorAll('*')].map((el, i) => {
            const b = el.getBoundingClientRect();
            return {index: i, tag: el.tagName, selector: el.id ? `#${el.id}` : el.className || el.tagName,
              x: b.x, y: b.y, width: b.width, height: b.height};
          });
          clearTimeout(timer);
          frame.remove();
          resolve(rows);
        } catch (e) { clearTimeout(timer); frame.remove(); reject(e); }
      };
      frame.src = page;
      document.querySelector('#frames').append(frame);
    });
  }
  try {
    for (const width of [390, 1280]) {
      const base = await render(pages[0], width);
      const variants = [];
      for (const page of pages.slice(1)) {
        const rows = await render(page, width);
        const mismatches = [];
        let maximum = 0;
        if (rows.length !== base.length) throw new Error(`Element count differs: ${page}`);
        rows.forEach((row, i) => {
          if (row.tag !== base[i].tag) throw new Error(`DOM order differs: ${page} ${i}`);
          const differences = Object.fromEntries(['x', 'y', 'width', 'height'].map(k => [k, Math.abs(row[k] - base[i][k])]));
          const delta = Math.max(...Object.values(differences));
          maximum = Math.max(maximum, delta);
          if (delta > 1) mismatches.push({selector: row.selector, index: i, differences});
        });
        variants.push({page, elementsCompared: rows.length, maxDelta: maximum,
          status: mismatches.length ? 'FAIL' : 'PASS', mismatches});
      }
      report.widths.push({width, variants});
    }
    report.status = report.widths.every(w => w.variants.every(v => v.status === 'PASS')) ? 'PASS' : 'FAIL';
  } catch (e) { report.status = 'NOT MEASURED'; report.reason = String(e); }
  output.textContent = JSON.stringify(report, null, 2);
})();
