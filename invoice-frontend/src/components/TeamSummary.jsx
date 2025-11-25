
import React, { useEffect } from 'react';

/**
 * Build a copy of stages where each subStage has:
 *   subStage.hoursByMember = { "Member Name": hours, ... }
 * based on items[*].stageHours (stageId -> subId -> value).
 */
function buildStagesWithMemberHours(stages, items) {
  if (!Array.isArray(stages) || !stages.length) return stages || [];

  const hoursMapByStageSub = {};

  (items || []).forEach((item) => {
    const memberName = item.name;
    const stageHours = item.stageHours || {};

    Object.entries(stageHours).forEach(([stageId, subMap]) => {
      Object.entries(subMap || {}).forEach(([subId, v]) => {
        const val = Number(v || 0);
        if (!val) return; // ignore 0 / empty

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
}) {
  // ================= BASIC SETUP =================
  const consultationModes = [
    'Online | Face-Time',
    'Online | Studio-Time',
    'Offline | Face-Time',
    'Offline | Studio-Time',
  ];

  // Normalized stages with subStages array
  const stages = (invoice.stages || []).map((s) => ({
    ...s,
    subStages:
      Array.isArray(s.subStages) && s.subStages.length
        ? s.subStages
        : [{ id: `${s.id || 'stage'}_1`, label: s.stage || 'Task' }],
  }));

  const hasStages = stages.length > 0;
  const totalStageColumns = hasStages
    ? stages.reduce(
        (sum, st) => sum + (st.subStages ? st.subStages.length : 1),
        0
      )
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

  // ================= TEAM MEMBER OPS =================

  const addTeamMember = () => {
    const firstMember = teamOptions[0];
    const factor = firstMember?.baseFactor || 1;
    const rate = Math.round(baseHourlyRate * factor);

    const stageHours = {};
    stages.forEach((st) => {
      const sid = String(st.id);
      stageHours[sid] = {};
      (st.subStages || []).forEach((sub) => {
        stageHours[sid][String(sub.id)] = 0;
      });
    });

    const totalHours = calcTotalHoursFromMap(stageHours);
    const amount = Math.round(rate * totalHours * 100) / 100;

    const newItem = {
      id: Date.now(),
      name: firstMember?.name || 'Studio Team',
      mode: consultationModes[0] || 'Online | Face-Time',
      factor,
      rate,
      hours: totalHours,
      amount,
      stageHours,
      userEditedRate: false,
    };

    updateInvoice({
      items: [...(invoice.items || []), newItem],
    });
  };

  const removeTeamMember = (id) => {
    const items = invoice.items || [];
    if (items.length <= 1) return;
    const remaining = items.filter((item) => item.id !== id);
    updateInvoice((prev) => ({
      ...prev,
      items: remaining,
      stages: buildStagesWithMemberHours(prev.stages || [], remaining),
    }));
  };

  // When stages change, align each item's stageHours with them
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
            subMap[subId] = 0;
            localChanged = true;
          }
        });

        // remove any subStage ids that no longer exist
        Object.keys(subMap).forEach((subId) => {
          const stillThere = (st.subStages || []).some(
            (sub) => String(sub.id) === subId
          );
          if (!stillThere) {
            delete subMap[subId];
            localChanged = true;
          }
        });

        stageHours[sid] = subMap;
      });

      // remove stage ids that no longer exist
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
      const rate = Math.round(baseHourlyRate * factor);
      const amount = Math.round(rate * totalHours * 100) / 100;

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
      // also refresh hoursByMember on stages
      updateInvoice((prev) => ({
        ...prev,
        items: updatedItems,
        stages: buildStagesWithMemberHours(prev.stages || [], updatedItems),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.stages]);

  // Update member (ONLY name, mode)
  const updateTeamMember = (id, field, value) => {
    updateInvoice((prev) => {
      const items = prev.items || [];

      const updatedItems = items.map((item) => {
        if (item.id !== id) return item;

        const next = { ...item, [field]: value };
        let factor = next.factor || 1;

        if (field === 'name') {
          const member = teamOptions.find((m) => m.name === value);
          factor = member?.baseFactor || 1;
          next.factor = factor;
        }

        factor = next.factor || 1;
        const rate = Math.round(baseHourlyRate * factor);
        const stageHours = next.stageHours || {};
        const totalHours = calcTotalHoursFromMap(stageHours);
        const amount = Math.round(rate * totalHours * 100) / 100;

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

  // Editing hours in a specific sub-stage cell
  const updateStageHours = (itemId, stageId, subId, rawValue) => {
    const val = rawValue === '' ? '' : Number(rawValue) || 0;

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
        const rate = Math.round(baseHourlyRate * factor);
        const amount = Math.round(rate * totalHours * 100) / 100;

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

  // Initialize with one member
  useEffect(() => {
    if ((!invoice.items || invoice.items.length === 0) && teamOptions.length > 0) {
      addTeamMember();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamOptions]);

  // Recalculate rates when baseHourlyRate changes
  useEffect(() => {
    const items = invoice.items || [];
    if (!items.length) return;

    const updatedItems = items.map((item) => {
      const factor = item.factor || 1;
      const rate = Math.round(baseHourlyRate * factor);
      const hours = Number(item.hours || 0);
      const amount = Math.round(rate * hours * 100) / 100;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseHourlyRate]);

  const items = invoice.items || [];

  // ================= STAGE EDITOR OPS =================

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
      const filtered = (stage.subStages || []).filter(
        (sub) => String(sub.id) !== String(subId)
      );
      return { ...stage, subStages: filtered };
    });
    updateInvoice({ stages: updated });
  };

  const totalDays = (invoice.stages || []).reduce(
    (sum, s) => sum + (Number(s.days || 0) || 0),
    0
  );

  const stageHeaderTitle = (stage) => {
    const base = stage.stage || 'Stage';
    const pct = (stage.percentage || '').toString().trim();
    if (!pct) return base;
    const hasPercent = pct.includes('%');
    return `${base} - ${hasPercent ? pct : `${pct}%`}`;
  };

  // ================= RENDER =================

  return (
    <div className="work-section">
      {/* ================= STAGE CONFIG (TABLE-LIKE) ================= */}
      <div className="scope-section" style={{ marginBottom: '24px' }}>
        <div className="work-section-header">
          <div className="work-section-title-block">
            <h3 className="work-section-title">Stage Groups &amp; Sub-Stages</h3>
            <p className="work-section-subtitle">
              Configure stages (e.g. &quot;Stage 1 – 30%&quot;) and their sub-stages
              like Concept Design, Final Design, GFCs, Execution, etc.
              These become the columns in the table below.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={addStage}
          >
            + Add Stage
          </button>
        </div>

        {/* Header row – table style */}
        {(invoice.stages || []).length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 0.9fr 0.9fr 3fr 40px',
              gap: '8px',
              padding: '10px 14px',
              marginBottom: '4px',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--gray-600)',
              background: 'var(--gray-50)',
              borderRadius: '0.75rem',
              border: '1px solid var(--gray-200)',
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

        {/* One row per stage */}
        {(invoice.stages || []).map((stage) => (
          <div
            key={stage.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 0.9fr 0.9fr 3fr 40px',
              gap: '8px',
              alignItems: 'center',
              padding: '10px 14px',
              marginBottom: '6px',
              borderRadius: '0.75rem',
              border: '1px solid var(--gray-200)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Stage Title */}
            <div>
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

            {/* Percentage */}
            <div>
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

            {/* Days */}
            <div>
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

            {/* Sub-stages: single horizontal row with scroll */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'stretch',
                overflowX: 'auto',
                padding: '2px 0',
              }}
            >
              {(stage.subStages || []).map((sub) => (
                <div
                  key={sub.id}
                  className="substage-chip"
                  style={{
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                    flex: '0 0 180px',
                  }}
                >
                  <input
                    className="input"
                    type="text"
                    placeholder="Task"
                    value={sub.label || ''}
                    onChange={(e) =>
                      updateSubStage(stage.id, sub.id, e.target.value)
                    }
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => removeSubStage(stage.id, sub.id)}
                    title="Remove sub-stage"
                    style={{ paddingInline: '8px' }}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => addSubStage(stage.id)}
              >
                + Add Sub-Stage
              </button>
            </div>

            {/* Delete stage */}
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
        ))}

        {(invoice.stages || []).length > 0 && (
          <div className="scope-footer">
            <p className="muted">
              Stages and sub-stages define how hours are distributed in the table
              below. Days and percentage are for planning only.
            </p>
            <div className="scope-total-days">
              <span className="scope-total-label">Total Days (all stages):</span>
              <span className="scope-total-value">{totalDays}</span>
            </div>
          </div>
        )}
      </div>

      {/* ================= TEAM & STAGES TABLE ================= */}
      <div>
        <div className="work-section-header">
          <div className="work-section-title-block">
            <h3 className="work-section-title">Team &amp; Stages Table</h3>
            <p className="work-section-subtitle">
              Enter hours for each sub-stage per team member. Factors &amp; rates
              are pulled from the sheet; totals are calculated automatically.
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={addTeamMember}
            disabled={loadingTeam || teamOptions.length === 0}
          >
            + Add Member
          </button>
        </div>

        {loadingTeam && (
          <div className="work-loading">Loading team members...</div>
        )}

        {!loadingTeam && items.length === 0 && (
          <div className="work-empty-hint">
            No team members added yet. Click <strong>+ Add Member</strong> to start.
          </div>
        )}

        {!loadingTeam && items.length > 0 && (
          <div className="work-table-wrapper work-table-wrapper-main">
            <table className="work-table work-table-main">
              <thead>
                <tr>
                  <th className="work-th-main" rowSpan={hasStages ? 3 : 1}>
                    Team Member
                  </th>
                  <th className="work-th-main" rowSpan={hasStages ? 3 : 1}>
                    Consultation Mode
                  </th>

                  {hasStages && (
                    <th
                      className="work-th-hours-band"
                      colSpan={totalStageColumns}
                    >
                      HOURS
                    </th>
                  )}

                  <th className="work-th-main" rowSpan={hasStages ? 3 : 1}>
                    {hasStages ? 'Total Hours' : 'Hours'}
                  </th>
                  <th className="work-th-main" rowSpan={hasStages ? 3 : 1}>
                    Factor
                  </th>
                  <th className="work-th-main" rowSpan={hasStages ? 3 : 1}>
                    Rate (₹/hr)
                  </th>
                  <th className="work-th-main" rowSpan={hasStages ? 3 : 1}>
                    Price (₹)
                  </th>
                  <th
                    className="work-th-main work-th-icon"
                    rowSpan={hasStages ? 3 : 1}
                  />
                </tr>

                {hasStages && (
                  <tr>
                    {stages.map((st) => {
                      const sub = st.subStages || [];
                      const span = sub.length || 1;
                      return (
                        <th
                          key={`stage-${st.id}`}
                          colSpan={span}
                          className="work-th-stage-group"
                        >
                          {stageHeaderTitle(st)}
                        </th>
                      );
                    })}
                  </tr>
                )}

                {hasStages && (
                  <tr>
                    {stages.map((st) => {
                      const sub = st.subStages || [];
                      if (sub.length === 0) {
                        return (
                          <th
                            key={`sub-${st.id}`}
                            className="work-th-substage"
                          >
                            {st.stage || 'Task'}
                          </th>
                        );
                      }
                      return sub.map((subStage) => (
                        <th
                          key={`sub-${subStage.id}`}
                          className="work-th-substage"
                        >
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
                  const totalHours = hasStages
                    ? calcTotalHoursFromMap(stageHours)
                    : Number(item.hours || 0);

                  return (
                    <tr key={item.id}>
                      {/* Team member */}
                      <td>
                        <select
                          className="input"
                          value={item.name}
                          onChange={(e) =>
                            updateTeamMember(item.id, 'name', e.target.value)
                          }
                        >
                          {teamOptions.map((opt) => (
                            <option key={opt.id} value={opt.name}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Mode */}
                      <td>
                        <select
                          className="input"
                          value={item.mode}
                          onChange={(e) =>
                            updateTeamMember(item.id, 'mode', e.target.value)
                          }
                        >
                          {consultationModes.map((mode) => (
                            <option key={mode} value={mode}>
                              {mode}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Hours per sub-stage – ONLY editable fields in row */}
                      {hasStages &&
                        stages.map((st) => {
                          const sid = String(st.id);
                          const subMap = stageHours[sid] || {};
                          const sub = st.subStages || [];

                          if (sub.length === 0) {
                            return (
                              <td
                                key={`${item.id}-${sid}`}
                                className="work-cell-narrow"
                              >
                                <input
                                  type="number"
                                  className="input"
                                  min="0"
                                  step="0.5"
                                  value={subMap['__single'] ?? 0}
                                  onChange={(e) =>
                                    updateStageHours(
                                      item.id,
                                      st.id,
                                      '__single',
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                            );
                          }

                          return sub.map((subStage) => {
                            const subId = String(subStage.id);
                            return (
                              <td
                                key={`${item.id}-${sid}-${subId}`}
                                className="work-cell-narrow"
                              >
                                <input
                                  type="number"
                                  className="input"
                                  min="0"
                                  step="0.5"
                                  value={
                                    subMap[subId] === undefined
                                      ? ''
                                      : subMap[subId]
                                  }
                                  onChange={(e) =>
                                    updateStageHours(
                                      item.id,
                                      st.id,
                                      subStage.id,
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                            );
                          });
                        })}

                      {/* Total Hours (read-only) */}
                      <td className="work-cell-narrow work-cell-hours">
                        <input
                          type="text"
                          className="input input-readonly"
                          readOnly
                          value={totalHours}
                        />
                      </td>

                      {/* Factor (read-only, from sheet) */}
                      <td className="work-cell-narrow work-cell-factor">
                        <input
                          type="text"
                          className="input input-readonly"
                          readOnly
                          value={item.factor ?? 1}
                          title="Auto-filled from TeamMembers sheet"
                        />
                      </td>

                      {/* Rate (read-only, baseHourlyRate × factor) */}
                      <td className="work-cell-narrow work-cell-rate">
                        <input
                          type="text"
                          className="input input-readonly"
                          readOnly
                          value={item.rate ?? ''}
                          title="Auto-calculated from Base Hourly Rate × Factor"
                        />
                      </td>

                      {/* Price (read-only) */}
                      <td className="work-cell-narrow work-cell-price">
                        <input
                          type="text"
                          className="input input-readonly"
                          readOnly
                          value={
                            '₹' +
                            Number(item.amount || 0).toLocaleString('en-IN')
                          }
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

        <div className="work-info-strip">
          <strong>ℹ️ Rate Calculation:</strong> Rate = Base Hourly Rate (₹
          {baseHourlyRate.toLocaleString('en-IN')}) × Factor
          <br />
          <span className="work-info-note">
            Factor is fetched from the TeamMembers sheet and cannot be edited here.
          </span>
        </div>
      </div>
    </div>
  );
}
