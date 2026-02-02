
// src/pages/ProfilePage.jsx
import React from "react";
import '../styles/ProfilePage.css';
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

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

        {/* PERSONAL INFORMATION CARD - READ ONLY */}
        <div className="profile-card">
          <div className="card-header">
            <h3>Personal Information</h3>
          </div>

          <div className="form-grid">

            {/* Full Name */}
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                disabled
                value={user?.name || ""}
                readOnly
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                disabled 
                value={user?.email || ""} 
                readOnly
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                disabled
                value={user?.phone || ""}
                readOnly
              />
            </div>

            {/* Company Name */}
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                disabled
                value={user?.businessName || ""}
                readOnly
              />
            </div>

            {/* GST */}
            <div className="form-group">
              <label>GST Number</label>
              <input
                type="text"
                disabled
                value={user?.businessGSTIN || ""}
                readOnly
              />
            </div>

            {/* PAN */}
            <div className="form-group">
              <label>PAN Number</label>
              <input
                type="text"
                disabled
                value={user?.businessPAN || ""}
                readOnly
              />
            </div>

            {/* State Code */}
            <div className="form-group">
              <label>State Code</label>
              <input
                type="text"
                disabled
                value={user?.businessStateCode || ""}
                readOnly
              />
            </div>

            {/* Address - full width */}
            <div className="form-group form-group-full">
              <label>Business Address</label>
              <textarea
                rows="3"
                disabled
                value={user?.businessRegisteredOffice || ""}
                readOnly
              />
            </div>
          </div>

          {/* INFO MESSAGE */}
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <span style={{ fontSize: '18px' }}>ℹ️</span>
            <span>Profile information is managed by admin. Contact support to update your details.</span>
          </div>
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