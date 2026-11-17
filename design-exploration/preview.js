// Exploration plumbing only: size a read-only frame. Palettes are static HTML.
// No imports, product code, storage, network, printing or worksheet generation.
(() => {
  if (window.parent !== window) {
    document.documentElement.dataset.embedded = '';
    const sendHeight = () => window.parent.postMessage({
      type: 'exploration-frame-height',
      height: Math.ceil(document.body.getBoundingClientRect().height)
    }, '*');
    new ResizeObserver(sendHeight).observe(document.body);
    window.addEventListener('load', sendHeight);
    window.addEventListener('message', event => {
      if (event.source === window.parent && event.data?.type === 'exploration-measure') sendHeight();
    });
    sendHeight();
  }
})();
