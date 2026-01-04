
// src/components/Dashboard/DashboardLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_URL } from "../../config/branding";

import '../../styles/Dashboard.css';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard', exact: true },
    { path: '/dashboard/create-invoice', icon: '📄', label: 'Create Invoice' },
    { path: '/dashboard/invoices', icon: '📋', label: 'My Invoices' },
    { path: '/dashboard/profile', icon: '👤', label: 'Profile' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname === '/dashboard/create-invoice') return 'Create Invoice';
    if (location.pathname.startsWith('/dashboard/create-invoice/')) return 'Edit Draft';
    if (location.pathname === '/dashboard/invoices') return 'My Invoices';
    if (location.pathname.startsWith('/dashboard/invoice/')) return 'Invoice Details';
    if (location.pathname === '/dashboard/profile') return 'Profile';
    return 'Dashboard';
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img 
              src={LOGO_URL} 
              alt="hourlx" 
              className="logo-image"
              style={{
                width: sidebarOpen ? '40px' : '32px',
                height: sidebarOpen ? '40px' : '32px',
                transition: 'all 0.3s ease'
              }}
            />
            {sidebarOpen && <span className="logo-text">hourlx</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '8px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#9ca3af';
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                gap: sidebarOpen ? '12px' : '0',
                padding: sidebarOpen ? '12px 16px' : '12px',
                margin: '4px 8px',
                border: 'none',
                borderRadius: '8px',
                background: isActive(item.path, item.exact) ? '#6366f1' : 'transparent',
                color: isActive(item.path, item.exact) ? '#fff' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive(item.path, item.exact) ? '600' : '500',
                transition: 'all 0.2s',
                width: 'calc(100% - 16px)'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path, item.exact)) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path, item.exact)) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9ca3af';
                }
              }}
            >
              <span className="nav-icon" style={{ fontSize: '20px' }}>{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button 
            className="nav-item logout-btn" 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              gap: sidebarOpen ? '12px' : '0',
              padding: sidebarOpen ? '12px 16px' : '12px',
              margin: '4px 8px',
              border: 'none',
              borderRadius: '8px',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              width: 'calc(100% - 16px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <span className="nav-icon" style={{ fontSize: '20px' }}>🚪</span>
            {sidebarOpen && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title" style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              {getPageTitle()}
            </h1>
          </div>

          <div className="header-right">
            <div className="user-info" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              borderRadius: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb'
            }}>
              <div className="user-avatar" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name" style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {user?.name || 'User'}
                </div>
                <div className="user-email" style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}