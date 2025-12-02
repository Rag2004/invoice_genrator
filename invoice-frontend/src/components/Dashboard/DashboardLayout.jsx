
// }
// src/components/Dashboard/DashboardLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/1.png'; // Import your logo
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
    { path: '/dashboard/drafts', icon: '💾', label: 'Drafts' },
    { path: '/dashboard/profile', icon: '👤', label: 'Profile' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {/* Logo Image */}
            <img 
              src={logo} 
              alt="hourlx" 
              className="logo-image"
            />
            {/* Text appears when sidebar is open */}
            {sidebarOpen && <span className="logo-text">hourlx</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
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
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {sidebarOpen && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">
              {location.pathname === '/dashboard' && 'Dashboard'}
              {location.pathname === '/dashboard/create-invoice' && 'Create Invoice'}
              {location.pathname === '/dashboard/invoices' && 'My Invoices'}
              {location.pathname === '/dashboard/drafts' && 'Drafts'}
              {location.pathname === '/dashboard/profile' && 'Profile'}
            </h1>
          </div>

          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-email">{user?.email}</div>
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