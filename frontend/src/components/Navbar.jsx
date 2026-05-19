/**
 * Navbar.jsx — Persistent Navigation Bar
 *
 * Features:
 *  - Glassmorphism styling (backdrop-blur + translucent background)
 *  - App logo / brand name with gradient text
 *  - Navigation links (Home, Issue, Verify)
 *  - Wallet Connect / Disconnect button (powered by useWeb3)
 *  - Displays truncated wallet address when connected
 *  - Network badge showing current chain
 */

import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useTheme } from '../context/ThemeContext';

// ── Helper: shorten an Ethereum address for display ─────────────────────
const shortenAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

/**
 * NetworkBadge — shows the connected blockchain network name.
 * Green if supported (Sepolia/local), amber if unknown.
 */
function NetworkBadge({ chainName, isCorrectNetwork }) {
  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${isCorrectNetwork
          ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
          : 'text-amber-400  bg-amber-400/10  border border-amber-400/20'
        }`}
    >
      {/* Pulsing status dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${isCorrectNetwork ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse-glow`}
      />
      {chainName}
    </span>
  );
}

/**
 * Navbar component — rendered once at the top of every page via App.jsx.
 */
export default function Navbar() {
  const { account, chainName, isCorrectNetwork, isConnecting, connectWallet, disconnectWallet } = useWeb3();
  const { theme, toggleTheme } = useTheme();

  // Mobile menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // Nav link active style helper for NavLink
  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'text-slate-900 dark:text-white'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'
    }`;

  return (
    <nav
      className="glass sticky top-0 z-50 border-b dark:border-white/5 border-black/5"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo / Brand ─────────────────────────────────────────────── */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            aria-label="CertChain home"
          >
            {/* Animated hexagon icon */}
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 blur-sm opacity-50 group-hover:opacity-70 transition-opacity" />
              {/* Shield / certificate icon */}
              <svg
                className="absolute inset-0 w-8 h-8 p-1.5 text-slate-900 dark:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>

            <span className="font-bold text-lg tracking-tight">
              <span className="text-gradient-primary">Cert</span>
              <span className="text-slate-900 dark:text-slate-100">Chain</span>
            </span>
          </Link>

          {/* ── Desktop Navigation Links ──────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/"       end className={linkClass}>Home</NavLink>
            <NavLink to="/issue"  className={linkClass}>Issue</NavLink>
            <NavLink to="/verify" className={linkClass}>Verify</NavLink>
          </div>

          {/* ── Right Side: Network + Theme + Wallet ──────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:text-slate-900 dark:text-white dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                // Sun icon for dark mode (click to switch to light)
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon icon for light mode
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Show network badge only when wallet is connected */}
            {account && (
              <NetworkBadge
                chainName={chainName}
                isCorrectNetwork={isCorrectNetwork}
              />
            )}

            {account ? (
              /* Connected state — show address + disconnect option */
              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10
                             bg-white/[0.03] text-sm text-slate-700 dark:text-slate-300 font-mono"
                  title={account}
                >
                  {/* Green online dot */}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow flex-shrink-0" />
                  {shortenAddress(account)}
                </div>

                <button
                  id="btn-disconnect-wallet"
                  onClick={disconnectWallet}
                  className="btn-secondary text-xs px-3 py-1.5"
                  aria-label="Disconnect wallet"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              /* Disconnected state — Connect Wallet button */
              <button
                id="btn-connect-wallet"
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary text-xs sm:text-sm px-4 py-2"
                aria-label="Connect MetaMask wallet"
              >
                {isConnecting ? (
                  <>
                    {/* Spinner */}
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    🦊 Connect Wallet
                  </>
                )}
              </button>
            )}

            {/* ── Mobile menu toggle ──────────────────────────────────────── */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={menuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ─────────────────────────────────────────── */}
        {menuOpen && (
          <div className="md:hidden border-t border-black/5 dark:border-white/5 py-3 space-y-1 animate-slide-up">
            {[
              { to: '/',       label: 'Home',   end: true },
              { to: '/issue',  label: 'Issue' },
              { to: '/verify', label: 'Verify' },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-slate-900 dark:text-white bg-white/[0.06]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white/[0.04]'
                  }`
                }
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
