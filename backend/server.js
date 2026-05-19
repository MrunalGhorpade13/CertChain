/**
 * server.js — Express Application Entry Point
 *
 * Responsibilities:
 *  - Load environment variables from .env
 *  - Connect to MongoDB
 *  - Configure Express middleware (CORS, JSON parsing)
 *  - Mount API route handlers
 *  - Start the HTTP server
 *
 * Run:  node server.js        (production)
 *       npx nodemon server.js (development with hot-reload)
 */

import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';

// Import database connection utility
import connectDB from './src/config/db.js';

// Import route handlers (to be expanded in Phase 3)
import certificateRoutes from './src/routes/certificates.js';

// ── Load environment variables from .env file ────────────────────────────
dotenv.config();

// ── Connect to MongoDB (async, non-blocking server start) ────────────────
connectDB();

// ── Initialise Express app ────────────────────────────────────────────────
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────

/**
 * CORS — Allow requests from the Vite dev server (port 5173) and any
 * production origin. Adjust ALLOWED_ORIGINS in production.
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev server
  'http://localhost:5174',   // Vite dev server backup 1
  'http://localhost:5175',   // Vite dev server backup 2
  'http://localhost:4173',   // Vite preview
  process.env.FRONTEND_URL, // Production frontend URL (set in .env)
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, Postman, mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * Health-check endpoint — useful for deployment monitoring tools.
 * GET /api/health → { status: 'ok', timestamp: '...' }
 */
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'CertChain API',
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
  });
});

/**
 * Certificate routes — handles CRUD operations for certificate metadata.
 * All routes are prefixed with /api/certificates
 */
app.use('/api/certificates', certificateRoutes);

// ── Global Error Handler ──────────────────────────────────────────────────
// Must be AFTER all routes (4 parameters = Express error handler)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    // Only expose stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── 404 Handler — must be after all routes ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ── Start the HTTP Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   CertChain API Server                ║
  ║   Running on: http://localhost:${PORT}   ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
  ╚═══════════════════════════════════════╝
  `);
});

export default app;
