/**
 * StudentDashboard.jsx — Student Certificate Request Portal
 *
 * Features:
 *  - Certificate request form (Name, Email, Course, Grade, Issuer)
 *  - Live hash preview as the student fills in the form
 *  - "My Submissions" table with real-time status badges and tx links
 *  - Auto-polls for updates every 30 seconds
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import contractInfo from '../contracts/CertificateRegistry.json';

const API_BASE = 'http://localhost:5000/api';

// ── Status badge component ───────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Pending:  { cls: 'badge-pending',  icon: '⏳', label: 'Pending' },
    Approved: { cls: 'badge-verified', icon: '✅', label: 'Approved' },
    Rejected: { cls: 'badge-invalid',  icon: '❌', label: 'Rejected' },
  };
  const { cls, icon, label } = map[status] ?? map.Pending;
  return <span className={cls}>{icon} {label}</span>;
}

export default function StudentDashboard() {
  const { account, connectWallet, isConnecting } = useWeb3();
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState({
    studentName: '', studentEmail: '', courseName: '', grade: '', issuerName: '',
  });
  const [calculatedHash, setCalculatedHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submissions list state
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Derived live hash ──────────────────────────────────────────────────────
  useEffect(() => {
    const { studentName, studentEmail, courseName, grade, issuerName } = form;
    if (studentName && courseName && issuerName) {
      try {
        const hash = ethers.solidityPackedKeccak256(
          ['string', 'string', 'string', 'string', 'string'],
          [studentName.trim(), studentEmail.trim().toLowerCase(), courseName.trim(), grade.trim() || 'Pass', issuerName.trim()]
        );
        setCalculatedHash(hash);
      } catch { setCalculatedHash(''); }
    } else {
      setCalculatedHash('');
    }
  }, [form]);

  // ── Fetch student's submissions ────────────────────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    if (!account) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/requests?studentAddress=${account}`);
      const data = await res.json();
      if (data.success) setSubmissions(data.data);
    } catch (err) {
      console.error('[StudentDashboard] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 30_000);
    return () => clearInterval(interval);
  }, [fetchSubmissions]);

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) { toast.error('Please connect your wallet first.'); return; }
    if (!form.studentName || !form.courseName || !form.issuerName) {
      toast.error('Name, Course, and Issuer are required.');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Submitting your request...');
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, grade: form.grade || 'Pass', studentAddress: account }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Request submitted! Awaiting admin approval.', { id: toastId, duration: 5000 });
      setForm({ studentName: '', studentEmail: '', courseName: '', grade: '', issuerName: '' });
      fetchSubmissions();
    } catch (err) {
      toast.error(err.message || 'Submission failed.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Not connected state ────────────────────────────────────────────────────
  if (!account) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="glass border border-black/5 dark:border-white/[0.06] rounded-2xl p-10 text-center max-w-md w-full">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Student Portal</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Connect your MetaMask wallet to submit certificate requests and track your status.
          </p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary w-full"
          >
            {isConnecting ? 'Connecting...' : '🦊 Connect Wallet'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="mt-3 text-sm text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
          Student Portal
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-400 bg-clip-text text-transparent">
          Request a Certificate
        </h1>
        <p className="mt-3 max-w-xl mx-auto text-slate-600 dark:text-slate-400 text-sm">
          Submit your details below. An authorized admin will review and mint your certificate on the blockchain.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Request Form (7 cols) ─────────────────────────────────────── */}
        <div className="lg:col-span-7 glass border border-black/5 dark:border-white/[0.06] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span>📝</span> New Certificate Request
          </h2>

          {/* Wallet info row */}
          <div className="p-3 mb-5 bg-black/[0.04] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.04] rounded-lg text-xs flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Connected Wallet</span>
            <span className="font-mono text-blue-600 dark:text-blue-400">{account.slice(0, 8)}...{account.slice(-6)}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Full Name *
              </label>
              <input
                name="studentName" value={form.studentName} onChange={handleChange}
                placeholder="e.g. Priya Sharma"
                required
                className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition"
              />
            </div>

            {/* Email + Grade row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Email</label>
                <input
                  name="studentEmail" type="email" value={form.studentEmail} onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Grade / GPA</label>
                <input
                  name="grade" value={form.grade} onChange={handleChange}
                  placeholder="e.g. A+ or 9.1 CGPA"
                  className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition"
                />
              </div>
            </div>

            {/* Course */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Course / Degree Title *
              </label>
              <input
                name="courseName" value={form.courseName} onChange={handleChange}
                placeholder="e.g. Bachelor of Technology in Computer Science"
                required
                className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition"
              />
            </div>

            {/* Issuer */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Issuing Institution *
              </label>
              <input
                name="issuerName" value={form.issuerName} onChange={handleChange}
                placeholder="e.g. MIT · Stanford University"
                required
                className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition"
              />
            </div>

            {/* Live hash preview */}
            {calculatedHash && (
              <div className="p-4 bg-blue-500/[0.07] dark:bg-blue-500/5 border border-blue-500/30 dark:border-blue-500/20 rounded-xl animate-slide-up space-y-1">
                <span className="block text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Preview Certificate ID (Keccak-256)
                </span>
                <span className="block font-mono text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 break-all select-all">
                  {calculatedHash}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-500">
                  This hash uniquely identifies your certificate. Any change in details changes the hash.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 mt-2
                bg-gradient-to-r from-blue-500 to-cyan-500
                hover:from-blue-400 hover:to-cyan-400
                shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]
                disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : '📤 Submit Certificate Request'}
            </button>
          </form>
        </div>

        {/* ── Submissions Sidebar (5 cols) ──────────────────────────────── */}
        <div className="lg:col-span-5 glass border border-black/5 dark:border-white/[0.06] rounded-2xl p-6 flex flex-col max-h-[680px]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋</span> My Submissions
            </h3>
            <button
              onClick={fetchSubmissions}
              disabled={isLoading}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          <div className="overflow-y-auto flex-1 space-y-3 pr-1 custom-scrollbar">
            {isLoading && submissions.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-3xl mb-3">📭</div>
                <p className="text-slate-500 dark:text-slate-500 text-xs">No requests yet. Submit one above!</p>
              </div>
            ) : (
              submissions.map((req) => (
                <div
                  key={req._id}
                  className="p-4 bg-black/[0.03] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.04]
                    hover:border-blue-500/30 transition-all rounded-xl text-xs space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{req.courseName}</p>
                      <p className="text-slate-500 dark:text-slate-500">{req.issuerName}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  {req.grade && (
                    <div className="text-slate-600 dark:text-slate-400">Grade: <span className="text-slate-900 dark:text-white font-medium">{req.grade}</span></div>
                  )}

                  <div className="pt-1.5 border-t border-black/[0.06] dark:border-white/[0.03] flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {req.txHash && (
                      <a
                        href={contractInfo.network === 'localhost' ? '#' : `https://sepolia.etherscan.io/tx/${req.txHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        View Tx ↗
                      </a>
                    )}
                  </div>

                  {req.certificateId && (
                    <div className="pt-1">
                      <span className="block text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1">Certificate ID</span>
                      <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 break-all">{req.certificateId.slice(0, 20)}...</span>
                    </div>
                  )}

                  {req.adminNote && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                      Note: {req.adminNote}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
