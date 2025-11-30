// // src/main.jsx
// import React from 'react'
// import { createRoot } from 'react-dom/client'
// import App from './App'
// import './styles.css'

// // react-toastify imports
// import 'react-toastify/dist/ReactToastify.css'
// import { ToastContainer } from 'react-toastify'

// createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//     <ToastContainer
//       position="top-right"
//       autoClose={4000}
//       hideProgressBar={false}
//       newestOnTop={false}
//       closeOnClick
//       rtl={false}
//       pauseOnFocusLoss
//       draggable
//       pauseOnHover
//     />
//   </React.StrictMode>
// )
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
