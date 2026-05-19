/**
 * IssuePage.jsx — Issuer Dashboard
 *
 * This portal allows authorized university administrators to issue certificates:
 *  1. Generates a deterministic Keccak-256 hash (Certificate ID) from student details.
 *  2. Triggers the smart contract to record this hash on the blockchain.
 *  3. Once confirmed, saves the human-readable metadata off-chain to the Express/MongoDB backend.
 *  4. Displays a real-time list of certificates issued by the connected wallet.
 */

import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import contractInfo from '../contracts/CertificateRegistry.json';

const API_BASE_URL = 'http://localhost:5000/api';

export default function IssuePage() {
  const { account, signer, provider, isCorrectNetwork, chainName } = useWeb3();

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
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">
          Issuer Dashboard
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-slate-400 text-sm sm:text-base">
          Generate tamper-proof academic credentials, write them onto the immutable blockchain ledger, and store metadata securely off-chain.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Issuance Form Card (7 Columns) */}
        <div className="lg:col-span-7 glass border border-white/[0.06] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>🎓</span> Issue New Certificate
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Connected Account Info */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Issuer Wallet:</span>
                <span className="text-purple-400 font-mono">{account ? `${account.slice(0, 8)}...${account.slice(-8)}` : 'Not Connected'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Active Network:</span>
                <span className="text-blue-400">{chainName}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Student Full Name *</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Johnathan Smith"
                required
                className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Student Email</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Grade / GPA / Classification</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. A+ or First Class"
                  className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Course / Degree Title *</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Bachelor of Science in Software Engineering"
                required
                className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issuer Institution Name *</label>
              <input
                type="text"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="e.g. Global Tech University"
                required
                className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
            </div>

            {/* Cryptographic Hash Showcase */}
            {calculatedHash && (
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl animate-fade-in space-y-1">
                <span className="block text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Generated Cryptographic Hash (Certificate ID)</span>
                <span className="block font-mono text-[10px] sm:text-xs text-slate-300 break-all select-all">{calculatedHash}</span>
                <span className="block text-[10px] text-slate-500">This hash is mathematically unique. If you change a single letter in the student's name, the hash will change completely (avoids identity fraud).</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isIssuing || !account}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIssuing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing blockchain tx...
                </>
              ) : !account ? (
                'Connect Wallet to Issue'
              ) : (
                'Generate Hash & Issue Certificate'
              )}
            </button>
          </form>
        </div>

        {/* Issuer History Sidebar (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status Badge card */}
          <div className="glass border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-slate-300">Issuer Quick Guide</h3>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed list-disc list-inside">
              <li>Deploying requires gas in your Ethereum account (ETH).</li>
              <li>Only universities added as authorized issuers in the Registry contract can issue.</li>
              <li>You can view verification results instantly on the public portal.</li>
            </ul>
          </div>

          {/* History List Card */}
          <div className="glass border border-white/[0.06] rounded-2xl p-6 flex flex-col max-h-[580px]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>🕒 Recently Issued</span>
              <button 
                onClick={fetchHistory}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                disabled={isHistoryLoading}
              >
                Refresh
              </button>
            </h3>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1 custom-scrollbar">
              {isHistoryLoading ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Loading history...
                </div>
              ) : !account ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Connect wallet to view history
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No certificates issued by this account yet.
                </div>
              ) : (
                history.map((cert) => (
                  <div 
                    key={cert.certificateId} 
                    className="p-3 bg-white/[0.02] border border-white/[0.04] hover:border-purple-500/20 hover:bg-white/[0.04] transition-all rounded-xl text-xs space-y-2 group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-white truncate max-w-[150px]">{cert.studentName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="text-slate-400 truncate">{cert.courseName}</div>
                    
                    <div className="pt-1 flex items-center justify-between border-t border-white/[0.03]">
                      <span className="text-[10px] font-mono text-purple-400/80 truncate max-w-[120px]">
                        ID: {cert.certificateId.slice(0, 10)}...
                      </span>
                      {cert.txHash && (
                        <a 
                          href={contractInfo.network === 'localhost' ? '#' : `https://sepolia.etherscan.io/tx/${cert.txHash}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-500 group-hover:text-purple-400 transition-colors flex items-center gap-1"
                        >
                          Tx Link ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
