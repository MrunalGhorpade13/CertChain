/**
 * LoginPage.jsx — Role-Based Login Landing Page
 *
 * Two cards:
 *  - Student Portal: Any wallet can connect → redirected to /student
 *  - Admin Portal:   Wallet connects, then contract is checked for authorization → redirected to /issue
 *
 * Also supports a fallback "demo mode" password for testing without MetaMask.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import toast from 'react-hot-toast';
import contractInfo from '../contracts/CertificateRegistry.json';

const DEMO_ADMIN_PASSWORD = 'certchain-admin-2024'; // For local testing only

export default function LoginPage() {
  const navigate = useNavigate();
  const { account, signer, connectWallet, isConnecting } = useWeb3();

  const [activeCard, setActiveCard] = useState(null); // 'student' | 'admin'
  const [isChecking, setIsChecking] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  // ── Student Login ───────────────────────────────────────────────────────
  const handleStudentLogin = async () => {
    setActiveCard('student');
    if (!account) {
      await connectWallet();
    }
    // After connecting, navigate to student dashboard
    setTimeout(() => navigate('/student'), 600);
  };

  // ── Admin Login via MetaMask ────────────────────────────────────────────
  const handleAdminLogin = async () => {
    setActiveCard('admin');
    if (!account) {
      await connectWallet();
      return; // connectWallet updates state; user will need to click again or we watch account
    }
    await checkAdminAuthorization();
  };

  const checkAdminAuthorization = async () => {
    if (!account || !signer) {
      toast.error('Please connect your wallet first.');
      return;
    }
    setIsChecking(true);
    try {
      const contract = new ethers.Contract(
        contractInfo.contractAddress,
        contractInfo.abi,
        signer
      );
      const isAuthorized = await contract.isAuthorizedIssuer(account);
      if (!isAuthorized) {
        toast.error('This wallet is not authorized as an admin/issuer on the contract.', { duration: 5000 });
        setShowPasswordFallback(true);
        return;
      }
      toast.success('Admin authorized! Redirecting to dashboard...', { icon: '🔐' });
      setTimeout(() => navigate('/issue'), 800);
    } catch (err) {
      console.error('[Admin Auth Check]', err);
      // If contract call fails (e.g., local network not running), offer password fallback
      toast('Contract check failed. Try the demo password.', { icon: '⚠️' });
      setShowPasswordFallback(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handlePasswordFallback = (e) => {
    e.preventDefault();
    if (adminPassword === DEMO_ADMIN_PASSWORD) {
      toast.success('Demo admin access granted!', { icon: '🔐' });
      sessionStorage.setItem('certchain_admin_demo', 'true');
      setTimeout(() => navigate('/issue'), 600);
    } else {
      toast.error('Incorrect admin password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-xs font-semibold text-purple-400 dark:text-purple-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Secure Access Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            <span className="text-gradient-primary">CertChain</span>
            <span className="text-slate-900 dark:text-white"> Portal</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-md mx-auto">
            Choose your role to access the blockchain-powered certificate system.
          </p>
        </div>

        {/* Two-card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Student Card ────────────────────────────────────────────── */}
          <div
            className={`glass border rounded-2xl p-8 flex flex-col items-center text-center group cursor-pointer
              transition-all duration-300 hover:-translate-y-1
              ${activeCard === 'student'
                ? 'border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.2)]'
                : 'border-black/5 dark:border-white/[0.06] hover:border-blue-500/30'
              }`}
            onClick={handleStudentLogin}
          >
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 opacity-10 blur-xl group-hover:opacity-20 transition-opacity" />
              <svg className="w-10 h-10 text-blue-500 dark:text-blue-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Student Portal</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Submit certificate requests, track your application status, and view your issued credentials.
            </p>

            <div className="w-full space-y-2 text-xs text-slate-500 dark:text-slate-500 mb-6">
              {['Request new certificate', 'Track application status', 'View issued credentials'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">✓</span>
                  {f}
                </div>
              ))}
            </div>

            <button
              id="btn-student-login"
              disabled={isConnecting && activeCard === 'student'}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300
                bg-gradient-to-r from-blue-500 to-cyan-500
                hover:from-blue-400 hover:to-cyan-400
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
            >
              {(isConnecting && activeCard === 'student') ? 'Connecting...' : '🎓 Enter as Student'}
            </button>
          </div>

          {/* ── Admin Card ──────────────────────────────────────────────── */}
          <div
            className={`glass border rounded-2xl p-8 flex flex-col items-center text-center group
              transition-all duration-300 hover:-translate-y-1
              ${activeCard === 'admin'
                ? 'border-purple-500/40 shadow-[0_0_40px_rgba(139,92,246,0.2)]'
                : 'border-black/5 dark:border-white/[0.06] hover:border-purple-500/30'
              }`}
          >
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 opacity-10 blur-xl group-hover:opacity-20 transition-opacity" />
              <svg className="w-10 h-10 text-purple-500 dark:text-purple-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admin Portal</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Review student requests, approve & mint certificates on-chain, and manage issued credentials.
            </p>

            <div className="w-full space-y-2 text-xs text-slate-500 dark:text-slate-500 mb-6">
              {['Review pending requests', 'Approve & mint on-chain', 'Manual certificate issuance'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">✓</span>
                  {f}
                </div>
              ))}
            </div>

            {/* Primary admin login button */}
            <button
              id="btn-admin-login"
              onClick={handleAdminLogin}
              disabled={(isConnecting && activeCard === 'admin') || isChecking}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300
                bg-gradient-to-r from-purple-500 to-pink-500
                hover:from-purple-400 hover:to-pink-400
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
            >
              {isChecking ? 'Verifying authorization...' :
               (isConnecting && activeCard === 'admin') ? 'Connecting...' :
               '🔐 Enter as Admin'}
            </button>

            {/* Password fallback (shown if contract check fails) */}
            {showPasswordFallback && (
              <form onSubmit={handlePasswordFallback} className="w-full mt-4 animate-slide-up">
                <div className="border-t border-black/5 dark:border-white/5 pt-4">
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-3">
                    Demo mode: enter the admin password to bypass on-chain check.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Admin password"
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-white/80 dark:bg-slate-800/50
                        border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white
                        placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-purple-500/20
                        text-purple-400 hover:bg-purple-500/30 transition-colors border border-purple-500/20"
                    >
                      Enter
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-8">
          Powered by Ethereum blockchain · MetaMask required for full functionality
        </p>
      </div>
    </div>
  );
}
