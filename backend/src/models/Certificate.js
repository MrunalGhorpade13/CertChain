/**
 * Certificate.js — Mongoose Schema & Model
 *
 * This model stores the OFF-CHAIN metadata for each certificate.
 * The ON-CHAIN data (the hash and issuer address) lives in the smart contract.
 *
 * The `certificateId` field is the cryptographic hash (keccak256 or SHA-256)
 * of the certificate data. It acts as the bridge between off-chain metadata
 * and the on-chain record.
 *
 * Fields:
 *  certificateId  — unique hash / ID (primary key for lookups)
 *  studentName    — full name of the certificate holder
 *  studentEmail   — email (optional, for institutional records)
 *  courseName     — name of the course / degree
 *  grade          — grade / GPA / distinction level
 *  issuerName     — institution name
 *  issuerAddress  — Ethereum wallet address of the issuer
 *  issueDate      — ISO date string when the certificate was issued
 *  txHash         — Ethereum transaction hash of the issueCertificate() call
 *  isRevoked      — flag to mark a certificate as revoked (Phase 5 feature)
 */

import mongoose from 'mongoose';

// ── Schema Definition ─────────────────────────────────────────────────────
const certificateSchema = new mongoose.Schema(
  {
    // The unique cryptographic identifier — matches what's stored on-chain
    certificateId: {
      type:     String,
      required: [true, 'Certificate ID (hash) is required'],
      unique:   true,
      trim:     true,
      index:    true, // Index for fast lookups by ID
    },

    // Student information (off-chain PII — stored only in MongoDB)
    studentName: {
      type:      String,
      required:  [true, 'Student name is required'],
      trim:      true,
      maxlength: [200, 'Student name cannot exceed 200 characters'],
    },

    studentEmail: {
      type:    String,
      trim:    true,
      lowercase: true,
      match:   [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    // Course / credential details
    courseName: {
      type:      String,
      required:  [true, 'Course name is required'],
      trim:      true,
      maxlength: [500, 'Course name cannot exceed 500 characters'],
    },

    grade: {
      type:    String,
      trim:    true,
      default: 'Pass',
    },

    // Issuer details (the university / institution)
    issuerName: {
      type:      String,
      required:  [true, 'Issuer name is required'],
      trim:      true,
    },

    // Ethereum address of the wallet that signed the on-chain transaction
    issuerAddress: {
      type:      String,
      required:  [true, 'Issuer Ethereum address is required'],
      lowercase: true,
      trim:      true,
      // Basic Ethereum address format validation
      match:     [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'],
    },

    // When the certificate was officially issued
    issueDate: {
      type:    Date,
      default: Date.now,
    },

    // The Ethereum transaction hash from the blockchain write
    txHash: {
      type:  String,
      trim:  true,
      // Will be empty if saved before tx confirmation; updated after
    },

    // Revocation support (Phase 5)
    isRevoked: {
      type:    Boolean,
      default: false,
    },

    revokedReason: {
      type: String,
      trim: true,
    },

    revokedAt: {
      type: Date,
    },
  },
  {
    // Automatically add `createdAt` and `updatedAt` timestamp fields
    timestamps: true,

    // Add a virtual `id` field that returns the MongoDB _id as a string
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────────
// `isValid` — a certificate is valid if it exists and is not revoked
certificateSchema.virtual('isValid').get(function () {
  return !this.isRevoked;
});

// ── Indexes ───────────────────────────────────────────────────────────────
// Allow searching by issuer address for the Issuer Dashboard
certificateSchema.index({ issuerAddress: 1 });
certificateSchema.index({ createdAt: -1 });

// ── Model Export ──────────────────────────────────────────────────────────
const Certificate = mongoose.model('Certificate', certificateSchema);

export default Certificate;
