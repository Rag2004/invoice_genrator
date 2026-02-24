
// utils/pdfGenerator.js
// Windows-compatible version with better error handling

const puppeteer = require('puppeteer');
const logger = require('./logger');

/**
 * Generate PDF from invoice HTML with Windows-specific fixes
 */
async function generateInvoicePDF(invoiceHTML, invoice = {}) {
  let browser;
  let page;

  try {
    console.log('📄 Starting PDF generation...');
    console.log('   Invoice:', invoice?.invoiceNumber || 'DRAFT');
    console.log('   HTML length:', invoiceHTML?.length || 0, 'chars');

    if (!invoiceHTML) {
      throw new Error('No HTML content provided for PDF generation');
    }

    console.log('🔄 Launching headless browser (Windows mode)...');

    // Windows-specific Puppeteer settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
      // Important for Windows stability
      ignoreDefaultArgs: ['--disable-extensions'],
      dumpio: false, // Don't dump browser process stdout/stderr
    });

    console.log('✅ Browser launched');

    // Create new page
    page = await browser.newPage();
    console.log('✅ Page created');

    // Set viewport
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1, // Lower for stability on Windows
    });
    console.log('✅ Viewport set');

    // Prepare full HTML document
    // If invoiceHTML is already a complete document, use it directly
    const isCompleteDoc = invoiceHTML.trim().toLowerCase().startsWith('<!doctype')
      || invoiceHTML.trim().toLowerCase().startsWith('<html');

    const fullHTML = isCompleteDoc ? invoiceHTML.trim() : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice?.invoiceNumber || 'DRAFT'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    html, body {
      width: 100%;
      height: 100%;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: white;
      padding: 0;
      margin: 0;
    }
    
    /* Hide consultant-only sections */
    .consultant-only,
    .internal-box,
    .internal-banner,
    .no-print {
      display: none !important;
    }
    
    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>
  ${invoiceHTML}
</body>
</html>
    `.trim();

    console.log('📝 Loading HTML into page...');

    // Set content with shorter timeout for Windows
    await page.setContent(fullHTML, {
      waitUntil: 'domcontentloaded', // Less strict than 'networkidle0'
      timeout: 15000, // 15 seconds
    });

    console.log('✅ HTML loaded');

    // Small delay for rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Content settled');

    console.log('📋 Generating PDF...');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      timeout: 30000, // 30 second timeout
    });

    const sizeKB = (pdfBuffer.length / 1024).toFixed(2);
    console.log('✅ PDF generated successfully!');
    console.log(`   📦 Size: ${sizeKB} KB`);

    // Clean up
    console.log('🧹 Closing browser...');
    await page.close();
    await browser.close();
    console.log('✅ Browser closed');

    logger.info({
      invoiceNumber: invoice?.invoiceNumber || 'DRAFT',
      projectCode: invoice?.projectCode || 'N/A',
      pdfSize: pdfBuffer.length,
      sizeKB: parseFloat(sizeKB),
    }, 'PDF generated successfully');

    return pdfBuffer;

  } catch (error) {
    console.error('❌ PDF generation failed!');
    console.error('   Error:', error.message);
    console.error('   Type:', error.constructor.name);

    // Better error messages
    if (error.message.includes('Target closed')) {
      console.error('   Cause: Browser connection lost (common on Windows)');
      console.error('   Fix: This is usually temporary, try again');
    } else if (error.message.includes('Navigation timeout')) {
      console.error('   Cause: Page took too long to load');
      console.error('   Fix: Check HTML content or increase timeout');
    } else if (error.message.includes('Failed to launch')) {
      console.error('   Cause: Could not start Chrome');
      console.error('   Fix: Reinstall puppeteer: npm install puppeteer');
    }

    // Clean up on error
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log('✅ Cleaned up browser resources');
    } catch (cleanupError) {
      console.error('⚠️  Cleanup error (ignored):', cleanupError.message);
    }

    logger.error({
      error: error.message,
      stack: error.stack,
      invoiceNumber: invoice?.invoiceNumber || 'DRAFT',
    }, 'PDF generation failed');

    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Test Puppeteer with retry logic
 */
async function testPuppeteer() {
  let browser;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🧪 Testing Puppeteer (attempt ${attempt}/3)...`);

      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        timeout: 30000,
      });

      const page = await browser.newPage();
      await page.setContent('<html><body><h1>Test</h1></body></html>', {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      const pdf = await page.pdf({
        format: 'A4',
        timeout: 10000,
      });

      await page.close();
      await browser.close();

      console.log('✅ Puppeteer test passed!');
      console.log(`   Generated ${pdf.length} bytes`);
      return true;

    } catch (error) {
      console.error(`❌ Test attempt ${attempt} failed:`, error.message);

      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      if (attempt === 3) {
        console.error('❌ All Puppeteer test attempts failed');
        console.error('   PDF generation may not work reliably');
        return false;
      }

      // Wait before retry
      console.log(`   Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return false;
}

module.exports = {
  generateInvoicePDF,
  testPuppeteer,
};