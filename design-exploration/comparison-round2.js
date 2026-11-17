/* Gallery sizing only; every home page remains script-free. */
(() => {
  const boards = [...document.querySelectorAll('.board')];
  const frames = [...document.querySelectorAll('.preview-window')];
  if (!boards.length || !('ResizeObserver' in window)) return;
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
    document.querySelectorAll('.viewport-size').forEach(label => {
      label.textContent = `${width} px · 等比例縮圖`;
    });
  }
  document.querySelectorAll('input[name="viewport"]').forEach(input => {
    input.addEventListener('change', () => {
      width = Number(input.value);
      boards.forEach(board => { board.dataset.width = String(width); });
      resize();
    });
  });
  const observer = new ResizeObserver(resize);
  boards.forEach(board => observer.observe(board));
  resize();
})();
