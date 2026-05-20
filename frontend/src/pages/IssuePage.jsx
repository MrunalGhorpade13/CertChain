/**
 * IssuePage.jsx — Admin Issuer Dashboard
 *
 * Tabbed interface:
 *  Tab 1 — Pending Requests: student submissions to review & mint on-chain
 *  Tab 2 — Manual Issuance:  existing form to issue certificates directly
 */

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import contractInfo from '../contracts/CertificateRegistry.json';

const API_BASE_URL = 'http://localhost:5000/api';

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Pending:  { cls: 'badge-pending',  icon: '⏳' },
    Approved: { cls: 'badge-verified', icon: '✅' },
    Rejected: { cls: 'badge-invalid',  icon: '❌' },
  };
  const { cls, icon } = map[status] ?? map.Pending;
  return <span className={cls}>{icon} {status}</span>;
}

export default function IssuePage() {
  const { account, signer, provider, isCorrectNetwork, chainName } = useWeb3();

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'manual'

  // ── Pending requests state ────────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);

  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE_URL}/requests?status=Pending`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (err) {
      console.error('[IssuePage] fetch requests error:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Approve & Mint ────────────────────────────────────────────────────────
  const handleApprove = async (req) => {
    if (!account || !signer) { toast.error('Connect wallet first.'); return; }
    setApprovingId(req._id);
    const toastId = toast.loading(`Minting certificate for ${req.studentName}...`);
    try {
      if (!isCorrectNetwork) throw new Error('Switch MetaMask to the correct network.');

      const certId = ethers.solidityPackedKeccak256(
        ['string', 'string', 'string', 'string', 'string'],
        [req.studentName.trim(), (req.studentEmail || '').trim().toLowerCase(),
         req.courseName.trim(), (req.grade || 'Pass').trim(), req.issuerName.trim()]
      );

      const contract = new ethers.Contract(contractInfo.contractAddress, contractInfo.abi, signer);
      const isAuthorized = await contract.isAuthorizedIssuer(account);
      if (!isAuthorized) throw new Error('Your wallet is not authorized to issue certificates.');

      const [exists] = await contract.verifyCertificate(certId);
      if (exists) throw new Error('Certificate already exists on-chain.');

      toast.loading('Confirm in MetaMask...', { id: toastId });
      const tx = await contract.issueCertificate(certId);
      toast.loading('Waiting for confirmation...', { id: toastId });
      const receipt = await tx.wait(1);
      const txHash = receipt.hash;

      // Save metadata to backend
      await fetch(`${API_BASE_URL}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId: certId, studentName: req.studentName,
          studentEmail: req.studentEmail, courseName: req.courseName,
          grade: req.grade || 'Pass', issuerName: req.issuerName,
          issuerAddress: account.toLowerCase(), txHash,
        }),
      });

      // Update request status
      await fetch(`${API_BASE_URL}/requests/${req._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved', txHash, certificateId: certId }),
      });

      toast.success(`Certificate minted for ${req.studentName}!`, { id: toastId, duration: 6000 });
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Minting failed.', { id: toastId, duration: 6000 });
    } finally {
      setApprovingId(null);
    }
  };

  // ── Reject request ────────────────────────────────────────────────────────
  const handleReject = async (req) => {
    setRejectingId(req._id);
    try {
      await fetch(`${API_BASE_URL}/requests/${req._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', adminNote: rejectNote }),
      });
      toast('Request rejected.', { icon: '❌' });
      setRejectTarget(null);
      setRejectNote('');
      fetchRequests();
    } catch (err) {
      toast.error('Failed to reject request.');
    } finally {
      setRejectingId(null);
    }
  };



  // Form fields state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [courseName, setCourseName] = useState('');
  const [grade, setGrade] = useState('');
  const [issuerName, setIssuerName] = useState('');

  // UI state
  const [isIssuing, setIsIssuing] = useState(false);
  const [calculatedHash, setCalculatedHash] = useState('');
  const [history, setHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Fetch history of certificates issued by this account
  const fetchHistory = async () => {
    if (!account) return;
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/certificates?issuer=${account}`);
      const result = await response.json();
      if (result.success) {
        setHistory(result.data);
      }
    } catch (err) {
      console.error('Error fetching issuer history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [account]);

  // Recalculate hash dynamically as user types to show Web3 interactivity
  useEffect(() => {
    if (studentName && courseName && issuerName) {
      try {
        const hash = ethers.solidityPackedKeccak256(
          ['string', 'string', 'string', 'string', 'string'],
          [
            studentName.trim(),
            studentEmail.trim().toLowerCase(),
            courseName.trim(),
            grade.trim() || 'Pass',
            issuerName.trim()
          ]
        );
        setCalculatedHash(hash);
      } catch (err) {
        console.error('Error generating hash:', err);
      }
    } else {
      setCalculatedHash('');
    }
  }, [studentName, studentEmail, courseName, grade, issuerName]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) {
      toast.error('Please connect your Web3 wallet first.');
      return;
    }

    if (!studentName || !courseName || !issuerName) {
      toast.error('Please fill in Student Name, Course, and Issuer Name.');
      return;
    }

    setIsIssuing(true);
    const toastId = toast.loading('Initiating certificate issuance...');

    try {
      // 1. Double check network (avoid deploying to incorrect chain)
      if (!isCorrectNetwork) {
        throw new Error(`You are connected to an unsupported chain. Please switch MetaMask to Sepolia or Local Host.`);
      }

      // 2. Generate final deterministic hash (Certificate ID)
      const certId = ethers.solidityPackedKeccak256(
        ['string', 'string', 'string', 'string', 'string'],
        [
          studentName.trim(),
          studentEmail.trim().toLowerCase(),
          courseName.trim(),
          grade.trim() || 'Pass',
          issuerName.trim()
        ]
      );

      toast.loading('Checking blockchain status...', { id: toastId });

      // 3. Setup Contract instance
      const contract = new ethers.Contract(
        contractInfo.contractAddress,
        contractInfo.abi,
        signer
      );

      // Verify caller is authorized on-chain first
      const isAuthorized = await contract.isAuthorizedIssuer(account);
      if (!isAuthorized) {
        throw new Error('Your wallet address is not authorized to issue certificates on this contract.');
      }

      // Verify certificate doesn't already exist on-chain
      const [exists] = await contract.verifyCertificate(certId);
      if (exists) {
        throw new Error('This certificate hash already exists on-chain. Cannot issue duplicates.');
      }

      toast.loading('Confirm transaction in MetaMask...', { id: toastId });

      // 4. Trigger smart contract issuance
      const tx = await contract.issueCertificate(certId);

      toast.loading('Waiting for blockchain confirmation...', { id: toastId });

      // Wait for 1 confirmation
      const receipt = await tx.wait(1);
      const txHash = receipt.hash;

      toast.loading('Saving off-chain metadata to database...', { id: toastId });

      // 5. Save metadata to MongoDB/Backend
      const metadataPayload = {
        certificateId: certId,
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim().toLowerCase(),
        courseName: courseName.trim(),
        grade: grade.trim() || 'Pass',
        issuerName: issuerName.trim(),
        issuerAddress: account.toLowerCase(),
        txHash
      };

      const response = await fetch(`${API_BASE_URL}/certificates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadataPayload)
      });

      const backendResult = await response.json();

      if (!backendResult.success) {
        throw new Error(backendResult.message || 'Failed to save metadata to backend');
      }

      // 6. Success handling
      toast.success('Certificate issued successfully on-chain!', { id: toastId, duration: 6000 });

      // Reset form
      setStudentName('');
      setStudentEmail('');
      setCourseName('');
      setGrade('');
      setIssuerName('');
      setCalculatedHash('');

      // Refresh list
      fetchHistory();

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Transaction failed.', { id: toastId, duration: 6000 });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-xs font-semibold text-purple-700 dark:text-purple-400 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse" />
          Admin Portal
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">
          Issuer Dashboard
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-sm sm:text-base">
          Review student requests, approve on-chain minting, or issue certificates manually.
        </p>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 glass border border-black/5 dark:border-white/[0.06] rounded-xl w-fit mx-auto mb-8">
        {[
          { id: 'requests', label: '📋 Pending Requests', badge: requests.length },
          { id: 'manual',   label: '🎓 Manual Issuance' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500 text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Pending Requests Tab ──────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isLoadingRequests ? 'Loading...' : `${requests.length} pending request(s)`}
            </p>
            <button
              onClick={fetchRequests}
              disabled={isLoadingRequests}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>

          {requests.length === 0 && !isLoadingRequests && (
            <div className="glass border border-black/5 dark:border-white/[0.06] rounded-2xl p-16 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No pending requests</p>
              <p className="text-xs text-slate-500 mt-1">All student requests have been processed.</p>
            </div>
          )}

          {requests.map(req => (
            <div
              key={req._id}
              className="glass border border-black/5 dark:border-white/[0.06] hover:border-purple-500/20 rounded-2xl p-6 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-white">{req.studentName}</h3>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{req.courseName}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-500 pt-1">
                    {req.studentEmail && <span>✉ {req.studentEmail}</span>}
                    {req.grade && <span>📊 {req.grade}</span>}
                    <span>🏛 {req.issuerName}</span>
                    <span>👛 {req.studentAddress?.slice(0,8)}...{req.studentAddress?.slice(-6)}</span>
                    <span>📅 {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  {rejectTarget === req._id ? (
                    <div className="flex items-center gap-2 animate-slide-up">
                      <input
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        placeholder="Reason (optional)"
                        className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700
                          bg-white/80 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleReject(req)}
                        disabled={rejectingId === req._id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400
                          border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        {rejectingId === req._id ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setRejectTarget(req._id)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold border border-red-500/20
                          text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        ✕ Reject
                      </button>
                      <button
                        id={`btn-approve-${req._id}`}
                        onClick={() => handleApprove(req)}
                        disabled={approvingId === req._id || !account}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white
                          bg-gradient-to-r from-purple-500 to-blue-500
                          hover:from-purple-400 hover:to-blue-400
                          shadow-[0_0_16px_rgba(139,92,246,0.3)]
                          disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      >
                        {approvingId === req._id ? '⛏ Minting...' : '✓ Approve & Mint'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Manual Issuance Tab ───────────────────────────────────────────── */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Issuance Form Card (7 Columns) */}
          <div className="lg:col-span-7 glass border border-black/5 dark:border-white/[0.06] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span>🎓</span> Issue New Certificate
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Connected Account Info */}
              <div className="p-3 bg-black/[0.04] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.04] rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Issuer Wallet:</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono">{account ? `${account.slice(0, 8)}...${account.slice(-8)}` : 'Not Connected'}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Active Network:</span>
                  <span className="text-blue-600 dark:text-blue-400">{chainName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Student Full Name *</label>
                <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Johnathan Smith" required className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Student Email</label>
                  <input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="student@example.com" className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Grade / GPA / Classification</label>
                  <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. A+ or First Class" className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Course / Degree Title *</label>
                <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Bachelor of Science in Software Engineering" required className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Issuer Institution Name *</label>
                <input type="text" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} placeholder="e.g. Global Tech University" required className="w-full bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm" />
              </div>

              {calculatedHash && (
                <div className="p-4 bg-purple-500/[0.07] dark:bg-purple-500/5 border border-purple-500/30 dark:border-purple-500/20 rounded-xl space-y-1">
                  <span className="block text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Generated Cryptographic Hash (Certificate ID)</span>
                  <span className="block font-mono text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 break-all select-all">{calculatedHash}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-500">This hash is mathematically unique. Changing a single character changes it entirely.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isIssuing || !account}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isIssuing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing blockchain tx...
                  </>
                ) : !account ? 'Connect Wallet to Issue' : 'Generate Hash & Issue Certificate'}
              </button>
            </form>
          </div>

          {/* Issuer History Sidebar (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass border border-black/5 dark:border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Issuer Quick Guide</h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed list-disc list-inside">
                <li>Deploying requires gas in your Ethereum account (ETH).</li>
                <li>Only universities added as authorized issuers in the Registry contract can issue.</li>
                <li>You can view verification results instantly on the public portal.</li>
              </ul>
            </div>

            <div className="glass border border-black/5 dark:border-white/[0.06] rounded-2xl p-6 flex flex-col max-h-[580px]">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                <span>🕒 Recently Issued</span>
                <button onClick={fetchHistory} className="text-xs text-purple-400 hover:text-purple-300 transition-colors" disabled={isHistoryLoading}>Refresh</button>
              </h3>

              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {isHistoryLoading ? (
                  <div className="py-8 text-center text-slate-500 text-xs">Loading history...</div>
                ) : !account ? (
                  <div className="py-8 text-center text-slate-500 text-xs">Connect wallet to view history</div>
                ) : history.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">No certificates issued by this account yet.</div>
                ) : (
                  history.map((cert) => (
                    <div key={cert.certificateId} className="p-3 bg-black/[0.03] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.04] hover:border-purple-500/20 transition-all rounded-xl text-xs space-y-2 group">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{cert.studentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(cert.issueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 truncate">{cert.courseName}</div>
                      <div className="pt-1 flex items-center justify-between border-t border-black/[0.05] dark:border-white/[0.03]">
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400/80 truncate max-w-[120px]">ID: {cert.certificateId.slice(0, 10)}...</span>
                        {cert.txHash && (
                          <a href={contractInfo.network === 'localhost' ? '#' : `https://sepolia.etherscan.io/tx/${cert.txHash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Tx Link ↗</a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

