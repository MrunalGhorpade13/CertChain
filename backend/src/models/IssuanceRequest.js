/**
 * IssuanceRequest.js — Mongoose Model for Certificate Requests
 *
 * Stores student-submitted requests before they are approved and minted
 * on-chain by an admin. Supports a simple Pending → Approved/Rejected lifecycle.
 */

import mongoose from 'mongoose';

const issuanceRequestSchema = new mongoose.Schema(
  {
    // Student personal info
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    studentEmail: {
      type: String,
      required: [true, 'Student email is required'],
      trim: true,
      lowercase: true,
    },

    // Academic info
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    grade: {
      type: String,
      trim: true,
      default: 'Pass',
    },

    // Requested institution to issue the certificate
    issuerName: {
      type: String,
      required: [true, 'Issuer name is required'],
      trim: true,
    },

    // The student's connected wallet address
    studentAddress: {
      type: String,
      required: [true, 'Student wallet address is required'],
      lowercase: true,
    },

    // Workflow status
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },

    // Populated after admin approves and mints on-chain
    txHash: {
      type: String,
      default: null,
    },
    certificateId: {
      type: String,
      default: null,
    },

    // Admin notes (optional rejection reason)
    adminNote: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Adds createdAt & updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for fast lookups by student address and status
issuanceRequestSchema.index({ studentAddress: 1 });
issuanceRequestSchema.index({ status: 1 });

const IssuanceRequest = mongoose.model('IssuanceRequest', issuanceRequestSchema);
export default IssuanceRequest;
