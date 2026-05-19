/**
 * VerifyPage.jsx — Public Certificate Verification Portal
 *
 * This portal allows anyone (no wallet required) to verify a certificate's validity.
 * It offers two modes of verification:
 *  1. Search by Certificate ID (Hash) — queries contract, then pulls backend metadata.
 *  2. Upload Certificate JSON Metadata — hashes the file contents and verifies the hash.
 */

import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import contractInfo from '../contracts/CertificateRegistry.json';

const API_BASE_URL = 'http://localhost:5000/api';

export default function VerifyPage() {
  const { provider } = useWeb3();

  // Search input state
  const [certIdInput, setCertIdInput] = useState('');
  
  // UI states
  const [activeTab, setActiveTab] = useState('hash'); // 'hash' or 'file'
  const [isVerifying, setIsVerifying] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Verification Results state
  const [verificationResult, setVerificationResult] = useState(null); // 'valid', 'revoked', 'invalid', 'missing-metadata'
  const [blockchainRecord, setBlockchainRecord] = useState(null);
  const [metadataRecord, setMetadataRecord] = useState(null);

  // Setup Provider fallback (so users don't need MetaMask to verify)
  const getProvider = () => {
    if (provider) return provider;
    
    if (contractInfo.network === 'localhost') {
      return new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    } else {
      // Sepolia public RPC node
      return new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    }
  };

  const handleVerify = async (hashToVerify) => {
    const cleanHash = hashToVerify.trim();
    
    // Basic validation
    if (!cleanHash || !/^0x[a-fA-F0-9]{64}$/.test(cleanHash)) {
      toast.error('Invalid format. Certificate ID must be a 32-byte hex hash (starting with 0x).');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setBlockchainRecord(null);
    setMetadataRecord(null);

    const toastId = toast.loading('Querying Ethereum blockchain...');

    try {
      const activeProvider = getProvider();
      
      const contract = new ethers.Contract(
        contractInfo.contractAddress,
        contractInfo.abi,
        activeProvider
      );

      // 1. Call verifyCertificate in smart contract (view function - zero gas)
      const [exists, issuer, timestamp, isRevoked] = await contract.verifyCertificate(cleanHash);

      if (!exists) {
        setVerificationResult('invalid');
        toast.error('Certificate not found on-chain.', { id: toastId });
        setIsVerifying(false);
        return;
      }

      setBlockchainRecord({
        exists,
        issuer,
        timestamp: Number(timestamp),
        isRevoked
      });

      if (isRevoked) {
        setVerificationResult('revoked');
        toast.error('Warning: This certificate has been revoked!', { id: toastId });
        setIsVerifying(false);
        return;
      }

      toast.loading('Fetching off-chain metadata...', { id: toastId });

      // 2. Fetch metadata from Express backend
      const response = await fetch(`${API_BASE_URL}/certificates/${cleanHash}`);
      const result = await response.json();

      if (result.success) {
        setMetadataRecord(result.data);
        setVerificationResult('valid');
        toast.success('Certificate verified successfully!', { id: toastId });
      } else {
        // Blockchain record exists, but metadata is missing
        setVerificationResult('missing-metadata');
        toast.error('On-chain record found, but metadata is unavailable.', { id: toastId });
      }

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to complete verification.', { id: toastId });
    } finally {
      setIsVerifying(false);
    }
  };

  // Drag and Drop handlers for file verification
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast.error('Please upload a valid JSON metadata file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        
        // Ensure all required fields for hash calculation are present
        const { studentName, studentEmail, courseName, grade, issuerName } = json;
        if (!studentName || !courseName || !issuerName) {
          throw new Error('Missing core parameters. JSON must contain studentName, courseName, and issuerName.');
        }

        // Generate the deterministic Solidity Keccak-256 hash
        const certHash = ethers.solidityPackedKeccak256(
          ['string', 'string', 'string', 'string', 'string'],
          [
            studentName.trim(),
            (studentEmail || '').trim().toLowerCase(),
            courseName.trim(),
            grade.trim() || 'Pass',
            issuerName.trim()
          ]
        );

        toast.success(`Hashed successfully! Certificate ID: ${certHash.slice(0, 12)}...`);
        setCertIdInput(certHash);
        setActiveTab('hash'); // Switch to search tab
        handleVerify(certHash);

      } catch (err) {
        toast.error(`Invalid file format: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
          Certificate Verification Portal
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-slate-400 text-sm sm:text-base">
          Verify academic credentials directly against the smart contract registry. Complete transparency without registration.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-900/50 p-1 border border-white/[0.05] rounded-xl flex gap-1">
          <button
            onClick={() => setActiveTab('hash')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'hash' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔍 Search by ID Hash
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'file' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            📄 Verify Metadata JSON File
          </button>
        </div>
      </div>

      <div className="glass border border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {activeTab === 'hash' ? (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Enter Certificate ID (32-byte hash)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="verify-cert-id-input"
                type="text"
                value={certIdInput}
                onChange={(e) => setCertIdInput(e.target.value)}
                placeholder="e.g. 0xabcdef1234567890..."
                className="input-glass flex-1 font-mono text-xs sm:text-sm"
              />
              <button
                id="verify-submit-btn"
                onClick={() => handleVerify(certIdInput)}
                disabled={isVerifying || !certIdInput}
                className="btn-primary bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500/30 px-6 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        ) : (
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive ? 'border-emerald-400 bg-emerald-500/5' : 'border-white/[0.08] hover:border-slate-500/50 bg-slate-900/10'
            }`}
          >
            <input 
              type="file" 
              id="file-upload" 
              accept=".json"
              onChange={handleFileChange}
              className="hidden" 
            />
            
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl mx-auto mb-4">
              📥
            </div>
            
            <p className="text-sm font-semibold text-white mb-1">
              Drag & Drop your JSON metadata file here
            </p>
            <p className="text-xs text-slate-400 mb-4">
              or browse your computer to compute and verify the hash instantly
            </p>
            
            <label 
              htmlFor="file-upload" 
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer inline-block"
            >
              Choose JSON File
            </label>
          </div>
        )}
      </div>

      {/* VERIFICATION DISPLAY CONTAINER */}
      {verificationResult && (
        <div className="animate-scale-in">
          {/* 🟢 VALID & VERIFIED CERTIFICATE DISPLAY */}
          {verificationResult === 'valid' && metadataRecord && (
            <div className="glass border border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
              
              {/* Verified Shield Banner */}
              <div className="flex flex-col items-center text-center mb-8 border-b border-white/[0.06] pb-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  🛡️
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-extrabold uppercase tracking-widest animate-pulse">
                  ✓ Verified Secure
                </div>
                <h2 className="text-2xl font-bold text-white mt-4">Academic Certificate Verification</h2>
                <p className="text-xs text-slate-500 mt-1 font-mono break-all max-w-lg">
                  ID: {metadataRecord.certificateId}
                </p>
              </div>

              {/* Certificate Inner Card layout */}
              <div className="space-y-6 max-w-2xl mx-auto border border-amber-500/10 bg-amber-500/[0.01] p-6 rounded-2xl relative">
                {/* Watermark/Logo */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] text-[120px] font-bold pointer-events-none select-none">
                  VERIFIED
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">This is to certify that</span>
                  <div className="text-2xl font-serif text-amber-200 font-bold tracking-wide py-2">
                    {metadataRecord.studentName}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">has successfully completed the course</span>
                  <div className="text-lg font-bold text-white tracking-wide py-1">
                    {metadataRecord.courseName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center border-t border-white/[0.05] pt-6">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Grade / Classification</span>
                    <span className="text-sm font-semibold text-slate-200">{metadataRecord.grade || 'Pass'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Date of Issuance</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {new Date(metadataRecord.issueDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-center border-t border-white/[0.05] pt-6">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Authorized Issuing Body</span>
                  <span className="text-sm font-bold text-emerald-400">{metadataRecord.issuerName}</span>
                </div>
              </div>

              {/* Technical Audit Trail Accordion/Section */}
              <div className="mt-8 border-t border-white/[0.06] pt-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Blockchain Audit Trail</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono">
                  <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-lg space-y-1">
                    <span className="text-slate-500 block">On-Chain Registry Address:</span>
                    <span className="text-slate-300 break-all">{contractInfo.contractAddress}</span>
                  </div>
                  <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-lg space-y-1">
                    <span className="text-slate-500 block">Issuer Smart Wallet:</span>
                    <span className="text-slate-300 break-all">{blockchainRecord.issuer}</span>
                  </div>
                  {metadataRecord.txHash && (
                    <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-lg md:col-span-2 space-y-1">
                      <span className="text-slate-500 block">Ethereum Transaction Hash:</span>
                      <a
                        href={contractInfo.network === 'localhost' ? '#' : `https://sepolia.etherscan.io/tx/${metadataRecord.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline break-all block"
                      >
                        {metadataRecord.txHash} ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 🟡 REVOKED CERTIFICATE DISPLAY */}
          {verificationResult === 'revoked' && blockchainRecord && (
            <div className="glass border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center bg-amber-500/[0.02] shadow-[0_0_40px_rgba(245,158,11,0.08)]">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mx-auto mb-4">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-amber-500">Certificate Revoked</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                This certificate was recorded on the Ethereum blockchain, but it has since been **REVOKED** by the original issuing institution.
              </p>
              <div className="mt-5 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[11px] font-mono text-left max-w-lg mx-auto space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Issuer Wallet:</span>
                  <span className="text-slate-300">{blockchainRecord.issuer.slice(0, 10)}...{blockchainRecord.issuer.slice(-10)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Revocation Status:</span>
                  <span className="text-amber-400 font-semibold">Active Revocation Event</span>
                </div>
              </div>
            </div>
          )}

          {/* 🔴 INVALID / NOT FOUND DISPLAY */}
          {verificationResult === 'invalid' && (
            <div className="glass border border-red-500/30 rounded-2xl p-6 sm:p-8 text-center bg-red-500/[0.02] shadow-[0_0_40px_rgba(239,68,68,0.08)]">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl mx-auto mb-4">
                ❌
              </div>
              <h3 className="text-xl font-bold text-red-500">Verification Failed</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                No record of this certificate hash exists on the Ethereum blockchain registry. It may be forged or entered incorrectly.
              </p>
            </div>
          )}

          {/* 🔵 PARTIAL VERIFICATION DISPLAY (On-Chain exists, Metadata Missing) */}
          {verificationResult === 'missing-metadata' && blockchainRecord && (
            <div className="glass border border-blue-500/30 rounded-2xl p-6 sm:p-8 text-center bg-blue-500/[0.02] shadow-[0_0_40px_rgba(59,130,246,0.08)]">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-4">
                🔗
              </div>
              <h3 className="text-xl font-bold text-blue-400">On-Chain Record Verified</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                The cryptographic hash of this certificate exists on the Ethereum blockchain registry, but the readable off-chain metadata (student name, course, grades) could not be retrieved from the server.
              </p>
              
              <div className="mt-5 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[11px] font-mono text-left max-w-lg mx-auto space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">On-Chain Registry:</span>
                  <span className="text-slate-300">Verified Exist = True</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registrar Wallet:</span>
                  <span className="text-slate-300">{blockchainRecord.issuer.slice(0, 10)}...{blockchainRecord.issuer.slice(-10)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp of Entry:</span>
                  <span className="text-slate-300">{new Date(blockchainRecord.timestamp * 1000).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
