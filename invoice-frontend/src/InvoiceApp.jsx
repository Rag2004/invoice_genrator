
import React, { useEffect, useState, useRef } from 'react';
import './styles.css';
import { useParams, useNavigate } from 'react-router-dom';

import TeamSummary from './components/TeamSummary';
import InvoiceComplete from './components/InvoiceComplete';
import ShareInvoiceDialog from './components/ui/ShareInvoiceDialog';
import InvoicePreviewModal from './components/InvoicePreviewModal';

import { getTeam, getInvoiceSetup, shareInvoice, createDraft, updateDraft, finalizeInvoice, getInvoice, getModes, clearTeamCache, getCompanyDetails } from './api/api';
import { useAuth } from './context/AuthContext';
import { LOGO_URL } from "./config/branding";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

/* ============================================================================
   HELPER FUNCTIONS
============================================================================ */

const useDebouncedValue = (value, delay = 400) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const formatINR = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

const incomingServiceFeeToPercent = (v) =>
  v > 1 ? Number(v) : Math.round(Number(v || 0) * 100);

/* ============================================================================
   ✅ PRODUCTION CALCULATION ENGINE
============================================================================ */

const recalc = (draft) => {
  const items = (draft.items || []).map((item) => {
    let totalHours = 0;

    if (item.stageHours && typeof item.stageHours === 'object') {
      Object.values(item.stageHours).forEach((subStages) => {
        if (typeof subStages === 'object') {
          Object.values(subStages).forEach((hrs) => {
            totalHours += Number(hrs || 0);
          });
        }
      });
    }

    const rate = Number(item.rate || 0);
    const factor = Number(item.factor || 1);
    const amount = Math.round(totalHours * rate * factor);

    return {
      ...item,
      hours: totalHours,
      rate,
      factor,
      amount,
      stageHours: item.stageHours || {}
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  // ✅ FIX: Normalize GST rate - convert percentage to decimal if needed
  let gstRate = Number(draft.gstRate ?? 0.18);
  if (gstRate > 1) {
    gstRate = gstRate / 100; // Convert 20 → 0.20, 18 → 0.18
  }

  const gst = Math.round(subtotal * gstRate);
  const total = subtotal + gst;
  const serviceFeePct = Number(draft.serviceFeePct || 0);
  const serviceFeeAmount = Math.round(total * (serviceFeePct / 100));
  const netEarnings = total - serviceFeeAmount;

  return {
    ...draft,
    items,
    subtotal,
    gstRate,
    gst,
    total,
    serviceFeePct,
    serviceFeeAmount,
    netEarnings
  };
};

/* ============================================================================
   INFO BOX COMPONENT
============================================================================ */

const InfoBox = ({ label, value, loading }) => (
  <div style={{
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px",
    background: "#f9fafb",
    minHeight: "70px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  }}>
    <div style={{
      fontSize: "0.7rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#9ca3af",
      marginBottom: "6px",
      fontWeight: 600,
    }}>
      {label}
    </div>
    <div style={{
      fontSize: "0.875rem",
      color: loading ? "#9ca3af" : "#111827",
      fontWeight: 500,
    }}>
      {loading ? "Loading..." : (value || "Will auto-fill")}
    </div>
  </div>
);

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

export default function Invoice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const invoiceRef = useRef(null);

  const [teamOptions, setTeamOptions] = useState([]);
  const [projectData, setProjectData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [consultantData, setConsultantData] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [modesOptions, setModesOptions] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [invoice, setInvoice] = useState({
    invoiceId: invoiceId || "",
    status: "DRAFT",
    invoiceNumber: "",
    projectCode: "",
    clientCode: "",
    consultantId: "",
    consultantName: "",
    consultantEmail: "",
    consultantStatus: "Active",
    clientName: "",
    businessName: "",
    billingAddress: "",
    date: new Date().toISOString().slice(0, 10),
    items: [],
    notes: "",
    subtotal: 0,
    gstRate: 0.18,
    gst: 0,
    total: 0,
    serviceFeePct: 25,
    serviceFeeAmount: 0,
    netEarnings: 0,
    baseHourlyRate: 0,
    stages: [],
  });

  const debouncedProjectCode = useDebouncedValue(invoice.projectCode, 500);

  /* ============================================================================
     UPDATE INVOICE
  ============================================================================ */

  const updateInvoice = (patch) => {
    setInvoice((prev) => {
      const updated = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      return recalc(updated);
    });
  };

  /* ============================================================================
     ✅ LOAD TEAM OPTIONS - Now stores all rows and groups by member name
  ============================================================================ */

  // Store all team rows (each row = one member + mode + factor combination)
  const [teamAllRows, setTeamAllRows] = useState([]);

  useEffect(() => {
    // Clear cache to get fresh team data
    clearTeamCache();

    getTeam()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.team || []);

        // Store ALL rows - each row has member name, mode, and factor
        const allRows = list.map((x) => ({
          id: x.id || x.Id || '',
          name: x.name || x.Name || '',
          factor: Number(x.baseFactor || x.factor || x.Factor || 1),
          mode: x.defaultMode || x.DefaultMode || 'Online | Face-Time',
        }));

        setTeamAllRows(allRows);

        // Extract UNIQUE member names for the team member dropdown
        const uniqueNames = [...new Set(allRows.map(r => r.name).filter(n => n))];
        setTeamOptions(
          uniqueNames.map((name) => {
            // Get first row for this member to use as default
            const firstRow = allRows.find(r => r.name === name);
            return {
              id: firstRow?.id || '',
              name: name,
              baseFactor: firstRow?.factor || 1,
              defaultMode: firstRow?.mode || 'Online | Face-Time',
            };
          })
        );
      })
      .catch((err) => {
        console.error('Failed to load team:', err);
        setTeamOptions([]);
        setTeamAllRows([]);
      });

    // No need to load modes separately - modes come from team rows
  }, []);

  /* ============================================================================
     LOAD COMPANY DETAILS
  ============================================================================ */

  useEffect(() => {
    getCompanyDetails()
      .then((res) => {
        if (res?.ok && res.companyDetails) {
          setCompanyDetails(res.companyDetails);
        } else if (res?.companyDetails) {
          setCompanyDetails(res.companyDetails);
        }
      })
      .catch((err) => {
        console.error('Failed to load company details:', err);
      });
  }, []);

  /* ============================================================================
     ✅ LOAD EXISTING DRAFT - PRODUCTION FIXED
  ============================================================================ */

  useEffect(() => {
    if (!invoiceId) return;
    setLoadingDraft(true);

    getInvoice(invoiceId)
      .then((result) => {
        if (!result?.ok || !result.invoice) {
          throw new Error(result?.error || 'Draft not found');
        }

        const draft = result.invoice;

        // ✅ CRITICAL: Use work.items from API response
        const workItems = draft.work?.items || draft.items || [];
        const workStages = draft.work?.stages || draft.stages || [];

        // Build initial state
        const initialState = {
          invoiceId: draft.invoiceId,
          status: 'DRAFT',

          projectCode: draft.project?.projectCode || draft.projectCode || '',

          clientCode: draft.client?.code || draft.clientCode || '',
          clientName: draft.client?.name || '',
          businessName: draft.client?.businessName || '',
          billingAddress: draft.client?.billingAddress || draft.billingAddress || '',

          consultantId: draft.consultant?.id || draft.consultantId || '',
          consultantName: draft.consultant?.name || draft.consultantName || '',
          consultantEmail: draft.consultant?.email || '',
          consultantStatus: "Active",

          date: draft.date || new Date().toISOString().slice(0, 10),
          notes: draft.notes || '',

          // ✅ CRITICAL: Use workItems, not draft.items
          stages: workStages,
          items: workItems.map(item => ({
            memberId: item.memberId || item.id,
            name: item.name || '',
            mode: item.mode || 'Online',
            rate: Number(item.rate || 0),
            factor: Number(item.factor || 1),
            stageHours: item.stageHours || {}
          })),

          baseHourlyRate: draft.config?.baseHourlyRate || draft.baseHourlyRate || 0,
          serviceFeePct: draft.config?.serviceFeePct || draft.serviceFeePct || 25,
          gstRate: (() => {
            // ✅ FIX: Normalize GST from draft
            let gst = draft.config?.gstRate ?? draft.gstRate ?? 0.18;
            return gst > 1 ? gst / 100 : gst;
          })(),
        };

        // Calculate ALL derived values
        const calculatedState = recalc(initialState);

        // Fetch project setup data for the loaded project code
        getInvoiceSetup(calculatedState.projectCode)
          .then(res => {
            setProjectData(res.project);
            setClientData(res.client);
            setConsultantData(res.consultant);
          })
          .catch(err => console.error('Error fetching setup data:', err));

        // Set display data (including full details for preview)
        setProjectData({ projectCode: draft.project?.projectCode || draft.projectCode });
        setClientData({
          Client_name: draft.client?.name,
          Business_Name: draft.client?.businessName || '', // Fixed TYPO: Business_Name
          Billing_Address: draft.client?.billingAddress,
          Client_PAN: draft.client?.pan || '',
          Client_GST: draft.client?.gstin || '',
          State: draft.client?.stateCode || '',
          Client_email: draft.client?.email || ''
        });
        setConsultantData({
          Consultant_name: draft.consultant?.name,
          email: draft.consultant?.email,
          business_name: draft.consultant?.businessName || draft.consultant?.name || '',
          business_registered_office: draft.consultant?.registeredOffice || '',
          business_pan: draft.consultant?.pan || '',
          business_gstin: draft.consultant?.gstin || '',
          business_cin: draft.consultant?.cin || '',
          business_state_code: draft.consultant?.stateCode || ''
        });

        setInvoice(calculatedState);
      })
      .catch((err) => {
        console.error('❌ Failed to load draft:', err);
        alert(`Failed to load draft: ${err.message}`);
        navigate('/dashboard/create-invoice');
      })
      .finally(() => {
        setLoadingDraft(false);
      });
  }, [invoiceId, navigate]);
  /* ============================================================================
     PROJECT LOOKUP (for new invoices only)
  ============================================================================ */

  useEffect(() => {
    if (!debouncedProjectCode) return;
    if (loadingDraft) return;
    if (invoiceId) return;  // ✅ Skip if editing existing draft

    setLoadingProject(true);
    setLoadingProject(true);
    getInvoiceSetup(debouncedProjectCode)
      .then((res) => {
        if (!res?.ok) {
          // Clear project data if not found
          setProjectData(null);
          setClientData(null);
          setConsultantData(null);
          return;
        }

        // ✅ CRITICAL: Validate project ownership
        const loggedInConsultantId = user?.consultantId || user?.consultant_id;
        const projectConsultantId = res.project?.consultantId;

        if (!loggedInConsultantId) {
          alert('❌ Error: Unable to verify your consultant ID. Please log in again.');
          setProjectData(null);
          setClientData(null);
          setConsultantData(null);
          return;
        }

        if (projectConsultantId !== loggedInConsultantId) {
          alert(`❌ Access Denied!\n\nProject "${debouncedProjectCode}" belongs to another consultant.\nYou can only create invoices for your own projects.`);

          // Clear the project code from the form
          updateInvoice({
            projectCode: '',
            clientCode: '',
            consultantId: '',
            consultantName: '',
            consultantEmail: '',
            clientName: '',
            businessName: '',
            billingAddress: '',
            baseHourlyRate: 0,
            serviceFeePct: 25,
            stages: []
          });

          setProjectData(null);
          setClientData(null);
          setConsultantData(null);
          return;
        }

        // ✅ Project belongs to this consultant - proceed

        // ✅ Store raw API data
        setProjectData(res.project);
        setClientData(res.client);
        setConsultantData(res.consultant);

        // ✅ Map backend field names to frontend state
        updateInvoice((prev) => ({
          ...prev,
          clientCode: res.project.clientCode,
          consultantId: res.project.consultantId,
          consultantName: res.consultant?.Consultant_name || "",
          consultantEmail: res.consultant?.email || "",
          consultantStatus: res.consultant?.status || "active",
          clientName: res.client?.name || "",
          businessName: res.client?.businessName || "",
          billingAddress: res.client?.billingAddress || "",
          baseHourlyRate: res.project.hourlyRate,
          serviceFeePct: incomingServiceFeeToPercent(res.project.serviceFeePct),
          gstRate: (() => {
            // ✅ FIX: Normalize GST - convert percentage to decimal if needed
            // Use undefined coalescing (??) instead of logical OR (||) to treat 0 as valid
            let rawGst = res.project?.gst ?? res.project?.GST ?? 0.18;
            let gst = Number(rawGst);
            return gst > 1 ? gst / 100 : gst;
          })(),
          stages: prev.stages?.length > 0 ? prev.stages : (res.project?.stages || []),
        }));
      })
      .catch((err) => {
        console.error('❌ Project lookup error:', err);
        alert(`❌ Error loading project: ${err.message}`);
        setProjectData(null);
        setClientData(null);
        setConsultantData(null);
      })
      .finally(() => setLoadingProject(false));
  }, [debouncedProjectCode, loadingDraft, invoiceId, user]);
  /* ============================================================================
     ✅ SAVE AS DRAFT - PRODUCTION FIXED WITH NESTED STRUCTURE
  ============================================================================ */

  const handleSaveDraft = async () => {
    if (!invoice.projectCode || invoice.projectCode.trim() === '') {
      alert('⚠️ Project code is required');
      return;
    }

    const consultantId = user?.consultantId || user?.consultant_id;
    if (!consultantId) {
      alert('❌ Missing consultant ID');
      return;
    }

    // ✅ CRITICAL: Verify consultant ID matches the one from project lookup
    if (invoice.consultantId && invoice.consultantId !== consultantId) {
      alert('❌ Security Error: Project consultant ID mismatch!\n\nYou can only create invoices for your own projects.');
      return;
    }

    // ✅ Additional check: Ensure project data was loaded successfully
    if (!projectData || !invoice.consultantId) {
      alert('⚠️ Please enter a valid project code that belongs to you.');
      return;
    }
    setIsSaving(true);

    try {
      // ✅ BUILD PAYLOAD WITH NESTED STRUCTURE (INPUTS ONLY, NO CALCULATIONS)
      const payload = {
        consultantId,
        invoiceData: {
          date: invoice.date,
          notes: invoice.notes,

          // ✅ NEW: Nest project data
          project: {
            projectCode: invoice.projectCode
          },

          // ✅ NEW: Nest client data (with full details for preview)
          client: {
            code: invoice.clientCode,
            name: invoice.clientName,
            businessName: invoice.businessName,
            billingAddress: invoice.billingAddress,
            pan: clientData?.Client_PAN || clientData?.pan || '',
            gstin: clientData?.Client_GST || clientData?.gstin || '',
            stateCode: clientData?.State || clientData?.stateCode || '',
            email: clientData?.Client_email || clientData?.email || ''
          },

          // ✅ NEW: Nest consultant data (with full details for preview)
          consultant: {
            id: invoice.consultantId,
            name: invoice.consultantName,
            email: invoice.consultantEmail,
            businessName: consultantData?.business_name || consultantData?.Consultant_name || invoice.consultantName || '',
            registeredOffice: consultantData?.business_registered_office || '',
            pan: consultantData?.business_pan || '',
            gstin: consultantData?.business_gstin || '',
            cin: consultantData?.business_cin || '',
            stateCode: consultantData?.business_state_code || ''
          },

          // ✅ NEW: Nest work structure
          work: {
            stages: invoice.stages,
            items: invoice.items.map(item => ({
              memberId: item.memberId,
              name: item.name,        // ✅ PRESERVE: name
              mode: item.mode,        // ✅ PRESERVE: mode
              rate: item.rate,
              factor: item.factor,
              stageHours: item.stageHours || {}  // ✅ CRITICAL: Preserve structure
            }))
          },

          // ✅ NEW: Nest config values
          config: {
            baseHourlyRate: invoice.baseHourlyRate,
            serviceFeePct: invoice.serviceFeePct,
            gstRate: invoice.gstRate  // ✅ NEW: Save GST rate
          }
        }
      };

      let result;
      if (invoice.invoiceId) {
        result = await updateDraft(invoice.invoiceId, payload);
      } else {
        result = await createDraft(payload);
      }

      if (!result?.ok) {
        throw new Error(result?.error || 'Failed to save draft');
      }

      // Update URL if new draft
      if (!invoice.invoiceId && result.invoiceId) {
        setInvoice(prev => ({ ...prev, invoiceId: result.invoiceId }));
        window.history.replaceState(
          {},
          "",
          `/dashboard/create-invoice/${result.invoiceId}`
        );
      }

      alert('✅ Draft saved successfully!');
    } catch (error) {
      console.error('Save draft error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /* ============================================================================
     ✅ FINALIZE INVOICE - PRODUCTION FIXED WITH COMPLETE SNAPSHOT
  ============================================================================ */

  const handleSaveFinalInvoice = async () => {
    // Validation
    if (!invoice.projectCode?.trim()) {
      alert('⚠️ Please enter a project code');
      return;
    }

    if (!invoice.consultantId) {
      alert('⚠️ Missing consultant information');
      return;
    }

    const consultantId = user?.consultantId || user?.consultant_id;

    // ✅ CRITICAL: Verify consultant ID matches
    if (invoice.consultantId !== consultantId) {
      alert('❌ Security Error: You can only finalize invoices for your own projects!');
      return;
    }

    // ✅ Ensure project data exists
    if (!projectData) {
      alert('⚠️ Invalid project. Please enter a valid project code that belongs to you.');
      return;
    }

    const hasHours = invoice.items.some(it => Number(it.hours || 0) > 0);
    if (!hasHours) {
      alert('⚠️ Please add at least one team member with hours');
      return;
    }

    setIsSaving(true);

    try {
      // ✅ CRITICAL: Auto-save as draft first if no invoiceId
      let finalInvoiceId = invoice.invoiceId;

      if (!finalInvoiceId || finalInvoiceId === '') {

        const draftPayload = {
          consultantId: invoice.consultantId,
          invoiceData: {
            date: invoice.date,
            notes: invoice.notes,

            project: {
              projectCode: invoice.projectCode
            },

            // ✅ NEW: Nest client data (with full details for preview)
            client: {
              code: invoice.clientCode,
              name: invoice.clientName,
              businessName: invoice.businessName,
              billingAddress: invoice.billingAddress,
              pan: clientData?.Client_PAN || clientData?.pan || '',
              gstin: clientData?.Client_GST || clientData?.gstin || '',
              stateCode: clientData?.State || clientData?.stateCode || '',
              email: clientData?.Client_email || clientData?.email || ''
            },

            // ✅ NEW: Nest consultant data (with full details for preview)
            consultant: {
              id: invoice.consultantId,
              name: invoice.consultantName,
              email: invoice.consultantEmail,
              businessName: consultantData?.business_name || consultantData?.Consultant_name || invoice.consultantName || '',
              registeredOffice: consultantData?.business_registered_office || '',
              pan: consultantData?.business_pan || '',
              gstin: consultantData?.business_gstin || '',
              cin: consultantData?.business_cin || '',
              stateCode: consultantData?.business_state_code || ''
            },

            work: {
              stages: invoice.stages,
              items: invoice.items.map(item => ({
                memberId: item.memberId,
                name: item.name,
                mode: item.mode,
                rate: item.rate,
                factor: item.factor,
                stageHours: item.stageHours || {}
              }))
            },

            config: {
              baseHourlyRate: invoice.baseHourlyRate,
              serviceFeePct: invoice.serviceFeePct,
              gstRate: invoice.gstRate  // ✅ NEW: Save GST rate
            }
          }
        };

        const draftResult = await createDraft(draftPayload);

        if (!draftResult?.ok || !draftResult.invoiceId) {
          throw new Error(draftResult?.error || 'Failed to create draft');
        }

        finalInvoiceId = draftResult.invoiceId;

        // Update state with new invoiceId
        setInvoice(prev => ({ ...prev, invoiceId: finalInvoiceId }));

        // Update URL
        window.history.replaceState(
          {},
          "",
          `/dashboard/create-invoice/${finalInvoiceId}`
        );
      }

      // ✅ NOW we have a valid invoiceId - proceed with finalization
      const snapshot = {
        meta: {
          invoiceId: finalInvoiceId,  // ✅ Use the valid ID
          invoiceNumber: null,
          status: 'FINAL',
          invoiceDate: invoice.date,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          finalizedAt: new Date().toISOString()
        },

        project: {
          projectCode: invoice.projectCode,
          projectId: projectData?.projectId || invoice.projectCode
        },

        consultant: {
          id: invoice.consultantId,
          name: invoice.consultantName,
          email: consultantData?.email || invoice.consultantEmail || '',
          businessName: consultantData?.business_name || consultantData?.Consultant_name || invoice.consultantName,
          registeredOffice: consultantData?.business_registered_office || '',
          pan: consultantData?.business_pan || '',
          gstin: consultantData?.business_gstin || '',
          cin: consultantData?.business_cin || '',
          stateCode: consultantData?.business_state_code || '',
          hourlyRate: invoice.baseHourlyRate  // ✅ ADD THIS
        },

        client: {
          code: invoice.clientCode,
          name: clientData?.Client_name || invoice.clientName || '',
          businessName: clientData?.Buisness_Name || invoice.businessName || '',
          billingAddress: invoice.billingAddress || clientData?.Billing_Address || '',
          pan: clientData?.Client_PAN || '',     // ✅ Changed from PAN
          gstin: clientData?.Client_GST || '',   // ✅ Changed from GSTIN
          stateCode: clientData?.State || ''
        },

        serviceProvider: {
          name: companyDetails?.company_name || "Hourly Ventures LLP",
          registeredOffice: companyDetails?.registered_office || "K-47, Kailash Colony, South Delhi, New Delhi, Delhi, India, 110048",
          stateCode: companyDetails?.state_code || "Delhi (07)",
          pan: companyDetails?.pan || "AASFH5516N",
          cin: companyDetails?.cin || "ACQ-3618",
          gstin: companyDetails?.gstin || "JKNJKNSX",
          email: companyDetails?.email || "Team@Hourly.Design"
        },

        work: {
          stages: invoice.stages,
          items: invoice.items.map(item => ({
            memberId: item.memberId,
            name: item.name,
            mode: item.mode,
            rate: item.rate,
            factor: item.factor,
            hours: item.hours,
            amount: item.amount,
            stageHours: item.stageHours
          }))
        },

        totals: {
          subtotal: invoice.subtotal,
          gst: invoice.gst,
          total: invoice.total,
          serviceFeePct: invoice.serviceFeePct,
          serviceFeeAmount: invoice.serviceFeeAmount,
          netEarnings: invoice.netEarnings
        },

        compliance: {
          sacCode: "999799",
          supplyDescription: "Professional Services"
        },

        notes: invoice.notes
      };

      const payload = {
        invoiceId: finalInvoiceId,  // ✅ Now guaranteed to be valid
        consultantId: invoice.consultantId,
        snapshot
      };

      const result = await finalizeInvoice(payload);

      if (!result?.ok) {
        throw new Error(result?.error || 'Failed to finalize invoice');
      }

      setInvoice(prev => ({
        ...prev,
        invoiceId: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        status: 'FINAL'
      }));

      alert(`✅ Invoice finalized! Invoice #${result.invoiceNumber}`);

    } catch (error) {
      console.error('❌ Finalize error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /* ============================================================================
     PREVIEW & SHARE HANDLERS
  ============================================================================ */

  const handlePreview = () => {

    // Log invoice state

    // Log external data

    // Log items detail
    if (invoice.items?.length > 0) {
    } else {
    }

    // Log stages detail
    if (invoice.stages?.length > 0) {
    } else {
    }

    // Open preview
    setIsPreviewOpen(true);
  };

  const handleShare = async (email) => {

    await new Promise(resolve => setTimeout(resolve, 100));

    if (!invoiceRef.current) {
      console.error('❌ invoiceRef.current is null');
      alert('❌ Invoice reference not found. Please try again.');
      return;
    }

    const invoiceHTML = invoiceRef.current.innerHTML;

    if (!invoiceHTML || invoiceHTML.trim().length < 100) {
      console.error('❌ Invoice HTML is too short or empty');
      alert('❌ Invoice content failed to generate.');
      return;
    }

    try {
      const result = await shareInvoice({
        toEmail: email,
        html: invoiceHTML,
        invoiceId: invoice.invoiceId || "DRAFT",
        projectCode: invoice.projectCode,
        consultantName: invoice.consultantName,
        total: invoice.total,
        subtotal: invoice.subtotal,
        gst: invoice.gst,
      });

      if (result.hasPDF) {
        alert(`✅ Invoice sent as PDF to ${email}!\n\nFilename: ${result.filename}`);
      } else {
        alert(`✅ Invoice sent to ${email}!`);
      }

      setIsShareDialogOpen(false);
    } catch (error) {
      console.error('❌ Share error:', error);
      alert(`❌ Failed to share invoice: ${error.message}`);
    }
  };

  /* ============================================================================
     LOADING STATE
  ============================================================================ */

  if (loadingDraft) {
    return (
      <div className="app-container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f4f6',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontSize: '16px', color: '#6b7280' }}>Loading draft invoice...</p>
        </div>
      </div>
    );
  }

  /* ============================================================================
     RENDER
  ============================================================================ */

  return (
    <div className="app-container">
      <main style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        marginBottom: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px"
      }}>
        {/* Page Title */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
            {invoice.status === "FINAL"
              ? "📄 Final Invoice"
              : invoiceId
                ? "✏️ Edit Draft"
                : "➕ Create New Invoice"}
          </h1>

          {invoiceId && (
            <span style={{
              padding: '6px 12px',
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Draft ID: {invoiceId}
            </span>
          )}
        </div>
        {/* Invoice Details Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">📄 Invoice Details</h2>
          </div>

          <div className="rigid-grid-3">
            {/* Invoice Number */}
            <div className="rigid-data-box">
              <div className="rigid-label">Invoice Number</div>
              <div className="rigid-value">
                {invoice.invoiceNumber || "Will auto-fill"}
              </div>
            </div>

            {/* Invoice Date */}
            <div className="rigid-data-box">
              <div className="rigid-label">Invoice Date</div>
              <div className="rigid-value">{formatDate(invoice.date)}</div>
            </div>

            {/* Empty third column for 3-column consistency */}
            <div className="rigid-data-box" style={{ visibility: 'hidden' }}>
              <div className="rigid-label">Placeholder</div>
              <div className="rigid-value">-</div>
            </div>
          </div>
        </div>

        {/* Project Lookup Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">🔍 Project Lookup</h2>
          </div>

          <div className="rigid-grid-3">
            {/* Project Code - Editable */}
            <div className="rigid-data-box">
              <div className="rigid-label">Project Code (Editable)</div>
              <input
                className="rigid-input-field"
                placeholder="PRJ_XXXXX"
                value={invoice.projectCode}
                onChange={(e) => updateInvoice({ projectCode: e.target.value })}
              />
            </div>

            {/* Consultant ID - Auto */}
            <div className="rigid-data-box">
              <div className="rigid-label">Consultant ID (Auto)</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.consultantId || "Will auto-fill")}
              </div>
            </div>

            {/* Client ID - Auto */}
            <div className="rigid-data-box">
              <div className="rigid-label">Client ID (Auto)</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.clientCode || "Will auto-fill")}
              </div>
            </div>
          </div>
        </div>

        {/* Consultant Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">👤 Consultant</h2>
          </div>

          <div className="rigid-grid-3">
            <div className="rigid-data-box">
              <div className="rigid-label">Consultant Name</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.consultantName || "Will auto-fill")}
              </div>
            </div>

            <div className="rigid-data-box">
              <div className="rigid-label">Consultant Email</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.consultantEmail || "Will auto-fill")}
              </div>
            </div>

            <div className="rigid-data-box">
              <div className="rigid-label">Consultant Status</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.consultantStatus || "Active")}
              </div>
            </div>
          </div>
        </div>

        {/* Client Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">🏢 Client</h2>
          </div>

          <div className="rigid-grid-3">
            <div className="rigid-data-box">
              <div className="rigid-label">Client Name</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.clientName || "Will auto-fill")}
              </div>
            </div>

            <div className="rigid-data-box">
              <div className="rigid-label">Business Name</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.businessName || "Will auto-fill")}
              </div>
            </div>

            <div className="rigid-data-box">
              <div className="rigid-label">Billing Address</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.billingAddress || "Will auto-fill")}
              </div>
            </div>
          </div>
        </div>

        {/* Billing Info Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">💰 Billing / Project Info</h2>
          </div>

          <div className="rigid-grid-3">
            <div className="rigid-data-box">
              <div className="rigid-label">Hourly Rate (From Project)</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.baseHourlyRate ? formatINR(invoice.baseHourlyRate) : "Will auto-fill")}
              </div>
            </div>

            <div className="rigid-data-box">
              <div className="rigid-label">Service Fee % (From Project)</div>
              <div className="rigid-value">
                {loadingProject ? "Loading..." : (invoice.serviceFeePct ? `${invoice.serviceFeePct}%` : "Will auto-fill")}
              </div>
            </div>

            <div className="rigid-data-box">
              <div className="rigid-label">GST % (Fixed)</div>
              <div className="rigid-value">{Math.round((invoice.gstRate ?? 0.18) * 100)}%</div>
            </div>
          </div>
        </div>

        {/* Stage Groups & Sub-Stages Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">📊 Stage Groups & Sub-Stages</h2>
          </div>
          {/* <div style={{ 
          fontSize: '0.875rem', 
          color: '#64748b', 
          marginBottom: '16px',
          lineHeight: '1.5'
        }}>
          Configure stages (e.g., Stage 1 = 30%) and their sub-stages. These become the columns in the table below.
        </div> */}
          <TeamSummary
            invoice={invoice}
            updateInvoice={updateInvoice}
            teamOptions={teamOptions}
            teamAllRows={teamAllRows}
            baseHourlyRate={invoice.baseHourlyRate}
            showOnlyStages={true}
          />
        </div>

        {/* Billable Hours Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">⏱️ Billable Hours</h2>
          </div>
          {/* <div style={{ 
          fontSize: '0.875rem', 
          color: '#64748b', 
          marginBottom: '16px',
          lineHeight: '1.5'
        }}>
          Enter hours for each sub-stage per team member. Factors & rates are calculated automatically.
        </div> */}
          <TeamSummary
            invoice={invoice}
            updateInvoice={updateInvoice}
            teamOptions={teamOptions}
            teamAllRows={teamAllRows}
            baseHourlyRate={invoice.baseHourlyRate}
            showOnlyTable={true}
          />
        </div>

        {/* Notes & Billing Summary Card */}
        <div className="card">
          <div className="section-header-row">
            <div className="blue-accent-bar" />
            <h2 className="section-title-alt">📋 Notes & Billing Summary</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", alignItems: "flex-start" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#6b7280",
                marginBottom: "6px",
                fontWeight: 600,
              }}>
                Notes (Optional)
              </label>
              <textarea
                className="textarea"
                placeholder="Notes..."
                rows={10}
                value={invoice.notes}
                onChange={(e) => updateInvoice({ notes: e.target.value })}
                style={{ minHeight: "100%", height: "100%", resize: "none" }}
              />
            </div>
            <div className="billing-card" style={{ height: "100%" }}>
              <div style={{ marginBottom: "12px", fontSize: "0.95rem", fontWeight: 600, color: "#374151" }}>
                Billing Total
              </div>
              <div className="billing-row">
                <span>Subtotal</span>
                <span>{formatINR(invoice.subtotal)}</span>
              </div>
              <div className="billing-row">
                <span>GST</span>
                <span>{formatINR(invoice.gst)}</span>
              </div>
              <div className="billing-row billing-row-total">
                <span>Total</span>
                <span>{formatINR(invoice.total)}</span>
              </div>
              <div className="consultant-only">
                <div className="billing-divider" />
                <div className="billing-row">
                  <span>Service Fee ({invoice.serviceFeePct}%)</span>
                  <span style={{ color: "#e53935" }}>-{formatINR(invoice.serviceFeeAmount)}</span>
                </div>
                <div className="billing-row billing-row-total">
                  <span>Net Earnings</span>
                  <span style={{ color: "#4caf50" }}>{formatINR(invoice.netEarnings)}</span>
                </div>
                <p style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "8px", fontStyle: "italic" }}>
                  * Visible only to you. Not shown to clients.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Hidden invoice for Share (rendered once, reused) */}
      <div style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '210mm',
        visibility: 'hidden',
        pointerEvents: 'none'
      }}>
        <div ref={invoiceRef}>
          {(() => {
            // Build complete snapshot
            const snapshot = {
              meta: {
                invoiceId: invoice.invoiceId || "DRAFT",
                invoiceNumber: invoice.invoiceNumber || "DRAFT",
                status: invoice.status || "DRAFT",
                invoiceDate: invoice.date,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                finalizedAt: invoice.status === 'FINAL' ? new Date().toISOString() : null
              },

              project: {
                projectCode: invoice.projectCode,
                projectId: projectData?.projectId || projectData?.Project_Code || invoice.projectCode
              },

              consultant: {
                id: invoice.consultantId,
                name: invoice.consultantName || consultantData?.Consultant_name || '',
                email: invoice.consultantEmail || consultantData?.email || '',
                businessName: consultantData?.business_name || consultantData?.Consultant_name || invoice.consultantName || '',
                registeredOffice: consultantData?.business_registered_office || '',
                pan: consultantData?.business_pan || '',
                gstin: consultantData?.business_gstin || '',
                cin: consultantData?.business_cin || '',
                stateCode: consultantData?.business_state_code || '',
                hourlyRate: invoice.baseHourlyRate || 0
              },

              client: {
                code: invoice.clientCode || clientData?.Client_Code || clientData?.code || '',
                name: invoice.clientName || clientData?.Client_name || clientData?.name || '',
                businessName: invoice.businessName || clientData?.Business_Name || clientData?.Buisness_Name || clientData?.businessName || '',
                billingAddress: invoice.billingAddress || clientData?.Billing_Address || clientData?.billingAddress || '',
                pan: invoice.clientPan || clientData?.Client_PAN || clientData?.PAN || clientData?.pan || '',
                gstin: invoice.clientGstin || clientData?.Client_GST || clientData?.GSTIN || clientData?.gstin || '',
                stateCode: invoice.clientState || clientData?.State || clientData?.stateCode || '',
                email: invoice.clientEmail || clientData?.Client_email || clientData?.email || '' // ✅ Added email
              },

              serviceProvider: {
                name: companyDetails?.company_name || "Hourly Ventures LLP",
                companyName: companyDetails?.company_name || "Hourly Ventures LLP", // ✅ Added for InvoiceComplete
                registeredOffice: companyDetails?.registered_office || "K-47, Kailash Colony, South Delhi, New Delhi, Delhi, India, 110048",
                stateCode: companyDetails?.state_code || "Delhi (07)",
                pan: companyDetails?.pan || "AASFH5516N",
                cin: companyDetails?.cin || "ACQ-3618",
                gstin: companyDetails?.gstin || "JKNJKNSX",
                email: companyDetails?.email || "Team@Hourly.Design"
              },

              work: {
                // ✅ CRITICAL FIX: ENSURE stages is ALWAYS an array with data
                stages: Array.isArray(invoice.stages) && invoice.stages.length > 0
                  ? invoice.stages
                  : [],

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
              },

              totals: {
                subtotal: Number(invoice.subtotal || 0),
                gst: Number(invoice.gst || 0),
                total: Number(invoice.total || 0),
                serviceFeePct: Number(invoice.serviceFeePct || 0),
                serviceFeeAmount: Number(invoice.serviceFeeAmount || 0),
                netEarnings: Number(invoice.netEarnings || 0)
              },

              compliance: {
                sacCode: "999799",
                supplyDescription: "Professional Services"
              },

              notes: invoice.notes || ""
            };

            return (
              <InvoiceComplete
                invoice={{ snapshot }}
                logoUrl={LOGO_URL}
              />
            );
          })()}
        </div>
      </div>

      {/* ✅ Preview Modal */}
      <InvoicePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        invoice={invoice}
        projectData={projectData || {}}
        clientData={clientData || {}}
        consultantData={consultantData || {}}
        companyDetails={companyDetails || {}} // ✅ Pass company details
        logoUrl={LOGO_URL}
      />

      {/* Footer Actions */}
      <div className="footer-actions">
        <div className="left">
          <button className="btn btn-ghost" onClick={handlePreview}>
            📄 Preview
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setIsShareDialogOpen(true)}
            disabled={invoice.status !== 'FINAL'}
            title={invoice.status !== 'FINAL' ? 'Please finalize the invoice first to share' : 'Share invoice via email'}
            style={{
              opacity: invoice.status !== 'FINAL' ? 0.5 : 1,
              cursor: invoice.status !== 'FINAL' ? 'not-allowed' : 'pointer'
            }}
          >
            ✉️ Share
          </button>
        </div>
        <div className="right">
          <div style={{
            padding: "8px 16px",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "1.2rem",
            fontWeight: 700,
          }}>
            Total: {formatINR(invoice.total)}
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleSaveDraft}
            disabled={isSaving || invoice.status === 'FINAL'}
            title={invoice.status === 'FINAL' ? 'Invoice already finalized' : 'Save as draft'}
          >
            {isSaving ? '💾 Saving...' : '💾 Save Draft'}
          </button>
          <button
            className="btn btn-success"
            onClick={handleSaveFinalInvoice}
            disabled={isSaving || invoice.status === 'FINAL'}
            title={invoice.status === 'FINAL' ? 'Invoice already finalized' : 'Finalize and save invoice'}
          >
            {isSaving
              ? '⏳ Saving...'
              : invoice.status === 'FINAL'
                ? '✅ Finalized'
                : '✅ Save Invoice'}
          </button>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareInvoiceDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        invoiceData={{
          invoiceId: invoice.invoiceId,
          invoiceNumber: invoice.invoiceNumber || "DRAFT",
          projectCode: invoice.projectCode,
          subtotal: invoice.subtotal,
          gst: invoice.gst,
          total: invoice.total,
        }}
        clientEmail={clientData?.Client_email || clientData?.email || invoice.clientEmail || ''}
        onShare={handleShare}
      />
    </div>
  );
}