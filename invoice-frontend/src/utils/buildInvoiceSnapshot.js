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

import { getStateWithCode } from './stateCodes';

/**
 * Build a complete invoice snapshot from flat invoice state
 * 
 * @param {Object} invoice - Flat invoice state from UI
 * @param {Object} projectData - Project details from API
 * @param {Object} clientData - Client details from API
 * @param {Object} consultantData - Consultant details from API
 * @param {Object} companyDetails - Service Provider details from API (Added)
 * @returns {Object} Canonical snapshot
 */
export function buildInvoiceSnapshot(invoice, projectData, clientData, consultantData, companyDetails) {
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

  // Consultant variables
  const consultantGstin =
    consultantData?.business_gstin ||
    consultantData?.gstin ||
    '';

  const consultantStateRaw =
    consultantData?.business_state_code ||
    consultantData?.stateCode ||
    '';

  // ✅ Format State with Code (Lookup by Name)
  let consultantState = consultantStateRaw;
  if (consultantState) {
    consultantState = getStateWithCode(consultantState);
  }

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
    gstin: consultantGstin,
    cin:
      consultantData?.business_cin ||
      consultantData?.cin ||
      '',
    stateCode: consultantState,
    hourlyRate: hourlyRate
  };
  // ============================================================================
  // CLIENT
  // ============================================================================
  // CLIENT variables (calculated first for dependencies)
  // ============================================================================
  const clientGstin =
    invoice.clientGstin ||
    clientData?.Client_GST ||
    clientData?.gstin ||
    clientData?.GSTIN ||
    '';

  const clientStateRaw =
    invoice.clientState ||
    clientData?.State ||
    clientData?.stateCode ||
    '';

  // ✅ Format State with Code (Lookup by Name)
  let clientState = clientStateRaw;
  if (clientState) {
    clientState = getStateWithCode(clientState);
  }

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

    gstin: clientGstin,

    stateCode: clientState
  };


  // ============================================================================
  // SERVICE PROVIDER (DYNAMIC)
  // ============================================================================
  // Service Provider Variables
  const spGstin = companyDetails?.gstin || "JKNJKNSX";
  const spStateRaw = companyDetails?.state_code || "Delhi (07)";

  // ✅ Format State with Code (Lookup by Name)
  let spState = spStateRaw;
  if (spState) {
    spState = getStateWithCode(spState);
  }

  const serviceProvider = {
    name: companyDetails?.company_name || "Hourly Ventures LLP",
    companyName: companyDetails?.company_name || "Hourly Ventures LLP", // ✅ For InvoiceComplete
    registeredOffice: companyDetails?.registered_office || "K-47, Kailash Colony, South Delhi, New Delhi, Delhi, India, 110048",
    stateCode: spState,
    pan: companyDetails?.pan || "AASFH5516N",
    cin: companyDetails?.cin || "ACQ-3618",
    gstin: spGstin,
    email: companyDetails?.email || "Team@Hourly.Design"
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
