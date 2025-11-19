import React from 'react';

export default function ScopeDetails({ invoice, updateInvoice }) {
  const stages = invoice.stages || [];

  const addStage = () => {
    const newStage = {
      id: Date.now(),
      stage: '',
      description: '',
      days: '',
    };
    updateInvoice({ stages: [...(invoice.stages || []), newStage] });
  };

  const removeStage = (id) => {
    const current = invoice.stages || [];
    const updated = current.filter((s) => s.id !== id);
    updateInvoice({ stages: updated });
  };

  const updateStage = (id, field, value) => {
    const current = invoice.stages || [];
    const updated = current.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    updateInvoice({ stages: updated });
  };

  return (
    <div style={{ padding: '0.5rem 0 0.75rem 0' }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          Stages & Timeline
        </h3>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={addStage}
        >
          + Add Stage
        </button>
      </div>

      {/* If no stages yet – show subtle hint */}
      {stages.length === 0 && (
        <p className="muted" style={{ marginBottom: '0.25rem' }}>
          No stages added yet. Click <strong>+ Add Stage</strong> to create one.
        </p>
      )}

      {/* Stage rows */}
      {stages.map((row) => (
        <div
          key={row.id}
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '0.75rem',
          }}
        >
          <div className="stage-row-grid">
            {/* Stage */}
            <div>
              <label className="label">Stage</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Concept & Massing"
                value={row.stage || ''}
                onChange={(e) =>
                  updateStage(row.id, 'stage', e.target.value)
                }
              />
            </div>

            {/* Inclusions / Description */}
            <div>
              <label className="label">Inclusions / Description</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Exterior day renders (3)"
                value={row.description || ''}
                onChange={(e) =>
                  updateStage(row.id, 'description', e.target.value)
                }
              />
            </div>

            {/* Days */}
            <div>
              <label className="label">Days</label>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="e.g. 6"
                value={row.days || ''}
                onChange={(e) =>
                  updateStage(row.id, 'days', e.target.value)
                }
              />
            </div>

            {/* Delete */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => removeStage(row.id)}
                title="Remove stage"
                style={{ padding: '0.5rem', minWidth: 'auto' }}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Bottom helper text */}
      <p className="muted" style={{ marginTop: '0.5rem' }}>
        Add stages, detailed inclusions and expected days; they will appear in
        the invoice under billing.
      </p>
    </div>
  );
}
