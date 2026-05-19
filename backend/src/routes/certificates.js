/**
 * certificates.js — Express Router for Certificate API Endpoints
 *
 * Base path: /api/certificates  (mounted in server.js)
 *
 * Routes (Phase 1 stubs — fully implemented in Phase 3):
 *
 *  POST   /api/certificates        → Save new certificate metadata (off-chain)
 *  GET    /api/certificates/:id    → Fetch certificate metadata by Certificate ID
 *  GET    /api/certificates        → List all certificates by issuer (admin use)
 *
 * All routes will return JSON in the shape:
 *   { success: true,  data: {...} }    on success
 *   { success: false, message: '...' } on error
 */

import { Router } from 'express';
import Certificate from '../models/Certificate.js';
import MockCertificate from '../config/mockDb.js';

const router = Router();
const getModel = () => global.useMockDb ? MockCertificate : Certificate;

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/certificates
   Save off-chain metadata for a newly issued certificate.
   Called AFTER the smart contract transaction is confirmed on-chain.
   ─────────────────────────────────────────────────────────────────────── */
router.post('/', async (req, res, next) => {
  try {
    const {
      certificateId,
      studentName,
      studentEmail,
      courseName,
      grade,
      issuerName,
      issuerAddress,
      issueDate,
      txHash,
    } = req.body;

    // Basic presence validation (Mongoose handles detailed validation)
    if (!certificateId || !studentName || !courseName || !issuerName || !issuerAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: certificateId, studentName, courseName, issuerName, issuerAddress',
      });
    }

    // Check for duplicate certificate ID
    const existing = await getModel().findOne({ certificateId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Certificate with ID ${certificateId} already exists.`,
      });
    }

    // Create and save the certificate document
    const certificate = await getModel().create({
      certificateId,
      studentName,
      studentEmail,
      courseName,
      grade,
      issuerName,
      issuerAddress: issuerAddress.toLowerCase(),
      issueDate:     issueDate ? new Date(issueDate) : new Date(),
      txHash,
    });

    console.log(`[Certificate API] Saved metadata for certificate: ${certificateId}`);

    return res.status(201).json({
      success: true,
      message: 'Certificate metadata saved successfully.',
      data:    certificate,
    });

  } catch (error) {
    // Mongoose validation errors have a specific shape
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors:  Object.values(error.errors).map((e) => e.message),
      });
    }
    // Pass unexpected errors to the global error handler in server.js
    next(error);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/certificates/:id
   Fetch readable off-chain metadata for a given Certificate ID (hash).
   Used by the Verification Portal (Phase 4) after on-chain verification.
   ─────────────────────────────────────────────────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const certificate = await getModel().findOne({ certificateId: id });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: `No off-chain metadata found for Certificate ID: ${id}`,
      });
    }

    return res.json({
      success: true,
      data:    certificate,
    });

  } catch (error) {
    next(error);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/certificates?issuer=0x...
   List all certificates issued by a specific address (for the Issuer Dashboard).
   ─────────────────────────────────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const { issuer } = req.query;

    // Build query — if issuer address is provided, filter by it
    const query = issuer
      ? { issuerAddress: issuer.toLowerCase() }
      : {};

    const certificates = await getModel()
      .find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(50);              // Cap at 50 for now (add pagination in Phase 5)

    return res.json({
      success: true,
      count:   certificates.length,
      data:    certificates,
    });

  } catch (error) {
    next(error);
  }
});

export default router;
