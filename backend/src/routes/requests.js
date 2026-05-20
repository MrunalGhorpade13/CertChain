/**
 * requests.js — Issuance Request API Routes
 *
 * Endpoints:
 *   POST   /api/requests          — Student submits a new certificate request
 *   GET    /api/requests          — List requests (all for admin, filtered by studentAddress for student)
 *   GET    /api/requests/:id      — Get single request detail
 *   PUT    /api/requests/:id      — Admin updates status (Approved/Rejected), records txHash & certId
 */

import express from 'express';
import IssuanceRequest from '../models/IssuanceRequest.js';
import MockRequest from '../config/mockRequestDb.js';

const router = express.Router();

const getModel = () => (global.useMockDb ? MockRequest : IssuanceRequest);

// ── POST /api/requests — Student submits a request ──────────────────────────
router.post('/', async (req, res) => {
  try {
    const { studentName, studentEmail, courseName, grade, issuerName, studentAddress } = req.body;

    if (!studentName || !courseName || !issuerName || !studentAddress) {
      return res.status(400).json({
        success: false,
        message: 'studentName, courseName, issuerName, and studentAddress are required.',
      });
    }

    const payload = {
      studentName,
      studentEmail: studentEmail || '',
      courseName,
      grade: grade || 'Pass',
      issuerName,
      studentAddress,
    };

    const newRequest = await getModel().create(payload);

    return res.status(201).json({ success: true, data: newRequest });
  } catch (err) {
    console.error('[POST /api/requests]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/requests — List requests ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { studentAddress, status } = req.query;
    const query = {};
    if (studentAddress) query.studentAddress = studentAddress.toLowerCase();
    if (status)         query.status = status;

    const requests = await getModel().find(query).sort({ createdAt: -1 });

    return res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    console.error('[GET /api/requests]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/requests/:id — Single request ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await getModel().findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    return res.json({ success: true, data: request });
  } catch (err) {
    console.error('[GET /api/requests/:id]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/requests/:id — Admin approves or rejects ───────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, txHash, certificateId, adminNote } = req.body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be "Approved" or "Rejected".',
      });
    }

    const updates = { status };
    if (txHash)        updates.txHash        = txHash;
    if (certificateId) updates.certificateId  = certificateId;
    if (adminNote)     updates.adminNote      = adminNote;

    const updated = await getModel().findByIdAndUpdate(id, updates, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PUT /api/requests/:id]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
