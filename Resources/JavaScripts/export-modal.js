
// ../JavaScripts/export-modal.js

document.addEventListener('DOMContentLoaded', () => {
  const dbIcon = document.getElementById('download-combo');
  const modal = document.getElementById('exportChoiceModal');
  const btnClose = document.getElementById('exportModalCloseBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  // ---- Open modal via the database icon
  dbIcon?.addEventListener('click', () => {
    if (!modal) return;
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      // Fallback for browsers without <dialog> support
      modal.setAttribute('open', '');
    }
  });

  // ---- Close modal via close button
  btnClose?.addEventListener('click', () => {
    if (!modal) return;
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  });

  // ---- Optional: close when clicking outside the modal content
  modal?.addEventListener('click', (e) => {
    const content = modal.querySelector('.export-modal__content');
    if (!content) return;
    const rect = content.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    }
  });

  // ---- Excel export
  exportExcelBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      // CruiseExporter is defined in ../JavaScripts/export.js (which should load before this file)
      const count = await CruiseExporter.downloadAllSheets('CruiseData.xlsx');
      console.log('Download started. Rows:', count);
      // Close the modal after triggering the download
      if (typeof modal?.close === 'function') modal.close();
      else modal?.removeAttribute('open');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err?.message || err));
    }
  });

  // ---- PDF export
  exportPdfBtn?.addEventListener('click', () => {
    // Open the PDF in a new tab/window
    window.open(
      'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/main/Actuals/Shore-Power-Connections-2017-to-11-30-25.pdf',
      '_blank'
    );
    // Close the modal for consistency
    if (typeof modal?.close === 'function') modal.close();
    else modal?.removeAttribute('open');
  });
});
