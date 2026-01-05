/**
 * ============================================================================
 * CANONICAL SNAPSHOT BUILDER
 * ============================================================================
 * 
 * Converts flat UI invoice state → nested snapshot schema
 * Used for:
 * - Invoice preview
 * - Invoice finalization
 * - PDF generation
 * - Email sharing
 * 
 * SINGLE SOURCE OF TRUTH for snapshot structure
 * ============================================================================
 */

/**
 * Build a complete invoice snapshot from flat invoice state
 * 
 * @param {Object} invoice - Flat invoice state from UI
 * @param {Object} projectData - Project details from API
 * @param {Object} clientData - Client details from API
 * @param {Object} consultantData - Consultant details from API
 * @returns {Object} Canonical snapshot
 */
export function buildInvoiceSnapshot(invoice, projectData, clientData, consultantData) {
  // ============================================================================
  // VALIDATION
  // ============================================================================
  if (!invoice) {
    throw new Error('Invoice data is required');
  }

  // ============================================================================
  // META
  // ============================================================================
  const meta = {
    invoiceId: invoice.invoiceId || null,
    invoiceNumber: invoice.invoiceNumber || null,
    status: invoice.status || 'DRAFT',
    invoiceDate: invoice.date || new Date().toISOString().slice(0, 10),
    createdAt: invoice.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finalizedAt: invoice.status === 'FINAL' ? new Date().toISOString() : null
  };

  // ============================================================================
  // PROJECT
  // ============================================================================
  const project = {
    projectCode: invoice.projectCode || '',
    projectId: projectData?.projectId || projectData?.Project_Code || invoice.projectCode || ''
  };

  // ============================================================================
  // CONSULTANT
  // ============================================================================
  
  // ✅ Extract hourly rate from first item (if exists)
  const firstItem = invoice.items?.[0];
  const hourlyRate = firstItem?.rate || invoice.baseHourlyRate || 0;
  
  const consultant = {
  id: invoice.consultantId || '',
  name: invoice.consultantName || consultantData?.Consultant_name || '',
  email: invoice.consultantEmail || consultantData?.email || '',
  businessName: consultantData?.business_name || consultantData?.Consultant_name || invoice.consultantName || '',
  registeredOffice: consultantData?.business_registered_office || '',
  pan: consultantData?.business_pan || '',
  gstin: consultantData?.business_gstin || '',
  cin: consultantData?.business_cin || '',
  stateCode: consultantData?.business_state_code || '',
  hourlyRate: hourlyRate
};
  // ============================================================================
  // CLIENT
  // ============================================================================
  const client = {
  code: invoice.clientCode || clientData?.Client_Code || '',
  name: invoice.clientName || clientData?.Client_name || '',
  businessName: invoice.businessName || clientData?.Buisness_Name || '',
  billingAddress: invoice.billingAddress || clientData?.Billing_Address || '',
  pan: clientData?.Client_PAN || '',
  gstin: clientData?.Client_GST || '',
  stateCode: clientData?.State || ''
};

  // ============================================================================
  // SERVICE PROVIDER (HARDCODED CONSTANTS)
  // ============================================================================
  const serviceProvider = {
    name: "Hourly Ventures LLP",
    registeredOffice: "K-47, Kailash Colony, South Delhi, New Delhi, Delhi, India, 110048",
    stateCode: "Delhi (07)",
    pan: "AASFH5516N",
    cin: "ACQ-3618",
    gstin: "JKNJKNSX",
    email: "Team@Hourly.Design"
  };

  // ============================================================================
  // WORK (STAGES + ITEMS)
  // ============================================================================
  const work = {
    stages: invoice.stages || [],
    items: (invoice.items || []).map(item => ({
      memberId: item.memberId,
      name: item.name || '',
      mode: item.mode || 'Online',
      rate: Number(item.rate || 0),
      factor: Number(item.factor || 1),
      hours: Number(item.hours || 0),
      amount: Number(item.amount || 0),
      stageHours: item.stageHours || {}
    }))
  };

  // ============================================================================
  // TOTALS (TRUST CALCULATED VALUES FROM INVOICE STATE)
  // ============================================================================
  const totals = {
    subtotal: Number(invoice.subtotal || 0),
    gst: Number(invoice.gst || 0),
    total: Number(invoice.total || 0),
    serviceFeePct: Number(invoice.serviceFeePct || 0),
    serviceFeeAmount: Number(invoice.serviceFeeAmount || 0),
    netEarnings: Number(invoice.netEarnings || 0)
  };

  // ============================================================================
  // COMPLIANCE
  // ============================================================================
  const compliance = {
    sacCode: "999799",
    supplyDescription: "Professional Services"
  };

  // ============================================================================
  // NOTES
  // ============================================================================
  const notes = invoice.notes || '';

  // ============================================================================
  // ASSEMBLE CANONICAL SNAPSHOT
  // ============================================================================
  return {
    meta,
    project,
    consultant,
    client,
    serviceProvider,
    work,
    totals,
    compliance,
    notes
  };
}


/**
 * Validate snapshot structure
 * 
 * @param {Object} snapshot - Snapshot to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateSnapshot(snapshot) {
  const errors = [];

  if (!snapshot) {
    errors.push('Snapshot is null or undefined');
    return { valid: false, errors };
  }

  // Required top-level keys
  const requiredKeys = ['meta', 'project', 'consultant', 'client', 'work', 'totals'];
  requiredKeys.forEach(key => {
    if (!snapshot[key]) {
      errors.push(`Missing required key: ${key}`);
    }
  });

  // Validate work structure
  if (snapshot.work) {
    if (!Array.isArray(snapshot.work.stages)) {
      errors.push('work.stages must be an array');
    }
    if (!Array.isArray(snapshot.work.items)) {
      errors.push('work.items must be an array');
    }
  }

  // Validate totals
  if (snapshot.totals) {
    const requiredTotals = ['subtotal', 'gst', 'total'];
    requiredTotals.forEach(key => {
      if (typeof snapshot.totals[key] !== 'number') {
        errors.push(`totals.${key} must be a number`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


/**
 * Debug helper - log snapshot structure
 * 
 * @param {Object} snapshot - Snapshot to debug
 * @param {string} context - Context label (e.g., "Preview", "Finalize")
 */
export function debugSnapshot(snapshot, context = 'Snapshot') {
  console.log('='.repeat(60));
  console.log(`🔍 ${context.toUpperCase()} SNAPSHOT DEBUG`);
  console.log('='.repeat(60));
  
  if (!snapshot) {
    console.error('❌ Snapshot is null or undefined');
    return;
  }

  console.log('Meta:', {
    invoiceId: snapshot.meta?.invoiceId,
    invoiceNumber: snapshot.meta?.invoiceNumber,
    status: snapshot.meta?.status,
    invoiceDate: snapshot.meta?.invoiceDate
  });

  console.log('\nProject:', {
    projectCode: snapshot.project?.projectCode,
    projectId: snapshot.project?.projectId
  });

  console.log('\nConsultant:', {
    id: snapshot.consultant?.id,
    name: snapshot.consultant?.name,
    email: snapshot.consultant?.email
  });

  console.log('\nClient:', {
    code: snapshot.client?.code,
    name: snapshot.client?.name,
    businessName: snapshot.client?.businessName
  });

  console.log('\nWork:', {
    stagesCount: snapshot.work?.stages?.length || 0,
    itemsCount: snapshot.work?.items?.length || 0
  });

  if (snapshot.work?.items?.length > 0) {
    console.log('\nFirst Item:', {
      name: snapshot.work.items[0].name,
      mode: snapshot.work.items[0].mode,
      hours: snapshot.work.items[0].hours,
      amount: snapshot.work.items[0].amount
    });
  }

  console.log('\nTotals:', {
    subtotal: snapshot.totals?.subtotal,
    gst: snapshot.totals?.gst,
    total: snapshot.totals?.total
  });

  // Validation
  const validation = validateSnapshot(snapshot);
  if (validation.valid) {
    console.log('\n✅ Snapshot is valid');
  } else {
    console.error('\n❌ Snapshot validation errors:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
  }

  console.log('='.repeat(60));
}