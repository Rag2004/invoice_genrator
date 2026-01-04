// src/utils/normalizeConsultant.js

export function normalizeConsultant(raw = {}) {
  if (!raw) return {};

  return {
    consultantId: raw.consultant_id || raw.consultantId || raw.id || null,
    email: raw.email || "",
    name: raw.Consultant_name || raw.name || "",
    phone: raw.phone || "",

    businessName: raw.business_name || "",
    businessRegisteredOffice: raw.business_registered_office || "",
    businessPAN: raw.business_pan || "",
    businessGSTIN: raw.business_gstin || "",
    businessCIN: raw.business_cin || "",
    businessStateCode: raw.business_state_code || "",

    createdAt: raw.created_at || null,
    lastLogin: raw.last_login || null,
    status: raw.status || "",
  };
}
