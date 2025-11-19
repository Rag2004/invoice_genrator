
// import React, { useState, useEffect } from 'react';

// export default function TeamSummary({ 
//   invoice, 
//   updateInvoice, 
//   teamOptions, 
//   loadingTeam, 
//   baseHourlyRate 
// }) {
//   // Consultation modes (simple dropdown, no factors)
//   const consultationModes = [
//     'Online | Face-Time',
//     'Online | Studio-Time', 
//     'Offline | Studio-Time'
//   ];

//   // Add new team member row
//   const addTeamMember = () => {
//     const firstMember = teamOptions[0];
//     const memberFactor = firstMember?.baseFactor || 1;
//     const calculatedRate = baseHourlyRate * memberFactor;

//     const newItem = {
//       id: Date.now(),
//       name: firstMember?.name || 'Studio Team',
//       mode: consultationModes[0] || 'Online | Face-Time',
//       hours: 1,
//       totalHours: 1,
//       factor: memberFactor, // Factor from TeamMembers sheet
//       rate: calculatedRate,
//       amount: calculatedRate,
//       userEditedRate: false,
//     };
//     updateInvoice({ items: [...(invoice.items || []), newItem] });
//   };

//   // Remove team member
//   const removeTeamMember = (id) => {
//     if ((invoice.items || []).length <= 1) return;
//     updateInvoice({ items: invoice.items.filter(item => item.id !== id) });
//   };

//   // Update team member field
//   const updateTeamMember = (id, field, value) => {
//     const updatedItems = invoice.items.map(item => {
//       if (item.id !== id) return item;

//       const updated = { ...item, [field]: value };

//       // When member name changes, update factor from sheet
//       if (field === 'name') {
//         const member = teamOptions.find(m => m.name === value);
//         const memberFactor = member?.baseFactor || 1;
        
//         updated.factor = memberFactor;
//         updated.rate = Math.round(baseHourlyRate * memberFactor);
//         updated.userEditedRate = false;
//         updated.amount = Math.round((updated.rate * (updated.hours || 0)) * 100) / 100;
//       } 
//       // When factor changes manually, recalculate rate
//       else if (field === 'factor') {
//         updated.rate = Math.round(baseHourlyRate * value);
//         updated.userEditedRate = false;
//         updated.amount = Math.round((updated.rate * (updated.hours || 0)) * 100) / 100;
//       }
//       // When hours change, recalculate amount
//       else if (field === 'hours') {
//         updated.amount = Math.round((updated.rate * value) * 100) / 100;
//       }
//       // When rate is manually edited
//       else if (field === 'rate') {
//         updated.userEditedRate = true;
//         updated.amount = Math.round((value * (updated.hours || 0)) * 100) / 100;
//       }

//       return updated;
//     });

//     updateInvoice({ items: updatedItems });
//   };

//   // Initialize with one team member if empty
//   useEffect(() => {
//     if (!invoice.items || invoice.items.length === 0) {
//       if (teamOptions.length > 0) {
//         addTeamMember();
//       }
//     }
//   }, [teamOptions]);

//   // Recalculate all rates when base hourly rate changes
//   useEffect(() => {
//     if (!invoice.items || invoice.items.length === 0) return;
    
//     const updatedItems = invoice.items.map(item => {
//       // Only recalculate if rate wasn't manually edited
//       if (!item.userEditedRate) {
//         const newRate = Math.round(baseHourlyRate * (item.factor || 1));
//         return {
//           ...item,
//           rate: newRate,
//           amount: Math.round((newRate * (item.hours || 0)) * 100) / 100
//         };
//       }
//       return item;
//     });

//     updateInvoice({ items: updatedItems });
//   }, [baseHourlyRate]);

//   return (
//     <div style={{ padding: '1rem' }}>
//       {/* Team Members Section */}
//       <div style={{ marginBottom: '1rem' }}>
//         <div style={{ 
//           display: 'flex', 
//           justifyContent: 'space-between', 
//           alignItems: 'center',
//           marginBottom: '1rem'
//         }}>
//           <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
//             Team Members
//           </h3>
//           <button 
//             className="btn btn-primary btn-sm"
//             onClick={addTeamMember}
//             disabled={loadingTeam}
//           >
//             + Add Member
//           </button>
//         </div>

//         {loadingTeam && (
//           <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
//             Loading team members...
//           </div>
//         )}

//         {!loadingTeam && (invoice.items || []).map((item, idx) => (
//           <div 
//             key={item.id} 
//             style={{ 
//               background: '#f9fafb',
//               border: '1px solid #e5e7eb',
//               borderRadius: '8px',
//               padding: '1rem',
//               marginBottom: '1rem'
//             }}
//           >
//             {/* Row 1: Team Member & Mode */}
//             <div style={{ 
//               display: 'grid', 
//               gridTemplateColumns: '1fr 1fr', 
//               gap: '1rem',
//               marginBottom: '0.75rem'
//             }}>
//               <div>
//                 <label className="label">Team Member</label>
//                 <select
//                   className="input"
//                   value={item.name}
//                   onChange={(e) => updateTeamMember(item.id, 'name', e.target.value)}
//                 >
//                   {teamOptions.map(opt => (
//                     <option key={opt.id} value={opt.name}>
//                       {opt.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="label">Consultation Mode</label>
//                 <select
//                   className="input"
//                   value={item.mode}
//                   onChange={(e) => updateTeamMember(item.id, 'mode', e.target.value)}
//                 >
//                   {consultationModes.map(mode => (
//                     <option key={mode} value={mode}>
//                       {mode}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             {/* Row 2: Hours, Total Hours, Factor, Rate, Price */}
//             <div style={{ 
//               display: 'grid', 
//               gridTemplateColumns: '0.8fr 0.8fr 0.8fr 1fr 1fr 40px', 
//               gap: '1rem',
//               alignItems: 'end'
//             }}>
//               <div>
//                 <label className="label">Hours</label>
//                 <input
//                   type="number"
//                   className="input"
//                   min="0"
//                   step="0.5"
//                   value={item.hours || ''}
//                   onChange={(e) => updateTeamMember(item.id, 'hours', Number(e.target.value))}
//                 />
//               </div>

//               <div>
//                 <label className="label">Total Hours</label>
//                 <input
//                   type="number"
//                   className="input"
//                   value={item.totalHours || item.hours || ''}
//                   readOnly
//                   style={{ background: '#f3f4f6' }}
//                 />
//               </div>

//               <div>
//                 <label className="label">Factor</label>
//                 <input
//                   type="number"
//                   className="input"
//                   min="0"
//                   step="0.05"
//                   value={item.factor || 1}
//                   onChange={(e) => updateTeamMember(item.id, 'factor', Number(e.target.value))}
//                   title="From TeamMembers sheet (editable)"
//                 />
//               </div>

//               <div>
//                 <label className="label">Rate (₹/hr)</label>
//                 <input
//                   type="number"
//                   className="input"
//                   min="0"
//                   value={item.rate || ''}
//                   onChange={(e) => updateTeamMember(item.id, 'rate', Number(e.target.value))}
//                   title="Click to manually override"
//                 />
//               </div>

//               <div>
//                 <label className="label">Price (₹)</label>
//                 <input
//                   type="text"
//                   className="input"
//                   value={'₹' + Number(item.amount || 0).toLocaleString('en-IN')}
//                   readOnly
//                   style={{ background: '#f3f4f6', fontWeight: '600' }}
//                 />
//               </div>

//               <div>
//                 <button
//                   className="btn btn-ghost btn-sm"
//                   onClick={() => removeTeamMember(item.id)}
//                   disabled={invoice.items.length <= 1}
//                   title="Remove member"
//                   style={{ padding: '0.5rem', minWidth: 'auto' }}
//                 >
//                   🗑️
//                 </button>
//               </div>
//             </div>
//           </div>
//         ))}

//         {/* Calculation Info */}
//         <div style={{ 
//           background: '#eff6ff', 
//           border: '1px solid #bfdbfe',
//           borderRadius: '6px',
//           padding: '0.75rem',
//           fontSize: '0.875rem',
//           color: '#1e40af',
//           marginTop: '1rem'
//         }}>
//           <strong>ℹ️ Rate Calculation:</strong> Rate = Base Hourly Rate (₹{baseHourlyRate.toLocaleString('en-IN')}) × Factor
//           <br />
//           <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
//             Factor is auto-filled from TeamMembers sheet but can be manually adjusted
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useState, useEffect } from 'react';

export default function TeamSummary({ 
  invoice, 
  updateInvoice, 
  teamOptions, 
  loadingTeam, 
  baseHourlyRate 
}) {
  // Consultation modes (simple dropdown, no factors)
  const consultationModes = [
    'Online | Face-Time',
    'Online | Studio-Time', 
    'Offline | Face-Time',
    'Offline | Studio-Time'
  ];

  // Add new team member row
  const addTeamMember = () => {
    const firstMember = teamOptions[0];
    const memberFactor = firstMember?.baseFactor || 1;
    const calculatedRate = baseHourlyRate * memberFactor;

    const newItem = {
      id: Date.now(),
      name: firstMember?.name || 'Studio Team',
      mode: consultationModes[0] || 'Online | Face-Time',
      hours: 1,
      factor: memberFactor, // Factor from TeamMembers sheet
      rate: calculatedRate,
      amount: calculatedRate,
      userEditedRate: false,
    };
    updateInvoice({ items: [...(invoice.items || []), newItem] });
  };

  // Remove team member
  const removeTeamMember = (id) => {
    if ((invoice.items || []).length <= 1) return;
    updateInvoice({ items: invoice.items.filter(item => item.id !== id) });
  };

  // Update team member field
  const updateTeamMember = (id, field, value) => {
    const updatedItems = invoice.items.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // When member name changes, update factor from sheet
      if (field === 'name') {
        const member = teamOptions.find(m => m.name === value);
        const memberFactor = member?.baseFactor || 1;
        
        updated.factor = memberFactor;
        updated.rate = Math.round(baseHourlyRate * memberFactor);
        updated.userEditedRate = false;
        updated.amount = Math.round((updated.rate * (updated.hours || 0)) * 100) / 100;
      } 
      // When factor changes manually, recalculate rate
      else if (field === 'factor') {
        updated.rate = Math.round(baseHourlyRate * value);
        updated.userEditedRate = false;
        updated.amount = Math.round((updated.rate * (updated.hours || 0)) * 100) / 100;
      }
      // When hours change, recalculate amount
      else if (field === 'hours') {
        updated.amount = Math.round((updated.rate * value) * 100) / 100;
      }
      // When rate is manually edited
      else if (field === 'rate') {
        updated.userEditedRate = true;
        updated.amount = Math.round((value * (updated.hours || 0)) * 100) / 100;
      }

      return updated;
    });

    updateInvoice({ items: updatedItems });
  };

  // Initialize with one team member if empty
  useEffect(() => {
    if (!invoice.items || invoice.items.length === 0) {
      if (teamOptions.length > 0) {
        addTeamMember();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamOptions]);

  // Recalculate all rates when base hourly rate changes
  useEffect(() => {
    if (!invoice.items || invoice.items.length === 0) return;
    
    const updatedItems = invoice.items.map(item => {
      // Only recalculate if rate wasn't manually edited
      if (!item.userEditedRate) {
        const newRate = Math.round(baseHourlyRate * (item.factor || 1));
        return {
          ...item,
          rate: newRate,
          amount: Math.round((newRate * (item.hours || 0)) * 100) / 100
        };
      }
      return item;
    });

    updateInvoice({ items: updatedItems });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseHourlyRate]);

  return (
    <div style={{ padding: '1rem' }}>
      {/* Team Members Section */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            Team Members
          </h3>
          <button 
            className="btn btn-primary btn-sm"
            onClick={addTeamMember}
            disabled={loadingTeam}
          >
            + Add Member
          </button>
        </div>

        {loadingTeam && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
            Loading team members...
          </div>
        )}

        {!loadingTeam && (invoice.items || []).map((item) => (
          <div 
            key={item.id} 
            style={{ 
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}
          >
            {/* Row 1: Team Member & Mode */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem',
              marginBottom: '0.75rem'
            }}>
              <div>
                <label className="label">Team Member</label>
                <select
                  className="input"
                  value={item.name}
                  onChange={(e) => updateTeamMember(item.id, 'name', e.target.value)}
                >
                  {teamOptions.map(opt => (
                    <option key={opt.id} value={opt.name}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Consultation Mode</label>
                <select
                  className="input"
                  value={item.mode}
                  onChange={(e) => updateTeamMember(item.id, 'mode', e.target.value)}
                >
                  {consultationModes.map(mode => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Hours, Factor, Rate, Price, Delete */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '0.8fr 0.8fr 1fr 1fr 40px', 
              gap: '1rem',
              alignItems: 'end'
            }}>
              <div>
                <label className="label">Hours</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.5"
                  value={item.hours || ''}
                  onChange={(e) => updateTeamMember(item.id, 'hours', Number(e.target.value))}
                />
              </div>

              <div>
                <label className="label">Factor</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.05"
                  value={item.factor || 1}
                  onChange={(e) => updateTeamMember(item.id, 'factor', Number(e.target.value))}
                  title="From TeamMembers sheet (editable)"
                />
              </div>

              <div>
                <label className="label">Rate (₹/hr)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={item.rate || ''}
                  onChange={(e) => updateTeamMember(item.id, 'rate', Number(e.target.value))}
                  title="Click to manually override"
                />
              </div>

              <div>
                <label className="label">Price (₹)</label>
                <input
                  type="text"
                  className="input"
                  value={'₹' + Number(item.amount || 0).toLocaleString('en-IN')}
                  readOnly
                  style={{ background: '#f3f4f6', fontWeight: '600' }}
                />
              </div>

              <div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeTeamMember(item.id)}
                  disabled={invoice.items.length <= 1}
                  title="Remove member"
                  style={{ padding: '0.5rem', minWidth: 'auto' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Calculation Info */}
        <div style={{ 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          padding: '0.75rem',
          fontSize: '0.875rem',
          color: '#1e40af',
          marginTop: '1rem'
        }}>
          <strong>ℹ️ Rate Calculation:</strong> Rate = Base Hourly Rate (₹{baseHourlyRate.toLocaleString('en-IN')}) × Factor
          <br />
          <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
            Factor is auto-filled from TeamMembers sheet but can be manually adjusted
          </span>
        </div>
      </div>
    </div>
  );
}
