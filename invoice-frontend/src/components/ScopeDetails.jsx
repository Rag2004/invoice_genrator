import React from 'react';

export default function ScopeDetails({ invoice, updateInvoice }) {
  const stages = invoice.stages || [];

  const addStage = () => {
    const id = Date.now();
    const newStage = {
      id,
      stage: '',
      percentage: '',
      days: '',
      subStages: [
        { id: `${id}_1`, label: 'Task 1' },
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
      const nextNum = subStages.length + 1;
      const newId = `${stageId}_${Date.now()}`;
      return {
        ...stage,
        subStages: [
          ...subStages,
          { id: newId, label: `Task ${nextNum}` },
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
      // Auto-renumber: update labels to Task 1, Task 2, Task 3, ...
      const renumbered = filtered.map((sub, idx) => {
        // Only renumber if label matches the "Task N" pattern
        const isDefaultLabel = /^Task \d+$/.test(sub.label || '');
        return {
          ...sub,
          label: isDefaultLabel ? `Task ${idx + 1}` : sub.label,
        };
      });
      return { ...stage, subStages: renumbered };
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
            Define stages and tasks. These become columns in the billing table.
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

      {stages.map((stage, stageIdx) => (
        <div key={stage.id} className="stage-card">
          {/* Compact stage header */}
          <div className="stage-header-row">
            <span className="stage-number">{stageIdx + 1}</span>
            <input
              className="stage-title-input"
              type="text"
              placeholder="Stage title"
              value={stage.stage || ''}
              onChange={(e) =>
                updateStageField(stage.id, 'stage', e.target.value)
              }
            />
            <input
              className="stage-meta-input"
              type="text"
              placeholder="Perce"
              value={stage.percentage || ''}
              onChange={(e) =>
                updateStageField(stage.id, 'percentage', e.target.value)
              }
            />
            <input
              className="stage-meta-input"
              type="text"
              placeholder="Days"
              value={stage.days || ''}
              onChange={(e) =>
                updateStageField(stage.id, 'days', e.target.value)
              }
            />
            <button
              className="stage-delete-btn"
              type="button"
              onClick={() => removeStage(stage.id)}
              title="Remove stage"
            >
              🗑️
            </button>
          </div>

          {/* Task chips */}
          <div className="task-chips-row">
            {(stage.subStages || []).map((sub, subIdx) => (
              <div key={sub.id} className="task-chip">
                <span className="task-chip-number">{subIdx + 1}</span>
                <input
                  className="task-chip-input"
                  type="text"
                  placeholder={`Task ${subIdx + 1}`}
                  value={sub.label || ''}
                  onChange={(e) =>
                    updateSubStage(stage.id, sub.id, 'label', e.target.value)
                  }
                />
                <button
                  className="task-chip-remove"
                  type="button"
                  onClick={() => removeSubStage(stage.id, sub.id)}
                  title="Remove task"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="task-add-btn"
              type="button"
              onClick={() => addSubStage(stage.id)}
            >
              + Add
            </button>
          </div>
        </div>
      ))}

      {stages.length > 0 && (
        <div className="scope-footer">
          <div className="scope-total-days">
            <span className="scope-total-label">Total Days:</span>
            <span className="scope-total-value">{totalDays}</span>
          </div>
        </div>
      )}
    </div>
  );
}
