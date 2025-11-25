import React from "react";

export default function NotesAndTotals({ invoice = {}, updateInvoice }) {
  const totals = invoice.totals || {};

  // Try to be flexible with whatever you already have
  const subtotal = totals.subtotal || 0;
  const gstRate = totals.gstRate ?? 0.18; // default 18%
  const gstAmount = totals.gstAmount || subtotal * gstRate;

  // Total that client sees
  const totalWithGst =
    totals.totalWithGst || totals.total || subtotal + gstAmount;

  // Service fee & net earnings (consultant-only)
  const serviceFeeRate = invoice.serviceFeeRate ?? totals.serviceFeeRate ?? 0; // e.g. 0.15 for 15%
  const serviceFeeAmount = totalWithGst * serviceFeeRate;
  const netEarnings = totalWithGst - serviceFeeAmount;

  const handleNotesChange = (e) => {
    const value = e.target.value;
    if (typeof updateInvoice === "function") {
      updateInvoice((prev) => ({
        ...prev,
        notes: value,
      }));
    }
  };

  const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value || 0);

  return (
    <section className="notes-totals-card">
      <div className="notes-totals-header">
        <h2>Notes & Billing Summary</h2>
      </div>

      <div className="notes-totals-grid">
        {/* LEFT: Notes / Inclusions */}
        <div className="notes-column">
          <label className="field-label" htmlFor="invoice-notes">
            Notes / Inclusions (optional)
          </label>
          <textarea
            id="invoice-notes"
            className="notes-textarea"
            rows={8}
            placeholder="Add inclusions, scope of work, payment link, or any other notes that should appear on the invoice…"
            value={invoice.notes || ""}
            onChange={handleNotesChange}
          />
        </div>

        {/* RIGHT: Billing summary (client+consultant) */}
        <div className="totals-column">
          <div className="totals-box">
            <div className="totals-title">Billing Total</div>

            <div className="totals-row">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            <div className="totals-row">
              <span>GST ({Math.round((gstRate || 0) * 100)}%)</span>
              <span>{formatMoney(gstAmount)}</span>
            </div>

            <div className="totals-row totals-row-strong">
              <span>Total (incl. GST)</span>
              <span>{formatMoney(totalWithGst)}</span>
            </div>

            {/* CONSULTANT-ONLY SECTION */}
            <div className="totals-row consultant-only">
              <span>
                Service Fee ({Math.round((serviceFeeRate || 0) * 100)}%)
              </span>
              <span>-{formatMoney(serviceFeeAmount)}</span>
            </div>

            <div className="totals-row totals-row-strong consultant-only">
              <span>Your Net Earnings</span>
              <span>{formatMoney(netEarnings)}</span>
            </div>

            <p className="consultant-note consultant-only">
              For your reference only. This net earnings information will not
              appear on the client preview or the generated invoice/PDF.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
