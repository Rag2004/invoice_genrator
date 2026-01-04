import React from 'react';

export default function ScopeDetails({ invoice, updateInvoice }) {
  const stages = invoice.stages || [];

  const addStage = () => {
    const id = Date.now();
    const newStage = {
      id,
      stage: `Stage ${stages.length + 1}`,
      percentage: '',
      days: '',
      subStages: [
        { id: `${id}_1`, label: 'Concept Design' },
      ],
    };
    updateInvoice({ stages: [...stages, newStage] });
  };

  const removeStage = (id) => {
    const updated = stages.filter((s) => s.id !== id);
    updateInvoice({ stages: updated });
  };

  const updateStageField = (id, field, value) => {
    const updated = stages.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    updateInvoice({ stages: updated });
  };

  const addSubStage = (stageId) => {
    const updated = stages.map((stage) => {
      if (stage.id !== stageId) return stage;
      const subStages = stage.subStages || [];
      const newId = `${stageId}_${subStages.length + 1}`;
      return {
        ...stage,
        subStages: [
          ...subStages,
          { id: newId, label: `Task ${subStages.length + 1}` },
        ],
      };
    });
    updateInvoice({ stages: updated });
  };

  const updateSubStage = (stageId, subId, field, value) => {
    const updated = stages.map((stage) => {
      if (stage.id !== stageId) return stage;
      const subStages = (stage.subStages || []).map((sub) =>
        String(sub.id) === String(subId) ? { ...sub, [field]: value } : sub
      );
      return { ...stage, subStages };
    });
    updateInvoice({ stages: updated });
  };

  const removeSubStage = (stageId, subId) => {
    const updated = stages.map((stage) => {
      if (stage.id !== stageId) return stage;
      const filtered = (stage.subStages || []).filter(
        (sub) => String(sub.id) !== String(subId)
      );
      return { ...stage, subStages: filtered };
    });
    updateInvoice({ stages: updated });
  };

  const totalDays = stages.reduce(
    (sum, s) => sum + (Number(s.days || 0) || 0),
    0
  );

  return (
    <div className="scope-section">
      <div className="work-section-header">
        <div className="work-section-title-block">
          <h3 className="work-section-title">Stages &amp; Sub-Stages</h3>
          <p className="work-section-subtitle">
            Configure stages (e.g. “Stage 1 – 30%”) and sub-stages
            (Concept Design, Final Design, GFCs, etc.). These become columns in
            the Team table above.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={addStage}
        >
          + Add Stage
        </button>
      </div>

      {stages.length === 0 && (
        <div className="work-empty-hint">
          No stages added yet. Click <strong>+ Add Stage</strong> to create one.
        </div>
      )}

      {stages.map((stage) => (
        <div key={stage.id} className="card mb-2" style={{ padding: '16px' }}>
          {/* Stage header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.3fr 1fr 1fr 40px',
              gap: '12px',
              alignItems: 'flex-end',
              marginBottom: '10px',
            }}
          >
            <div>
              <label className="label">Stage Title</label>
              <input
                className="input"
                type="text"
                placeholder="Stage 1 - 30%"
                value={stage.stage || ''}
                onChange={(e) =>
                  updateStageField(stage.id, 'stage', e.target.value)
                }
              />
            </div>

            <div>
              <label className="label">Percentage (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="30%"
                value={stage.percentage || ''}
                onChange={(e) =>
                  updateStageField(stage.id, 'percentage', e.target.value)
                }
              />
            </div>

            <div>
              <label className="label">Days (optional)</label>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={stage.days || ''}
                onChange={(e) =>
                  updateStageField(stage.id, 'days', e.target.value)
                }
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => removeStage(stage.id)}
                title="Remove entire stage"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Sub-stages table */}
          <div className="work-table-wrapper" style={{ boxShadow: 'none' }}>
            <table className="work-table">
              <thead>
                <tr>
                  <th>Sub-Stage / Task</th>
                  <th style={{ width: '40px' }} />
                </tr>
              </thead>
              <tbody>
                {(stage.subStages || []).map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <input
                        className="input"
                        type="text"
                        placeholder="Concept Design"
                        value={sub.label || ''}
                        onChange={(e) =>
                          updateSubStage(
                            stage.id,
                            sub.id,
                            'label',
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="work-cell-icon">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => removeSubStage(stage.id, sub.id)}
                        title="Remove sub-stage"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="btn btn-ghost btn-sm mt-2"
            type="button"
            onClick={() => addSubStage(stage.id)}
          >
            + Add Sub-Stage
          </button>
        </div>
      ))}

      <div className="scope-footer">
        <p className="muted">
          Stages and sub-stages define how hours are distributed in the table
          above. You can keep days &amp; percentage for internal planning.
        </p>
        {stages.length > 0 && (
          <div className="scope-total-days">
            <span className="scope-total-label">Total Days (all stages):</span>
            <span className="scope-total-value">{totalDays}</span>
          </div>
        )}
      </div>
    </div>
  );
}
