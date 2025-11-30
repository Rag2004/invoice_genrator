// src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
    address: user?.address || '',
    gst: user?.gst || '',
    pan: user?.pan || ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // TODO: Call API to update profile
      // await updateProfile(formData);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      alert('✅ Profile updated successfully!');
      await refreshUser();
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('❌ Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
      address: user?.address || '',
      gst: user?.gst || '',
      pan: user?.pan || ''
    });
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-large">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <h2>{user?.name || 'User'}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      <div className="profile-card">
        <div className="card-header">
          <h3>Personal Information</h3>
          {!editing && (
            <button 
              className="btn-edit"
              onClick={() => setEditing(true)}
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Name */}
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editing}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={true} // Email cannot be changed
              />
              <small>Email cannot be changed</small>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!editing}
              />
            </div>

            {/* Company */}
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                disabled={!editing}
              />
            </div>

            {/* GST */}
            <div className="form-group">
              <label>GST Number (Optional)</label>
              <input
                type="text"
                name="gst"
                value={formData.gst}
                onChange={handleChange}
                disabled={!editing}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>

            {/* PAN */}
            <div className="form-group">
              <label>PAN Number (Optional)</label>
              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                disabled={!editing}
                placeholder="ABCDE1234F"
              />
            </div>

            {/* Address - Full Width */}
            <div className="form-group form-group-full">
              <label>Business Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!editing}
                rows={3}
                placeholder="Enter your complete business address"
              />
            </div>
          </div>

          {editing && (
            <div className="form-actions">
              <button 
                type="button"
                className="btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner"></span>
                    Saving...
                  </>
                ) : (
                  '💾 Save Changes'
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Account Info */}
      <div className="profile-card">
        <div className="card-header">
          <h3>Account Information</h3>
        </div>
        <div className="account-info">
          <div className="info-row">
            <span className="info-label">User ID:</span>
            <span className="info-value">{user?.id || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Account Created:</span>
            <span className="info-value">
              {user?.created_at 
                ? new Date(user.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'N/A'
              }
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Account Status:</span>
            <span className="info-value status-active">● Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}