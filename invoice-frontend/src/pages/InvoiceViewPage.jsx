
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInvoice } from "../api/api";
import InvoiceComplete from "../components/InvoiceComplete";
import { LOGO_URL } from "../config/branding";

export default function InvoiceViewerPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadInvoice() {
  try {
    setLoading(true);
    setError(null);

    if (!invoiceId) throw new Error("Invoice ID is required");

    const result = await getInvoice(invoiceId);

    const data =
      result?.invoice?.invoice || result?.invoice;

    if (!data) {
      throw new Error("Invoice not found");
    }

    // ✅ FINAL FIX — DO NOT TRANSFORM
    setInvoice(data);

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
useEffect(() => {
  loadInvoice();
}, [invoiceId]);


  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 120 }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: "4px solid #e5e7eb",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <h3>Failed to load invoice</h3>
        <p>{error}</p>
        <button onClick={() => navigate("/dashboard/invoices")}>
          ← Back to list
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh", padding: 24 }}>
      <div
        style={{
          maxWidth: "210mm",
          margin: "0 auto 24px",
          background: "white",
          padding: "16px 24px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>
            Invoice {invoice.invoiceNumber || invoice.invoiceId}
          </h1>
          <p style={{ margin: 0, color: "#6b7280" }}>
            Read-only view • Final Invoice
          </p>
        </div>

        <button onClick={() => navigate("/dashboard/invoices")}>
          ← Back to list
        </button>
      </div>

      <div
        style={{
          maxWidth: "210mm",
          margin: "0 auto",
          background: "white",
          borderRadius: 8,
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        }}
      >
        <InvoiceComplete
  invoice={invoice}
  logoUrl={LOGO_URL}
/>

      </div>
    </div>
  );
}
