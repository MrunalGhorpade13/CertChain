/**
 * App.jsx — Root Application Component
 *
 * Responsibilities:
 *  - Wrap everything in Web3Provider (wallet state available everywhere)
 *  - Set up React Router v6 routes
 *  - Render the persistent Navbar
 *  - Configure global toast notifications
 *
 * Routes:
 *  /          → Home (landing page)
 *  /issue     → Issuer Dashboard (university admin portal)
 *  /verify    → Public Verification Portal
 */

import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { Web3Provider } from './context/Web3Context';
import Navbar from './components/Navbar';

// Page-level components (will be built in Phase 4)
// Using lazy placeholders for now so the app renders without errors
import Home          from './pages/Home';
import IssuePage     from './pages/IssuePage';
import VerifyPage    from './pages/VerifyPage';

/**
 * App — root component rendered by main.jsx
 */
function App() {
  return (
    /*
     * Web3Provider must wrap everything that needs wallet access.
     * It DOES NOT need to wrap the Router since it's placed inside BrowserRouter.
     */
    <Web3Provider>
      {/* ── Global toast notification container ─────────────────────── */}
      <Toaster
        position="top-right"
        toastOptions={{
          // Custom dark-mode styles for all toasts
          style: {
            background:  'rgba(13, 15, 30, 0.95)',
            color:       '#f1f5f9',
            border:      '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            fontSize:    '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />

      {/* ── App shell ─────────────────────────────────────────────────── */}
      <div className="min-h-screen flex flex-col">
        {/* Persistent navigation bar */}
        <Navbar />

        {/* Main content area — grows to fill remaining height */}
        <main className="flex-1">
          <Routes>
            <Route path="/"       element={<Home />} />
            <Route path="/issue"  element={<IssuePage />} />
            <Route path="/verify" element={<VerifyPage />} />
            {/* Catch-all 404 redirect to home */}
            <Route path="*"       element={<Home />} />
          </Routes>
        </main>
      </div>
    </Web3Provider>
  );
}

export default App;
