// View controls and same-frame height messages only; no product behavior.
(() => {
  const directions = document.getElementById('directions');
  const caption = document.getElementById('preview-caption');
  const names = { all: '三案', ink: 'A 墨藍書房', clay: 'B 陶紅紙箋', plum: 'C 霧紫書桌' };
  document.querySelectorAll('input[name="view"]').forEach(input => {
    input.addEventListener('change', () => {
      directions.dataset.view = input.value;
      caption.textContent = `以下為${names[input.value]}首頁靜態預覽。按鈕僅示意，不會出卷或儲存資料。`;
    });
  });
  window.addEventListener('message', event => {
    if (!event.data || event.data.type !== 'exploration-frame-height') return;
    const frame = [...document.querySelectorAll('iframe')].find(item => item.contentWindow === event.source);
    const height = event.data.height;
    if (frame && Number.isFinite(height) && height >= 200 && height <= 12000) {
      frame.style.height = `${height}px`;
    }
  });
  document.querySelectorAll('iframe').forEach(frame => {
    const measure = () => frame.contentWindow.postMessage({ type: 'exploration-measure' }, '*');
    frame.addEventListener('load', measure);
    measure();
  });
})();
