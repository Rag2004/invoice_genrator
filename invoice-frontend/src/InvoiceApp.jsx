
import React, { useEffect, useState, useRef } from 'react';
import './styles.css';
import { useParams, useNavigate } from 'react-router-dom';

import TeamSummary from './components/TeamSummary';
import InvoiceComplete from './components/InvoiceComplete';
import ShareInvoiceDialog from './components/ui/ShareInvoiceDialog';
import InvoicePreviewModal from './components/InvoicePreviewModal';

import { getTeam, shareInvoice, createDraft, updateDraft, finalizeInvoice, getInvoice  } from './api/api';
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
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const serviceFeePct = Number(draft.serviceFeePct || 0);
  const serviceFeeAmount = Math.round(total * (serviceFeePct / 100));
  const netEarnings = total - serviceFeeAmount;

  return {
    ...draft,
    items,
    subtotal,
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
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  
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
     ✅ LOAD TEAM OPTIONS
  ============================================================================ */

  useEffect(() => {
    getTeam()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.team || []);
        
        setTeamOptions(
          list.map((x) => ({
            id: x.id || x.Id || '',
            name: x.name || x.Name || '',
            baseFactor: Number(x.baseFactor || x.factor || x.Factor || 1),
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to load team:', err);
        setTeamOptions([]);
      });
  }, []);

  /* ============================================================================
     ✅ LOAD EXISTING DRAFT - PRODUCTION FIXED
  ============================================================================ */

  useEffect(() => {
  if (!invoiceId) return;

  console.log('📄 Loading draft:', invoiceId);
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

      console.log('✅ Loaded items:', workItems.length);
      console.log('✅ Loaded stages:', workStages.length);

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
      };

      // Calculate ALL derived values
      const calculatedState = recalc(initialState);

      console.log('✅ Draft loaded:', {
        items: calculatedState.items.length,
        stages: calculatedState.stages.length,
        subtotal: calculatedState.subtotal,
        total: calculatedState.total
      });

      // Set display data
      setProjectData({ projectCode: draft.project?.projectCode || draft.projectCode });
      setClientData({ 
        Client_name: draft.client?.name,
        Buisness_Name: draft.client?.businessName,
        Billing_Address: draft.client?.billingAddress
      });
      setConsultantData({
        Consultant_name: draft.consultant?.name,
        email: draft.consultant?.email
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
    fetch(`${API_BASE}/projects/${debouncedProjectCode}/setup`)
      .then((r) => r.json())
      .then((res) => {
        if (!res?.ok) return;

        setProjectData(res.project);
        setClientData(res.client);
        setConsultantData(res.consultant);

        updateInvoice((prev) => ({
          ...prev,
          clientCode: res.project.clientCode,
          consultantId: res.project.consultantId,
          consultantName: res.consultant?.Consultant_name || "",
          consultantEmail: res.consultant?.email || "",
          consultantStatus: res.consultant?.status || "",
          clientName: res.client?.Client_name || "",
          businessName: res.client?.Buisness_Name || "",
          billingAddress: res.client?.Billing_Address || "",
          baseHourlyRate: res.project.hourlyRate,
          serviceFeePct: incomingServiceFeeToPercent(res.project.serviceFeePct),
          
          // ✅ Only set stages if empty (new invoice)
          stages: prev.stages?.length > 0 ? prev.stages : (res.project?.stages || []),
        }));
      })
      .finally(() => setLoadingProject(false));
  }, [debouncedProjectCode, loadingDraft, invoiceId]);
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
          
          // ✅ NEW: Nest client data
          client: {
            code: invoice.clientCode,
            name: invoice.clientName,
            businessName: invoice.businessName,
            billingAddress: invoice.billingAddress
          },
          
          // ✅ NEW: Nest consultant data
          consultant: {
            id: invoice.consultantId,
            name: invoice.consultantName,
            email: invoice.consultantEmail
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
            serviceFeePct: invoice.serviceFeePct
          }
        }
      };

      console.log('💾 Saving draft (nested structure, inputs only):', payload);

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
      console.log('⚠️ No invoiceId found. Saving as draft first...');
      
      const draftPayload = {
        consultantId: invoice.consultantId,
        invoiceData: {
          date: invoice.date,
          notes: invoice.notes,
          
          project: {
            projectCode: invoice.projectCode
          },
          
          client: {
            code: invoice.clientCode,
            name: invoice.clientName,
            businessName: invoice.businessName,
            billingAddress: invoice.billingAddress
          },
          
          consultant: {
            id: invoice.consultantId,
            name: invoice.consultantName,
            email: invoice.consultantEmail
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
            serviceFeePct: invoice.serviceFeePct
          }
        }
      };

      console.log('💾 Creating draft before finalization');

      const draftResult = await createDraft(draftPayload);

      if (!draftResult?.ok || !draftResult.invoiceId) {
        throw new Error(draftResult?.error || 'Failed to create draft');
      }

      console.log('✅ Draft created:', draftResult.invoiceId);

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
        businessName: consultantData?.Consultant_name || invoice.consultantName,
        registeredOffice: consultantData?.Registered_Office || '',
        pan: consultantData?.PAN || '',
        gstin: consultantData?.GSTIN || '',
        cin: consultantData?.CIN || '',
        stateCode: consultantData?.State || ''
      },
      
      client: {
        code: invoice.clientCode,
        name: clientData?.Client_name || invoice.clientName || '',
        businessName: clientData?.Buisness_Name || invoice.businessName || '',
        billingAddress: invoice.billingAddress || clientData?.Billing_Address || '',
        pan: clientData?.PAN || '',
        gstin: clientData?.GSTIN || '',
        stateCode: clientData?.State || ''
      },
      
      serviceProvider: {
        name: "Hourly Ventures LLP",
        registeredOffice: "K-47, Kailash Colony, South Delhi, New Delhi, Delhi, India, 110048",
        stateCode: "Delhi (07)",
        pan: "AASFH5516N",
        cin: "ACQ-3618",
        gstin: "JKNJKNSX",
        email: "Team@Hourly.Design"
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

    console.log('💾 Finalizing invoice:', {
      invoiceId: payload.invoiceId,
      itemsCount: snapshot.work?.items?.length,
      total: snapshot.totals?.total
    });

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
  console.log("=".repeat(60));
  console.log("🔍 PREVIEW DATA CHECK");
  console.log("=".repeat(60));
  
  // Log invoice state
  console.log("Invoice state:", {
    invoiceId: invoice.invoiceId,
    status: invoice.status,
    projectCode: invoice.projectCode,
    consultantId: invoice.consultantId,
    consultantName: invoice.consultantName,
    clientCode: invoice.clientCode,
    clientName: invoice.clientName,
    businessName: invoice.businessName,
    billingAddress: invoice.billingAddress,
    stagesCount: invoice.stages?.length || 0,
    itemsCount: invoice.items?.length || 0,
    subtotal: invoice.subtotal,
    total: invoice.total
  });
  
  // Log external data
  console.log("\nProject data:", projectData);
  console.log("Client data:", clientData);
  console.log("Consultant data:", consultantData);
  
  // Log items detail
  if (invoice.items?.length > 0) {
    console.log("\nFirst item:", {
      name: invoice.items[0].name,
      mode: invoice.items[0].mode,
      hours: invoice.items[0].hours,
      rate: invoice.items[0].rate,
      amount: invoice.items[0].amount
    });
  } else {
    console.log("\n❌ NO ITEMS FOUND");
  }
  
  // Log stages detail
  if (invoice.stages?.length > 0) {
    console.log("\nFirst stage:", {
      stage: invoice.stages[0].stage,
      subStages: invoice.stages[0].subStages?.length || 0
    });
  } else {
    console.log("\n❌ NO STAGES FOUND");
  }
  
  console.log("=".repeat(60));
  
  // Open preview
  setIsPreviewOpen(true);
};

  const handleShare = async (email) => {
    console.log('🔍 Starting share process...');
    
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

    console.log('✅ Invoice HTML generated:', invoiceHTML.length, 'characters');

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

      console.log('✅ Share API response:', result);
      
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
        <div className="card-header">📋 Invoice Details</div>
        <div className="grid-3">
          <InfoBox
            label="Invoice Number"
            value={invoice.invoiceNumber || (invoice.status === 'FINAL' ? 'Auto-generated' : null)}
            loading={false}
          />
          <div className="form-group">
            <label>Invoice Date</label>
            <input
              type="date"
              value={invoice.date}
              onChange={(e) => updateInvoice({ date: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Billing Info Card */}
      {/* <div className="card">
        <div className="card-header">💰 Billing / Project Info</div>
        <div className="grid-3">
          <InfoBox
            label="Base Hourly Rate"
            value={invoice.baseHourlyRate ? `₹${invoice.baseHourlyRate}/hr` : null}
            loading={loadingProject}
          />
          <InfoBox
            label="Service Fee"
            value={invoice.serviceFeePct ? `${invoice.serviceFeePct}%` : null}
            loading={loadingProject}
          />
        </div>
      </div> */}
        {/* Project Lookup Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🔍 Project Lookup</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
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
                Project Code (Editable)
              </label>
              <input
                className="input"
                placeholder="PRJ_XXXXX"
                value={invoice.projectCode}
                onChange={(e) => updateInvoice({ projectCode: e.target.value })}
              />
            </div>
            <InfoBox label="Consultant ID (Auto)" value={invoice.consultantId} loading={loadingProject} />
            <InfoBox label="Client ID (Auto)" value={invoice.clientCode} loading={loadingProject} />
          </div>
        </div>

        {/* Consultant Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">👤 Consultant</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <InfoBox label="Consultant Name" value={invoice.consultantName} loading={loadingProject} />
            <InfoBox label="Consultant Email" value={invoice.consultantEmail} loading={loadingProject} />
            <InfoBox label="Consultant Status" value={invoice.consultantStatus} loading={loadingProject} />
          </div>
        </div>

        {/* Client Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🏢 Client</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <InfoBox label="Client Name" value={invoice.clientName} loading={loadingProject} />
            <InfoBox label="Business Name" value={invoice.businessName} loading={loadingProject} />
            <InfoBox label="Billing Address" value={invoice.billingAddress} loading={loadingProject} />
          </div>
        </div>

        {/* Billing Info Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">💰 Billing / Project Info</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <InfoBox 
              label="Hourly Rate (From Project)" 
              value={invoice.baseHourlyRate ? formatINR(invoice.baseHourlyRate) : null} 
              loading={loadingProject} 
            />
            <InfoBox 
              label="Service Fee % (From Project)" 
              value={invoice.serviceFeePct ? `${invoice.serviceFeePct}%` : null} 
              loading={loadingProject} 
            />
            <InfoBox label="GST % (Fixed)" value="18%" loading={false} />
          </div>
        </div>

        {/* Team & Stages Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">👥 Team & Stages</h2>
          </div>
          <TeamSummary
            invoice={invoice}
            updateInvoice={updateInvoice}
            teamOptions={teamOptions}
            baseHourlyRate={invoice.baseHourlyRate}
          />
        </div>

        {/* Notes & Billing Summary Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📋 Notes & Billing Summary</h2>
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
              <div className="billing-divider" />
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
      // ✅ Build snapshot for rendering
      const snapshot = {
        meta: {
          invoiceId: invoice.invoiceId || "DRAFT",
          invoiceNumber: invoice.invoiceNumber || "DRAFT",
          status: invoice.status || "DRAFT",
          invoiceDate: invoice.date,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          finalizedAt: null
        },
        
        project: {
          projectCode: invoice.projectCode,
          projectId: projectData?.projectId || invoice.projectCode
        },
        
        consultant: {
          id: invoice.consultantId,
          name: invoice.consultantName,
          email: consultantData?.email || invoice.consultantEmail || '',
          businessName: consultantData?.Consultant_name || invoice.consultantName,
          registeredOffice: consultantData?.Registered_Office || '',
          pan: consultantData?.PAN || '',
          gstin: consultantData?.GSTIN || '',
          cin: consultantData?.CIN || '',
          stateCode: consultantData?.State || ''
        },
        
        client: {
          code: invoice.clientCode,
          name: clientData?.Client_name || invoice.clientName || '',
          businessName: clientData?.Buisness_Name || invoice.businessName || '',
          billingAddress: invoice.billingAddress || clientData?.Billing_Address || '',
          pan: clientData?.PAN || '',
          gstin: clientData?.GSTIN || '',
          stateCode: clientData?.State || ''
        },
        
        serviceProvider: {
          name: "Hourly Ventures LLP",
          registeredOffice: "K-47, Kailash Colony, South Delhi, New Delhi, Delhi, India, 110048",
          stateCode: "Delhi (07)",
          pan: "AASFH5516N",
          cin: "ACQ-3618",
          gstin: "JKNJKNSX",
          email: "Team@Hourly.Design"
        },
        
        work: {
          stages: invoice.stages || [],
          items: (invoice.items || []).map(item => ({
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
        logoUrl={LOGO_URL}
      />

      {/* Footer Actions */}
      <div className="footer-actions">
        <div className="left">
          <button className="btn btn-ghost" onClick={handlePreview}>
            📄 Preview
          </button>
          <button className="btn btn-ghost" onClick={() => setIsShareDialogOpen(true)}>
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
          <button className="btn btn-ghost" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? '💾 Saving...' : '💾 Save Draft'}
          </button>
          <button className="btn btn-success" onClick={handleSaveFinalInvoice} disabled={isSaving}>
            {isSaving ? '⏳ Saving...' : '✅ Save Invoice'}
          </button>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareInvoiceDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        invoiceData={{
          invoiceId: invoice.invoiceId || "DRAFT",
          projectCode: invoice.projectCode,
          subtotal: invoice.subtotal,
          gst: invoice.gst,
          total: invoice.total,
        }}
        onShare={handleShare}
      />
    </div>
  );
}