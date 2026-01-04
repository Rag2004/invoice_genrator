
// src/pages/ProfilePage.jsx
import React, { useState } from "react";
import '../styles/ProfilePage.css';
import { useAuth } from "../context/AuthContext";
import * as api from "../api/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // ------------------------------------------------------
  // INITIAL FORM DATA (Mapped to your sheet columns)
  // ------------------------------------------------------
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    company: user?.businessName || "",
    address: user?.businessRegisteredOffice || "",
    gst: user?.businessGSTIN || "",
    pan: user?.businessPAN || "",
    stateCode: user?.businessStateCode || ""
  });

  // -----------------------------
  // Handle input change
  // -----------------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // -----------------------------
  // Submit profile update
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        email: user.email, // cannot change
        name: formData.name,
        phone: formData.phone,
        business_name: formData.company,
        business_registered_office: formData.address,
        business_pan: formData.pan,
        business_gstin: formData.gst,
        business_state_code: formData.stateCode
      };

      const res = await api.updateConsultantProfileAction(payload);

      if (!res.ok) throw new Error(res.error || "Update failed");

      alert("✅ Profile updated successfully!");

      await refreshUser();
      setEditing(false);

    } catch (err) {
      console.error("Profile update failed:", err);
      alert("❌ Failed to update profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // Cancel edit
  // -----------------------------
  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      company: user?.businessName || "",
      address: user?.businessRegisteredOffice || "",
      gst: user?.businessGSTIN || "",
      pan: user?.businessPAN || "",
      stateCode: user?.businessStateCode || ""
    });
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="profile-header-info">
            <h2>{user?.name || "User"}</h2>
            <p>{user?.email}</p>
          </div>
        </div>

        {/* PERSONAL INFORMATION CARD */}
        <div className="profile-card">
          <div className="card-header">
            <h3>Personal Information</h3>

            {!editing && (
              <button className="btn-edit" onClick={() => setEditing(true)}>
                ✏️ Edit Profile
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">

              {/* Full Name */}
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  disabled={!editing}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Email (Locked) */}
              <div className="form-group">
                <label>Email (Locked)</label>
                <input type="email" name="email" disabled value={formData.email} />
                <small>Email cannot be changed</small>
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  disabled={!editing}
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Company Name */}
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  name="company"
                  disabled={!editing}
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>

              {/* GST */}
              <div className="form-group">
                <label>GST Number</label>
                <input
                  type="text"
                  name="gst"
                  disabled={!editing}
                  value={formData.gst}
                  placeholder="22AAAAA0000A1Z5"
                  onChange={handleChange}
                />
              </div>

              {/* PAN */}
              <div className="form-group">
                <label>PAN Number</label>
                <input
                  type="text"
                  name="pan"
                  disabled={!editing}
                  value={formData.pan}
                  placeholder="ABCDE1234F"
                  onChange={handleChange}
                />
              </div>

              {/* State Code */}
              <div className="form-group">
                <label>State Code</label>
                <input
                  type="text"
                  name="stateCode"
                  disabled={!editing}
                  value={formData.stateCode}
                  placeholder="Delhi (07)"
                  onChange={handleChange}
                />
              </div>

              {/* Address - full width */}
              <div className="form-group form-group-full">
                <label>Business Address</label>
                <textarea
                  name="address"
                  rows="3"
                  disabled={!editing}
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
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
                      <span className="spinner"></span> Saving...
                    </>
                  ) : (
                    <>💾 Save Changes</>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* ACCOUNT INFO */}
        <div className="profile-card">
          <div className="card-header">
            <h3>Account Information</h3>
          </div>

          <div className="account-info">
            <div className="info-row">
              <span className="info-label">Consultant ID:</span>
              <span className="info-value">{user?.consultantId || "N/A"}</span>
            </div>

            <div className="info-row">
              <span className="info-label">Created On:</span>
              <span className="info-value">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })
                  : "N/A"}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value status-active">● Active</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}