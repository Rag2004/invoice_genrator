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
    name: invoice.consultantName || consultantData?.Consultant_name || consultantData?.name || '',
    email: invoice.consultantEmail || consultantData?.email || '',
    businessName:
      consultantData?.business_name ||
      consultantData?.businessName ||
      consultantData?.Consultant_name ||
      invoice.consultantName ||
      '',
    registeredOffice:
      consultantData?.business_registered_office ||
      consultantData?.registeredOffice ||
      '',
    pan:
      consultantData?.business_pan ||
      consultantData?.pan ||
      '',
    gstin:
      consultantData?.business_gstin ||
      consultantData?.gstin ||
      '',
    cin:
      consultantData?.business_cin ||
      consultantData?.cin ||
      '',
    stateCode:
      consultantData?.business_state_code ||
      consultantData?.stateCode ||
      '',
    hourlyRate: hourlyRate
  };
  // ============================================================================
  // CLIENT
  // ============================================================================
  const client = {
    code:
      invoice.clientCode ||
      clientData?.Client_Code ||
      clientData?.code ||
      '',

    name:
      invoice.clientName ||
      clientData?.Client_name ||
      clientData?.name ||
      '',

    businessName:
      invoice.businessName ||
      clientData?.Business_Name ||      // ✅ correct spelling
      clientData?.Buisness_Name ||      // ✅ handle typo
      clientData?.businessName ||
      '',

    billingAddress:
      invoice.billingAddress ||
      clientData?.Billing_Address ||
      clientData?.billingAddress ||
      '',

    pan:
      invoice.clientPan ||
      clientData?.Client_PAN ||
      clientData?.pan ||
      clientData?.PAN ||
      '',

    gstin:
      invoice.clientGstin ||
      clientData?.Client_GST ||
      clientData?.gstin ||
      clientData?.GSTIN ||
      '',

    stateCode:
      invoice.clientState ||
      clientData?.State ||
      clientData?.stateCode ||
      ''
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
