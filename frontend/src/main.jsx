/**
 * main.jsx — React application entry point
 *
 * Responsibilities:
 *  - Mount the React root into #root
 *  - Wrap the app in BrowserRouter so all pages have access to React Router
 *  - Import global CSS (Tailwind + custom styles)
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';

// Global styles must be imported BEFORE the App component
import './index.css';
import App from './App.jsx';

// Mount the application
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter provides navigation context to all child components */}
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
