
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRouter from './App.jsx';
import './index.css';
import './styles.css';

console.log('App mounting - version v2');
ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);
