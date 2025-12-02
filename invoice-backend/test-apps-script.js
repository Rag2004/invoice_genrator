// test-apps-script.js - Place in project root
require('dotenv').config();
const appsScriptService = require('./src/services/appsScriptService');

/**
 * Test Apps Script Integration
 */
async function testAppsScript() {
  console.log('\n🚀 Testing Apps Script Integration...\n');
  console.log('='.repeat(70));

  try {
    // Test 1: Connection Test
    console.log('\n📌 Test 1: Connection Test');
    console.log('-'.repeat(70));
    const connectionTest = await appsScriptService.testConnection();
    if (!connectionTest.ok) {
      throw new Error('Connection test failed');
    }
    console.log('✅ Connection successful!');
    console.log('   Team members found:', connectionTest.result.length);

    // Test 2: Get Team Members
    console.log('\n📌 Test 2: Get Team Members');
    console.log('-'.repeat(70));
    const team = await appsScriptService.getTeam();
    console.log(`📊 Team members: ${team.length}`);
    team.forEach(member => {
      console.log(`   - ${member.name} (${member.id}) - Factor: ${member.baseFactor}`);
    });

    // Test 3: Get Consultation Modes
    console.log('\n📌 Test 3: Get Consultation Modes');
    console.log('-'.repeat(70));
    const modesData = await appsScriptService.getModes();
    console.log(`📊 Consultation modes: ${modesData.modes.length}`);
    modesData.modes.forEach(mode => {
      console.log(`   - ${mode.label} - Factor: ${mode.factor}`);
    });

    // Test 4: Get All Projects
    console.log('\n📌 Test 4: Get All Projects');
    console.log('-'.repeat(70));
    const projects = await appsScriptService.getAllProjects();
    console.log(`📊 Projects found: ${projects.length}`);
    if (projects.length > 0) {
      const sample = projects[0];
      console.log('Sample project:', {
        code: sample.Code || sample.code,
        clientCode: sample.Client_Code || sample.ClientCode,
        package: sample.Package || sample.package,
      });
    }

    // Test 5: Get Specific Project
    console.log('\n📌 Test 5: Get Specific Project');
    console.log('-'.repeat(70));
    if (projects.length > 0) {
      const firstProjectCode = projects[0].Code || projects[0].code;
      console.log(`🔍 Fetching project: ${firstProjectCode}`);
      const project = await appsScriptService.getProject(firstProjectCode);
      console.log('Project details:', {
        code: project.code,
        clientCode: project.clientCode,
        hourlyRate: project.hourlyRate,
        serviceFeePct: project.serviceFeePct,
        active: project.active,
      });
    } else {
      console.log('⚠️  No projects to test with');
    }

    // Test 6: Get Client
    console.log('\n📌 Test 6: Get Client Details');
    console.log('-'.repeat(70));
    if (projects.length > 0) {
      const project = projects[0];
      const clientCode = project.Client_Code || project.ClientCode || project.client_code;
      if (clientCode) {
        console.log(`🔍 Fetching client: ${clientCode}`);
        const client = await appsScriptService.getClient(clientCode);
        console.log('Client details:', {
          code: client.code,
          name: client.name,
          billingAddress: client.billingAddress,
        });
      } else {
        console.log('⚠️  No client code found in project');
      }
    }

    // Test 7: List Invoices
    console.log('\n📌 Test 7: List Invoices');
    console.log('-'.repeat(70));
    const invoices = await appsScriptService.listInvoices(5);
    console.log(`📊 Invoices found: ${invoices.length}`);
    if (invoices.length > 0) {
      console.log('Sample invoice:', {
        invoiceId: invoices[0].invoiceId,
        invoiceNumber: invoices[0].invoiceNumber,
        status: invoices[0].status,
        consultantName: invoices[0].consultantName,
        subtotal: invoices[0].subtotal,
      });
    }

    // Test 8: Test Consultant Lookup (Optional)
    console.log('\n📌 Test 8: Test Consultant Lookup');
    console.log('-'.repeat(70));
    const testEmail = 'raghavmangla58@gmail.com';
    console.log(`🔍 Looking up consultant: ${testEmail}`);
    try {
      const consultantRes = await appsScriptService.getConsultantByEmail(testEmail);
      if (consultantRes.ok) {
        console.log('✅ Consultant found:', {
          email: consultantRes.consultant.email,
          name: consultantRes.consultant.name,
          status: consultantRes.consultant.status,
        });
      } else {
        console.log('ℹ️  Consultant not found (will be created on first login)');
      }
    } catch (error) {
      console.log('ℹ️  Consultant lookup skipped:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`  - Team Members: ${team.length}`);
    console.log(`  - Consultation Modes: ${modesData.modes.length}`);
    console.log(`  - Projects: ${projects.length}`);
    console.log(`  - Invoices: ${invoices.length}`);
    console.log('\n✨ Apps Script integration is working perfectly!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('='.repeat(70));
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    console.error('\n💡 Troubleshooting tips:');
    console.error('  1. Check APPS_SCRIPT_URL in .env is correct');
    console.error('  2. Verify APPS_SCRIPT_TOKEN matches your script');
    console.error('  3. Ensure Apps Script is deployed as web app');
    console.error('  4. Check Apps Script execution permissions');
    console.error('  5. Verify all sheet tabs exist (Clients, Projects, etc.)');
    process.exit(1);
  }
}

// Run tests
testAppsScript();