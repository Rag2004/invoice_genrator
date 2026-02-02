
import React, { useEffect } from 'react';

function buildStagesWithMemberHours(stages, items) {
  if (!Array.isArray(stages) || !stages.length) return stages || [];

  const hoursMapByStageSub = {};

  (items || []).forEach((item) => {
    const memberName = item.name;
    const stageHours = item.stageHours || {};

    Object.entries(stageHours).forEach(([stageId, subMap]) => {
      Object.entries(subMap || {}).forEach(([subId, v]) => {
        const val = Number(v || 0);
        if (!val) return;

        const key = `${stageId}__${subId}`;
        if (!hoursMapByStageSub[key]) {
          hoursMapByStageSub[key] = {};
        }
        hoursMapByStageSub[key][memberName] = val;
      });
    });
  });

  return stages.map((stage) => {
    const sid = String(stage.id);
    const subStages = (stage.subStages || []).map((sub) => {
      const subId = String(sub.id);
      const key = `${sid}__${subId}`;
      const hoursByMember = hoursMapByStageSub[key] || {};
      return { ...sub, hoursByMember };
    });
    return { ...stage, subStages };
  });
}

export default function TeamSummary({
  invoice,
  updateInvoice,
  teamOptions,
  loadingTeam,
  baseHourlyRate,
  showOnlyStages = false,  // NEW: Show only stages section
  showOnlyTable = false,   // NEW: Show only table section
}) {
  const consultationModes = [
    'Online | Face-Time',
    'Online | Studio-Time',
    'Offline | Face-Time',
    'Offline | Studio-Time',
  ];

  const stages = (invoice.stages || []).map((s, stageIndex) => ({
    ...s,
    id: s.id || `stage_${stageIndex}`,
    subStages:
      Array.isArray(s.subStages) && s.subStages.length
        ? s.subStages.map((sub, subIndex) => ({
          ...sub,
          id: sub.id || `${s.id || stageIndex}_sub_${subIndex}`
        }))
        : [{ id: `${s.id || stageIndex}_sub_0`, label: s.stage || 'Task' }],
  }));

  const hasStages = stages.length > 0;
  const totalStageColumns = hasStages
    ? stages.reduce((sum, st) => sum + (st.subStages ? st.subStages.length : 1), 0)
    : 0;

  const calcTotalHoursFromMap = (stageHours = {}) => {
    let total = 0;
    Object.values(stageHours).forEach((subMap) => {
      if (!subMap) return;
      Object.values(subMap).forEach((v) => {
        total += Number(v) || 0;
      });
    });
    return total;
  };

  const addTeamMember = () => {

    if (!teamOptions || teamOptions.length === 0) {
      console.error('❌ Cannot add team member: teamOptions is empty');
      alert('⚠️ Team members not loaded yet. Please wait or refresh the page.');
      return;
    }

    const firstMember = teamOptions[0];
    if (!firstMember) {
      console.error('❌ Cannot add team member: firstMember is undefined');
      return;
    }

    const factor = Number(firstMember?.baseFactor || firstMember?.factor || 1);
    const rate = Math.round((baseHourlyRate || 0) * factor);

    const stageHours = {};
    stages.forEach((st) => {
      const sid = String(st.id);
      stageHours[sid] = {};
      (st.subStages || []).forEach((sub) => {
        stageHours[sid][String(sub.id)] = '';
      });
    });

    const totalHours = calcTotalHoursFromMap(stageHours);
    const amount = Math.round(rate * totalHours);

    const newItem = {
      id: Date.now(),
      memberId: firstMember.id,
      name: firstMember.name || 'Studio Team',
      mode: consultationModes[0] || 'Online | Face-Time',
      factor,
      rate,
      hours: totalHours,
      amount,
      stageHours,
      userEditedRate: false,
    };

    updateInvoice((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
  };

  const removeTeamMember = (id) => {
    const items = invoice.items || [];
    if (items.length <= 1) {
      alert('⚠️ At least one team member is required');
      return;
    }
    const remaining = items.filter((item) => item.id !== id);
    updateInvoice((prev) => ({
      ...prev,
      items: remaining,
      stages: buildStagesWithMemberHours(prev.stages || [], remaining),
    }));
  };

  useEffect(() => {
    const items = invoice.items || [];
    if (!items.length) return;

    let changed = false;

    const updatedItems = items.map((item) => {
      let stageHours = { ...(item.stageHours || {}) };
      let localChanged = false;

      stages.forEach((st) => {
        const sid = String(st.id);
        if (!stageHours[sid]) {
          stageHours[sid] = {};
          localChanged = true;
        }
        const subMap = { ...(stageHours[sid] || {}) };

        (st.subStages || []).forEach((sub) => {
          const subId = String(sub.id);
          if (subMap[subId] === undefined) {
            subMap[subId] = '';
            localChanged = true;
          }
        });

        Object.keys(subMap).forEach((subId) => {
          const stillThere = (st.subStages || []).some((sub) => String(sub.id) === subId);
          if (!stillThere) {
            delete subMap[subId];
            localChanged = true;
          }
        });

        stageHours[sid] = subMap;
      });

      Object.keys(stageHours).forEach((sid) => {
        const stillThere = stages.some((st) => String(st.id) === sid);
        if (!stillThere) {
          delete stageHours[sid];
          localChanged = true;
        }
      });

      if (!localChanged) return item;

      changed = true;

      const totalHours = calcTotalHoursFromMap(stageHours);
      const factor = item.factor || 1;
      const rate = Math.round((baseHourlyRate || 0) * factor);
      const amount = Math.round(rate * totalHours);

      return {
        ...item,
        stageHours,
        hours: totalHours,
        rate,
        amount,
        userEditedRate: false,
      };
    });

    if (changed) {
      updateInvoice((prev) => ({
        ...prev,
        items: updatedItems,
        stages: buildStagesWithMemberHours(prev.stages || [], updatedItems),
      }));
    }
  }, [invoice.stages, baseHourlyRate]);

  const updateTeamMember = (id, field, value) => {

    updateInvoice((prev) => {
      const items = prev.items || [];

      const updatedItems = items.map((item) => {
        if (item.id !== id) return item;

        const next = { ...item, [field]: value };

        if (field === 'name') {
          const member = teamOptions.find((m) => m.name === value);

          if (member) {
            const factor = member.baseFactor || member.factor || 1;
            next.factor = factor;
            next.memberId = member.id;

            const rate = Math.round((baseHourlyRate || 0) * factor);
            const stageHours = next.stageHours || {};
            const totalHours = calcTotalHoursFromMap(stageHours);
            const amount = Math.round(rate * totalHours);

            return {
              ...next,
              rate,
              hours: totalHours,
              amount,
              userEditedRate: false,
            };
          }
        }

        const factor = next.factor || 1;
        const rate = Math.round((baseHourlyRate || 0) * factor);
        const stageHours = next.stageHours || {};
        const totalHours = calcTotalHoursFromMap(stageHours);
        const amount = Math.round(rate * totalHours);

        return {
          ...next,
          hours: totalHours,
          rate,
          amount,
          userEditedRate: false,
        };
      });

      return {
        ...prev,
        items: updatedItems,
        stages: buildStagesWithMemberHours(prev.stages || [], updatedItems),
      };
    });
  };

  const updateStageHours = (itemId, stageId, subId, rawValue) => {
    const val = rawValue === '' ? '' : Number(rawValue);

    updateInvoice((prev) => {
      const items = prev.items || [];
      const stagesPrev = prev.stages || [];

      const updatedItems = items.map((item) => {
        if (item.id !== itemId) return item;

        const sid = String(stageId);
        const subKey = String(subId);
        const stageHours = { ...(item.stageHours || {}) };
        const subMap = { ...(stageHours[sid] || {}) };

        subMap[subKey] = val;
        stageHours[sid] = subMap;

        const totalHours = calcTotalHoursFromMap(stageHours);
        const factor = item.factor || 1;
        const rate = Math.round((baseHourlyRate || 0) * factor);
        const amount = Math.round(rate * totalHours);

        return {
          ...item,
          stageHours,
          hours: totalHours,
          rate,
          amount,
          userEditedRate: false,
        };
      });

      return {
        ...prev,
        items: updatedItems,
        stages: buildStagesWithMemberHours(stagesPrev, updatedItems),
      };
    });
  };

  // useEffect(() => {
  //     itemsCount: invoice.items?.length || 0,
  //     teamOptionsCount: teamOptions.length,
  //     baseHourlyRate,
  //     loadingTeam
  //   });

  //   if (
  //     !loadingTeam &&
  //     (!invoice.items || invoice.items.length === 0) &&
  //     teamOptions.length > 0 &&
  //     baseHourlyRate > 0
  //   ) {
  //     addTeamMember();
  //   }
  // }, [teamOptions, baseHourlyRate, loadingTeam]);

  useEffect(() => {
    const items = invoice.items || [];
    if (!items.length || !baseHourlyRate) return;

    const updatedItems = items.map((item) => {
      const factor = item.factor || 1;
      const rate = Math.round(baseHourlyRate * factor);
      const hours = Number(item.hours || 0);
      const amount = Math.round(rate * hours);

      return {
        ...item,
        rate,
        amount,
        userEditedRate: false,
      };
    });

    updateInvoice((prev) => ({
      ...prev,
      items: updatedItems,
      stages: buildStagesWithMemberHours(prev.stages || [], updatedItems),
    }));
  }, [baseHourlyRate]);

  const items = invoice.items || [];

  const addStage = () => {
    const id = Date.now();
    const newStage = {
      id,
      stage: `Stage ${stages.length + 1}`,
      percentage: '',
      days: '',
      subStages: [{ id: `${id}_1`, label: 'Task 1' }],
    };
    updateInvoice({
      stages: [...(invoice.stages || []), newStage],
    });
  };

  const removeStage = (id) => {
    const updated = (invoice.stages || []).filter((s) => s.id !== id);
    updateInvoice({ stages: updated });
  };

  const updateStageField = (id, field, value) => {
    // Validate percentage field
    if (field === 'percentage') {
      // Extract numeric value from percentage string
      const numericValue = parseFloat(value.replace('%', '')) || 0;

      // Calculate total percentage excluding current stage
      const otherStagesTotal = (invoice.stages || [])
        .filter((s) => s.id !== id)
        .reduce((sum, s) => {
          const pct = parseFloat((s.percentage || '').toString().replace('%', '')) || 0;
          return sum + pct;
        }, 0);

      // Check if total would exceed 100%
      if (otherStagesTotal + numericValue > 100) {
        alert(`⚠️ Total percentage cannot exceed 100%.\n\nCurrent total of other stages: ${otherStagesTotal}%\nMaximum allowed for this stage: ${100 - otherStagesTotal}%`);
        return;
      }
    }

    const updated = (invoice.stages || []).map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    updateInvoice({ stages: updated });
  };

  const addSubStage = (stageId) => {
    const updated = (invoice.stages || []).map((stage) => {
      if (stage.id !== stageId) return stage;
      const subStages = stage.subStages || [];
      const newId = `${stageId}_${subStages.length + 1}`;
      return {
        ...stage,
        subStages: [...subStages, { id: newId, label: `Task ${subStages.length + 1}` }],
      };
    });
    updateInvoice({ stages: updated });
  };

  const updateSubStage = (stageId, subId, value) => {
    const updated = (invoice.stages || []).map((stage) => {
      if (stage.id !== stageId) return stage;
      const subStages = (stage.subStages || []).map((sub) =>
        String(sub.id) === String(subId) ? { ...sub, label: value } : sub
      );
      return { ...stage, subStages };
    });
    updateInvoice({ stages: updated });
  };

  const removeSubStage = (stageId, subId) => {
    const updated = (invoice.stages || []).map((stage) => {
      if (stage.id !== stageId) return stage;
      const filtered = (stage.subStages || []).filter((sub) => String(sub.id) !== String(subId));
      return { ...stage, subStages: filtered };
    });
    updateInvoice({ stages: updated });
  };

  const totalDays = (invoice.stages || []).reduce((sum, s) => sum + (Number(s.days || 0) || 0), 0);

  const totalPercentage = (invoice.stages || []).reduce((sum, s) => {
    const pct = parseFloat((s.percentage || '').toString().replace('%', '')) || 0;
    return sum + pct;
  }, 0);

  const stageHeaderTitle = (stage) => {
    const base = stage.stage || 'Stage';
    const pct = (stage.percentage || '').toString().trim();
    if (!pct) return base;
    const hasPercent = pct.includes('%');
    return `${base} - ${hasPercent ? pct : `${pct}%`}`;
  };

  return (
    <div className="work-section">
      {/* ========== STAGES CONFIGURATION SECTION ========== */}
      {!showOnlyTable && (
        <div className="scope-section" style={{ marginBottom: showOnlyStages ? 0 : '24px' }}>
          <div className="work-section-header">
            <div className="work-section-title-block">
              <h3 className="work-section-title">Stage Groups &amp; Sub-Stages</h3>
              <p className="work-section-subtitle">
                Configure stages (e.g. "Stage 1 – 30%") and their sub-stages. These become the columns in the table below.
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={addStage}>
              + Add Stage
            </button>
          </div>

          {/* Scrollable container for stages */}
          <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
            {/* Calculate min-width based on number of sub-stages */}
            <div style={{ minWidth: 'max-content' }}>
              {(invoice.stages || []).length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 100px 80px 1fr 50px',
                    gap: '12px',
                    padding: '10px 14px',
                    marginBottom: '4px',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--gray-600)',
                    background: 'var(--gray-50)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--gray-200)',
                    minWidth: '600px',
                  }}
                >
                  <div>Stage Title</div>
                  <div>Percentage</div>
                  <div>Days</div>
                  <div>Sub-Stage / Task</div>
                  <div></div>
                </div>
              )}

              {(invoice.stages || []).length === 0 && (
                <div className="work-empty-hint">
                  No stages added yet. Click <strong>+ Add Stage</strong> to create one.
                </div>
              )}

              {(invoice.stages || []).map((stage, stageIdx) => {
                const stageKey = stage.id || `stage-${stageIdx}`;
                return (
                  <div
                    key={stageKey}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 100px 80px 1fr 50px',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '10px 14px',
                      marginBottom: '6px',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--gray-200)',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-sm)',
                      minWidth: '600px',
                    }}
                  >
                    <div>
                      <input
                        className="input"
                        type="text"
                        placeholder="Stage 1"
                        value={stage.stage || ''}
                        onChange={(e) => updateStageField(stage.id, 'stage', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <input
                        className="input"
                        type="text"
                        placeholder="30%"
                        value={stage.percentage || ''}
                        onChange={(e) => updateStageField(stage.id, 'percentage', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        placeholder="e.g. 10"
                        value={stage.days || ''}
                        onChange={(e) => updateStageField(stage.id, 'days', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                      }}
                      className="substage-scroll"
                    >
                      {(stage.subStages || []).map((sub, subIdx) => (
                        <div
                          key={sub.id || `${stageKey}-sub-${subIdx}`}
                          className="substage-chip"
                          style={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                            flex: '0 0 auto',
                          }}
                        >
                          <input
                            className="input"
                            type="text"
                            placeholder="Task"
                            value={sub.label || ''}
                            onChange={(e) => updateSubStage(stage.id, sub.id, e.target.value)}
                            style={{ width: '80px' }}
                          />
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => removeSubStage(stage.id, sub.id)}
                            title="Remove sub-stage"
                            style={{ padding: '4px 6px', fontSize: '12px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => addSubStage(stage.id)}
                        style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}
                      >
                        + Add
                      </button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => removeStage(stage.id)}
                        title="Remove stage"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(invoice.stages || []).length > 0 && (
            <div className="scope-footer">
              <p className="muted">
                Stages and sub-stages define how hours are distributed in the table below.
              </p>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div className="scope-total-days">
                  <span className="scope-total-label">Total Percentage:</span>
                  <span
                    className="scope-total-value"
                    style={{
                      color: totalPercentage > 100 ? '#e53935' : totalPercentage === 100 ? '#4caf50' : '#f59e0b',
                      fontWeight: 600
                    }}
                  >
                    {totalPercentage}%
                    {totalPercentage > 100 && ' ⚠️'}
                    {totalPercentage === 100 && ' ✓'}
                  </span>
                </div>
                <div className="scope-total-days">
                  <span className="scope-total-label">Total Days (all stages):</span>
                  <span className="scope-total-value">{totalDays}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== BILLABLE HOURS TABLE SECTION ========== */}
      {!showOnlyStages && (
        <div>
          <div className="work-section-header">
            <div className="work-section-title-block">
              <h3 className="work-section-title">Billable Hours</h3>
              <p className="work-section-subtitle">
                Enter hours for each sub-stage per team member. Factors &amp; rates are calculated automatically.
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={addTeamMember}
              disabled={loadingTeam || teamOptions.length === 0}
            >
              {loadingTeam ? '⏳ Loading...' : '+ Add Member'}
            </button>
          </div>

          {loadingTeam && (
            <div className="work-loading" style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <div style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                border: '3px solid #e5e7eb',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '12px'
              }} />
              <div>Loading team members...</div>
            </div>
          )}

          {!loadingTeam && teamOptions.length === 0 && (
            <div className="work-empty-hint" style={{
              padding: '24px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#92400e'
            }}>
              ⚠️ <strong>No team members available.</strong> Please add team members in the system first.
            </div>
          )}

          {!loadingTeam && teamOptions.length > 0 && items.length === 0 && (
            <div className="work-empty-hint">
              No team members added yet. Click <strong>+ Add Member</strong> to start.
            </div>
          )}

          {!loadingTeam && items.length > 0 && (
            <div className="work-table-wrapper work-table-wrapper-main" style={{ overflowX: 'auto' }}>
              <table className="work-table work-table-main" style={{ minWidth: 'max-content' }}>
                <thead>
                  <tr>
                    <th className="work-th-main" rowSpan={hasStages ? 3 : 1} style={{ minWidth: '150px' }}>
                      Team Member
                    </th>
                    <th className="work-th-main" rowSpan={hasStages ? 3 : 1} style={{ minWidth: '120px' }}>
                      Consultation Mode
                    </th>
                    {hasStages && (
                      <th className="work-th-hours-band" colSpan={totalStageColumns}>
                        HOURS
                      </th>
                    )}
                    <th className="work-th-main" rowSpan={hasStages ? 3 : 1} style={{ minWidth: '70px' }}>
                      {hasStages ? 'Total Hours' : 'Hours'}
                    </th>
                    <th className="work-th-main" rowSpan={hasStages ? 3 : 1} style={{ minWidth: '60px' }}>
                      Factor
                    </th>
                    <th className="work-th-main" rowSpan={hasStages ? 3 : 1} style={{ minWidth: '80px' }}>
                      Rate (₹/hr)
                    </th>
                    <th className="work-th-main" rowSpan={hasStages ? 3 : 1} style={{ minWidth: '90px' }}>
                      Price (₹)
                    </th>
                    <th className="work-th-main work-th-icon" rowSpan={hasStages ? 3 : 1} style={{ minWidth: '40px' }} />
                  </tr>
                  {hasStages && (
                    <tr>
                      {stages.map((st, stIdx) => {
                        const sub = st.subStages || [];
                        const span = sub.length || 1;
                        return (
                          <th key={`stage-${st.id || stIdx}`} colSpan={span} className="work-th-stage-group" style={{ minWidth: `${span * 70}px` }}>
                            {stageHeaderTitle(st)}
                          </th>
                        );
                      })}
                    </tr>
                  )}
                  {hasStages && (
                    <tr>
                      {stages.map((st, stIdx) => {
                        const sub = st.subStages || [];
                        if (sub.length === 0) {
                          return (
                            <th key={`sub-${st.id || stIdx}`} className="work-th-substage" style={{ minWidth: '70px' }}>
                              {st.stage || 'Task'}
                            </th>
                          );
                        }
                        return sub.map((subStage, subIdx) => (
                          <th key={`sub-${subStage.id || `${st.id || stIdx}-${subIdx}`}`} className="work-th-substage" style={{ minWidth: '70px' }}>
                            {subStage.label || 'Task'}
                          </th>
                        ));
                      })}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {items.map((item) => {
                    const stageHours = item.stageHours || {};
                    const totalHours = hasStages ? calcTotalHoursFromMap(stageHours) : Number(item.hours || 0);

                    return (
                      <tr key={item.id}>
                        <td style={{ minWidth: '150px' }}>
                          <select
                            className="input"
                            value={item.name}
                            onChange={(e) => updateTeamMember(item.id, 'name', e.target.value)}
                            style={{ width: '100%', minWidth: '140px' }}
                          >
                            {teamOptions.map((opt, optIdx) => (
                              <option key={opt.id || `opt-${optIdx}`} value={opt.name}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: '120px' }}>
                          <select
                            className="input"
                            value={item.mode}
                            onChange={(e) => updateTeamMember(item.id, 'mode', e.target.value)}
                            style={{ width: '100%', minWidth: '110px' }}
                          >
                            {consultationModes.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </td>
                        {hasStages &&
                          stages.map((st) => {
                            const sid = String(st.id);
                            const subMap = stageHours[sid] || {};
                            const sub = st.subStages || [];

                            if (sub.length === 0) {
                              return (
                                <td key={`${item.id}-${sid}`} className="work-cell-narrow" style={{ minWidth: '70px' }}>
                                  <input
                                    type="number"
                                    className="input"
                                    min="0"
                                    step="0.5"
                                    value={subMap['__single'] ?? ''}
                                    onChange={(e) =>
                                      updateStageHours(item.id, st.id, '__single', e.target.value)
                                    }
                                    style={{ width: '60px', textAlign: 'center' }}
                                  />
                                </td>
                              );
                            }

                            return sub.map((subStage) => {
                              const subId = String(subStage.id);
                              return (
                                <td key={`${item.id}-${sid}-${subId}`} className="work-cell-narrow" style={{ minWidth: '70px' }}>
                                  <input
                                    type="number"
                                    className="input"
                                    min="0"
                                    step="0.5"
                                    placeholder="0"
                                    value={subMap[subId] ?? ''}
                                    onChange={(e) =>
                                      updateStageHours(item.id, st.id, subStage.id, e.target.value)
                                    }
                                    style={{ width: '60px', textAlign: 'center' }}
                                  />
                                </td>
                              );
                            });
                          })}
                        <td className="work-cell-narrow work-cell-hours" style={{ minWidth: '90px' }}>
                          <input type="text" className="input input-readonly" readOnly value={totalHours} style={{ width: '80px', textAlign: 'center' }} />
                        </td>
                        <td className="work-cell-narrow work-cell-factor" style={{ minWidth: '70px' }}>
                          <input
                            type="text"
                            className="input input-readonly"
                            readOnly
                            value={item.factor ?? 1}
                            title="Auto-filled from TeamMembers sheet"
                            style={{ width: '60px', textAlign: 'center' }}
                          />
                        </td>
                        <td className="work-cell-narrow work-cell-rate" style={{ minWidth: '100px' }}>
                          <input
                            type="text"
                            className="input input-readonly"
                            readOnly
                            value={item.rate ?? ''}
                            title="Auto-calculated from Base Hourly Rate × Factor"
                            style={{ width: '90px', textAlign: 'right' }}
                          />
                        </td>
                        <td className="work-cell-narrow work-cell-price" style={{ minWidth: '120px' }}>
                          <input
                            type="text"
                            className="input input-readonly"
                            readOnly
                            value={'₹' + Number(item.amount || 0).toLocaleString('en-IN')}
                            style={{ width: '110px', textAlign: 'right' }}
                          />
                        </td>
                        <td className="work-cell-icon">
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => removeTeamMember(item.id)}
                            disabled={items.length <= 1}
                            title="Remove member"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}