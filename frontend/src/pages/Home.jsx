/**
 * Home.jsx — Landing Page
 *
 * Showcases the product value proposition with:
 *  - Hero headline with gradient text
 *  - Three feature cards (glassmorphism)
 *  - CTA buttons linking to Issue and Verify pages
 *
 * Full interactive content will be polished in Phase 4.
 */

import { Link } from 'react-router-dom';

// ── Feature card data ────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🔗',
    title: 'On-Chain Immutability',
    description:
      'Every certificate hash is permanently recorded on the Ethereum blockchain. Once issued, it cannot be altered or deleted — providing a tamper-proof audit trail.',
    gradient: 'from-purple-500/20 to-blue-500/20',
    border:   'border-purple-500/20',
  },
  {
    icon: '✅',
    title: 'Instant Verification',
    description:
      'Employers and institutions can verify any certificate in seconds by entering its unique ID. No phone calls, no waiting — just instant cryptographic proof.',
    gradient: 'from-emerald-500/20 to-cyan-500/20',
    border:   'border-emerald-500/20',
  },
  {
    icon: '🔒',
    title: 'Decentralized & Trustless',
    description:
      'Verification requires no trust in a central authority. The smart contract logic is transparent, open-source, and runs autonomously on the blockchain.',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    border:   'border-blue-500/20',
  },
];

/**
 * Home page component
 */
export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="text-center mb-20 animate-slide-up">
        {/* Eyebrow label */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30
                        bg-purple-500/10 text-purple-400 text-sm font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
          Powered by Ethereum Smart Contracts
        </div>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Certificates You Can{' '}
          <span className="text-gradient-primary">Trust Forever</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-slate-600 dark:text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Issue tamper-proof academic certificates on the blockchain and let anyone
          verify them instantly — no middlemen, no forgeries.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/issue" id="cta-issue-certificate" className="btn-primary text-base px-8 py-3.5">
            🎓 Issue Certificate
          </Link>
          <Link to="/verify" id="cta-verify-certificate" className="btn-secondary text-base px-8 py-3.5">
            🔍 Verify Certificate
          </Link>
        </div>
      </section>

      {/* ── Feature Cards ─────────────────────────────────────────────────── */}
      <section aria-labelledby="features-heading" className="mb-20">
        <h2 id="features-heading" className="sr-only">Key Features</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => (
            <article
              key={feat.title}
              className={`glass rounded-2xl p-6 border ${feat.border} transition-transform duration-300 hover:-translate-y-1`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Icon with gradient background */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center text-2xl mb-4`}>
                {feat.icon}
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">{feat.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{feat.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section aria-labelledby="how-it-works-heading" className="text-center">
        <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-12">
          How It Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-purple-500/40 via-blue-500/40 to-emerald-500/40" />

          {[
            { step: '01', label: 'University connects wallet & fills in student details' },
            { step: '02', label: 'Smart contract records the certificate hash on-chain' },
            { step: '03', label: 'Anyone verifies instantly using the Certificate ID' },
          ].map(({ step, label }) => (
            <div key={step} className="flex flex-col items-center gap-4">
              <div className="relative z-10 w-16 h-16 rounded-full glass border border-purple-500/30 flex items-center justify-center">
                <span className="text-gradient-primary font-bold text-lg">{step}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-sm max-w-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
