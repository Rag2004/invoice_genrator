// testInvoiceSetup.js
require('dotenv').config();
const apps = require('./lib/appsScriptClient');

(async () => {
  try {
    console.log('appsScriptClient mode =', apps.mode);

    // We want to call Apps Script doGet with action=getInvoiceSetup
    const code = 'PRJ_210325'; // use your existing project code

    if (apps.mode !== 'remote') {
      console.log('You are in STUB mode (no APPS_SCRIPT_URL). Set APPS_SCRIPT_URL + APPS_SCRIPT_TOKEN to test remote.');
      return;
    }

    const result = await apps.get('getInvoiceSetup', { code });

    console.log('\n=== Response from Apps Script getInvoiceSetup ===');
    console.dir(result, { depth: 5 });

    if (result && result.ok) {
      console.log('\n✅ SUCCESS: project/client/consultant all loaded.');
    } else {
      console.log('\n❌ ERROR:', result?.error || 'Unknown error');
    }
  } catch (err) {
    console.error('\n💥 Exception while calling getInvoiceSetup:', err.message);
    console.error(err);
  }
})();
