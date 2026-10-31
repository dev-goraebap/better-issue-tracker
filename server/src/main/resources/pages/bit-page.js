/* BIT controls printing; uploaded pages supply only their own print styles. No BIT data enters the frame. */
(() => {
  let printing = false;
  window.addEventListener('message', event => {
    if (window.parent === window || event.source !== window.parent || event.data?.type !== 'bit:print' || printing) return;
    printing = true;
    const assets = [document.fonts?.ready, ...Array.from(document.images, image => image.decode?.().catch(() => {}))];
    Promise.race([Promise.all(assets), new Promise(resolve => setTimeout(resolve, 5000))])
      .then(() => { window.parent.postMessage({ type: 'bit:print-ready' }, '*'); window.focus(); window.print(); })
      .catch(() => { window.parent.postMessage({ type: 'bit:print-failed' }, '*'); })
      .finally(() => { printing = false; });
  });
})();
