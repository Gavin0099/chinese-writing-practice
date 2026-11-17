/* Comparison-only sizing. No fetch, storage, product actions or external code. */
(() => {
  const board = document.querySelector('.board');
  const frames = [...document.querySelectorAll('.preview-window')];
  if (!board || !('ResizeObserver' in window)) return;
  document.documentElement.classList.add('js');
  let width = 390;
  function resize() {
    const height = width === 390 ? 1100 : 860;
    for (const frame of frames) {
      const scale = frame.clientWidth / width;
      frame.style.setProperty('--frame-width', `${width}px`);
      frame.style.setProperty('--source-height', `${height}px`);
      frame.style.setProperty('--scale', scale);
      frame.style.setProperty('--frame-height', `${Math.ceil(height * scale)}px`);
    }
    document.querySelectorAll('.viewport-size').forEach(label => label.textContent = `${width} px · 等比例縮圖`);
  }
  document.querySelectorAll('input[name="viewport"]').forEach(input => {
    input.addEventListener('change', () => {
      width = Number(input.value);
      board.dataset.width = String(width);
      resize();
    });
  });
  new ResizeObserver(resize).observe(board);
  resize();
})();
