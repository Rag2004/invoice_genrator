// src/components/TeamSummary.jsx
import React, { useEffect, useState } from 'react';

const uuidv4 = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Default mode factors (fallback if not in team data)
const DEFAULT_MODE_FACTORS = {
  Online: 1.0,
  Offline: 1.5,
  Studio: 2.0,
};

export default function TeamSummary({ 
  invoice, 
  updateInvoice, 
  teamOptions = [], // Add default empty array
  loadingTeam = false, 
  baseHourlyRate = 0 
}) {
  const [selectedMemberData, setSelectedMemberData] = useState({});

  // Safely access invoice.items with default
  const items = invoice?.items || [];

  // Add new team member row
  const addRow = () => {
    const id = uuidv4();
    const item = {
      id,
      name: '',
      memberCode: '',
      factor: 1,
      mode: 'Online',
      hours: 1,
      rate: baseHourlyRate || 0,
      amount: 0,
      userEditedRate: false,
    };
    updateInvoice({ items: [...items, item] });
  };

  // Remove team member row
  const removeRow = (id) => {
    const newItems = items.filter(i => i.id !== id);
    updateInvoice({ items: newItems });
    
    // Clean up selected member data
    const newSelectedData = { ...selectedMemberData };
    delete newSelectedData[id];
    setSelectedMemberData(newSelectedData);
  };

  // Update team member row
  const updateRow = (id, patch) => {
    updateInvoice({
      items: items.map(it => 
        it.id === id ? computeAmount({ ...it, ...patch }) : it
      )
    });
  };

  // Handle member selection from dropdown
  const handleMemberSelect = (rowId, memberCode) => {
    if (!memberCode) {
      updateRow(rowId, { 
        name: '', 
        memberCode: '',
        factor: 1,
        rate: baseHourlyRate || 0,
        userEditedRate: false 
      });
      return;
    }

    const member = teamOptions.find(m => 
      String(m.id) === String(memberCode) || 
      String(m.code) === String(memberCode)
    );
    
    if (!member) {
      return;
    }

    // Store member data for this row
    setSelectedMemberData(prev => ({
      ...prev,
      [rowId]: member
    }));

    // Get factor from member data or default
    const memberFactor = Number(member.factor || member.defaultFactor || 1);
    const mode = member.defaultMode || 'Online';
    const modeFactor = DEFAULT_MODE_FACTORS[mode] || 1;

    // Calculate rate: baseHourlyRate * memberFactor * modeFactor
    const calculatedRate = (baseHourlyRate || 0) * memberFactor * modeFactor;

    updateRow(rowId, {
      name: member.name || '',
      memberCode: String(member.id || member.code || ''),
      factor: memberFactor,
      mode: mode,
      rate: calculatedRate,
      userEditedRate: false
    });
  };

  // Handle mode change - recalculate rate based on new mode factor
  const handleModeChange = (rowId, newMode) => {
    const currentRow = items.find(it => it.id === rowId);
    if (!currentRow) return;

    // Don't recalculate if user manually edited rate
    if (currentRow.userEditedRate) {
      updateRow(rowId, { mode: newMode });
      return;
    }

    const memberFactor = Number(currentRow.factor || 1);
    const modeFactor = DEFAULT_MODE_FACTORS[newMode] || 1;
    const calculatedRate = (baseHourlyRate || 0) * memberFactor * modeFactor;

    updateRow(rowId, {
      mode: newMode,
      rate: calculatedRate
    });
  };

  // Compute amount for a row
  function computeAmount(row) {
    const rateFromBase = Number(baseHourlyRate) || 0;
    const rate = row.userEditedRate === true 
      ? Number(row.rate || 0) 
      : (Number(row.rate) > 0 ? Number(row.rate) : rateFromBase);
    const hours = Number(row.hours || 0);
    const amt = Math.round(hours * rate * 100) / 100;
    return { ...row, rate, amount: amt };
  }

  // Recalculate all rows when base hourly rate changes
  useEffect(() => {
    if (!items.length) return;
    
    const updatedItems = items.map(it => {
      // Skip if user manually edited the rate
      if (it.userEditedRate) return computeAmount(it);
      
      // Recalculate rate based on factor and mode
      const memberFactor = Number(it.factor || 1);
      const modeFactor = DEFAULT_MODE_FACTORS[it.mode] || 1;
      const calculatedRate = (baseHourlyRate || 0) * memberFactor * modeFactor;
      
      return computeAmount({ ...it, rate: calculatedRate });
    });

    // Only update if something changed
    if (JSON.stringify(updatedItems) !== JSON.stringify(items)) {
      updateInvoice({ items: updatedItems });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseHourlyRate]);

  // Mark rate as manually edited
  const markManualRate = (id) => {
    updateInvoice({
      items: items.map(it => 
        it.id === id ? { ...it, userEditedRate: true } : it
      )
    });
  };

  return (
    <div>
      <div className="team-header">
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
          Team & Hours
        </h3>
        <button className="btn btn-primary btn-small" onClick={addRow}>
          + Add Member
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {loadingTeam ? (
          <div className="muted" style={{ textAlign: 'center', padding: '12px' }}>
            Loading team members...
          </div>
        ) : (
          <div>
            {items.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '24px' }}>
                No team members added. Click "Add Member" to start.
              </div>
            ) : (
              items.map(row => (
                <div key={row.id} className="team-row-card" style={{ marginBottom: 12 }}>
                  <div className="team-row">
                    {/* Member Selection */}
                    <div>
                      <div className="small-text small">Team Member</div>
                      <select
                        className="select"
                        value={row.memberCode || ''}
                        onChange={e => handleMemberSelect(row.id, e.target.value)}
                      >
                        <option value="">Select member...</option>
                        {Array.isArray(teamOptions) && teamOptions.map(member => (
                          <option 
                            key={member.id || member.code} 
                            value={member.id || member.code}
                          >
                            {member.name}
                          </option>
                        ))}
                      </select>
                      {row.memberCode && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          Factor: {row.factor || 1}
                        </div>
                      )}
                    </div>

                    {/* Mode Selection */}
                    <div>
                      <div className="small-text small">Mode</div>
                      <select
                        className="select"
                        value={row.mode || 'Online'}
                        onChange={e => handleModeChange(row.id, e.target.value)}
                      >
                        <option value="Online">Online ({DEFAULT_MODE_FACTORS.Online}x)</option>
                        <option value="Offline">Offline ({DEFAULT_MODE_FACTORS.Offline}x)</option>
                        <option value="Studio">Studio ({DEFAULT_MODE_FACTORS.Studio}x)</option>
                      </select>
                    </div>

                    {/* Hours Input */}
                    <div>
                      <div className="small-text small">Hours</div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours || 0}
                        onChange={e => updateRow(row.id, { hours: Number(e.target.value) })}
                      />
                    </div>

                    {/* Rate Input */}
                    <div>
                      <div className="small-text small">Rate (per hr)</div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={row.rate || 0}
                        onChange={e => {
                          updateRow(row.id, { rate: Number(e.target.value) });
                          markManualRate(row.id);
                        }}
                        title={row.userEditedRate ? "Manually edited" : "Auto-calculated"}
                      />
                      {row.userEditedRate && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          Manual
                        </div>
                      )}
                    </div>

                    {/* Amount Display */}
                    <div className="text-right">
                      <div className="small-text small">Amount</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        ₹{Number(row.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => removeRow(row.id)}
                        title="Remove member"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Team Options Info */}
      {Array.isArray(teamOptions) && teamOptions.length > 0 && !loadingTeam && (
        <div className="muted" style={{ marginTop: 16, fontSize: '0.813rem', textAlign: 'center' }}>
          💡 {teamOptions.length} team member(s) available
        </div>
      )}

      {/* Help Text */}
      {items.length > 0 && (
        <div 
          className="muted" 
          style={{ 
            marginTop: 16, 
            padding: '12px', 
            background: 'var(--gray-50)', 
            borderRadius: 'var(--radius)',
            fontSize: '0.813rem'
          }}
        >
          <strong>Rate Calculation:</strong> Base Rate × Member Factor × Mode Factor
          <br />
          <small>Edit rate manually to override auto-calculation</small>
        </div>
      )}
    </div>
  );
}