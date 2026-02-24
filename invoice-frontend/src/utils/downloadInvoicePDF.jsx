import html2pdf from 'html2pdf.js';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import InvoiceComplete from '../components/InvoiceComplete';
import { LOGO_URL } from '../config/branding';

/**
 * Generate and download a pixel-perfect invoice PDF.
 *
 * WHY PREVIOUS ATTEMPTS FAILED:
 * html2canvas clones the target element into its own off-screen iframe/document.
 * The <style> tag that lives INSIDE InvoiceComplete's JSX becomes a child
 * element of the clone — but browsers don't apply <style> tags that are
 * children of a generic <div> as document-level styles. They only work
 * when inside <head> or when the browser's HTML parser encounters them.
 *
 * FIX: Use the html2canvas `onclone` callback to move the <style> tags
 * from inside the cloned element into the cloned document's <head>.
 */
export async function downloadInvoicePDF(invoice, filename) {
  const snapshot = invoice.snapshot || invoice;
  const invoiceNumber =
    snapshot.meta?.invoiceNumber || invoice.invoiceNumber || 'INVOICE';

  // 1. Render InvoiceComplete to static HTML
  const html = renderToStaticMarkup(
    <InvoiceComplete invoice={{ snapshot }} logoUrl={LOGO_URL} />
  );

  // 2. Create container in normal document flow (NOT position:fixed)
  //    html2canvas works best with elements in normal flow.
  const container = document.createElement('div');
  container.id = 'pdf-render-container';
  container.style.cssText = [
    'position: absolute',
    'left: -2000px',       // off-screen horizontally (html2canvas handles this)
    'top: 0',
    'width: 794px',        // A4 width at 96 DPI = 210mm ≈ 794px
    'background: #ffffff',
    'z-index: -1',
    'overflow: visible',
  ].join(';');
  container.innerHTML = html;
  document.body.appendChild(container);

  // 3. Wait for styles + images to settle
  await new Promise(r => setTimeout(r, 600));

  console.log('[PDF] Container dimensions:', container.scrollWidth, 'x', container.scrollHeight);
  console.log('[PDF] Container children:', container.children.length);

  // 4. html2pdf with onclone fix
  const opt = {
    margin: [8, 10, 8, 10],        // mm: top, left, bottom, right
    filename: filename || `${invoiceNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#ffffff',
      logging: true,                     // enable html2canvas debug logs
      width: 794,
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      // THE KEY FIX: Move <style> tags into the cloned document's <head>
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.getElementById('pdf-render-container');
        if (clonedContainer) {
          // Find all <style> tags inside the cloned element
          const styleTags = clonedContainer.querySelectorAll('style');
          console.log('[PDF] Found', styleTags.length, 'style tags in clone');
          styleTags.forEach(styleTag => {
            // Clone the style tag and move it to <head>
            const headStyle = clonedDoc.createElement('style');
            headStyle.textContent = styleTag.textContent;
            clonedDoc.head.appendChild(headStyle);
            console.log('[PDF] Injected style tag into cloned document head');
          });

          // Position the container at origin in the clone
          clonedContainer.style.position = 'static';
          clonedContainer.style.left = '0';
        }
      },
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
    },
  };

  try {
    console.log('[PDF] Starting html2pdf generation...');
    await html2pdf().set(opt).from(container).save();
    console.log('[PDF] ✅ PDF saved successfully');
  } catch (err) {
    console.error('[PDF] ❌ Generation failed:', err);
    throw err;
  } finally {
    document.body.removeChild(container);
  }
}
