export function normalizeConsultant(raw = {}) {
  if (!raw) return null;

  return {
    consultantId: raw.consultant_id || raw.consultantId || raw.id || "",
    email: raw.email || "",
    name: raw.Consultant_name || raw.consultant_name || "",
    phone: raw.phone || "",
    createdAt: raw.created_at || "",
    lastLogin: raw.last_login || "",
    status: raw.status || "",

    businessName: raw.business_name || "",
    businessRegisteredOffice: raw.business_registered_office || "",
    businessPAN: raw.business_pan || "",
    businessGSTIN: raw.business_gstin || "",
    businessCIN: raw.business_cin || "",
    businessStateCode: raw.business_state_code || ""
  };
}
