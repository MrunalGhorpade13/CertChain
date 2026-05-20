/**
 * mockRequestDb.js — Lightweight File-Based JSON Database Fallback for Issuance Requests
 *
 * Stores student certificate requests in `requests_fallback.json` to persist
 * data across backend process restarts during local development.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store the JSON file in the backend root directory
const FILE_PATH = path.join(__dirname, '..', '..', 'requests_fallback.json');

// Initialize JSON file if it doesn't exist
const initFile = () => {
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2));
  }
};

// Read all requests from JSON file
const readData = () => {
  initFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Mock Request DB] Error reading fallback database:', err);
    return [];
  }
};

// Write requests to JSON file
const writeData = (data) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Mock Request DB] Error writing fallback database:', err);
  }
};

const MockRequest = {
  find: (query = {}) => {
    let data = readData();

    // Filter by studentAddress if specified
    if (query.studentAddress) {
      data = data.filter(
        (r) => r.studentAddress.toLowerCase() === query.studentAddress.toLowerCase()
      );
    }

    // Filter by status if specified
    if (query.status) {
      data = data.filter((r) => r.status === query.status);
    }

    // Return chainable helper methods to match Mongoose
    const chain = {
      sort: (sortOption) => {
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return chain;
      },
      then: (resolve) => {
        resolve(data.map((r) => ({
          ...r,
          toJSON: () => r,
          toObject: () => r,
        })));
      },
    };

    return chain;
  },

  findById: async (id) => {
    const data = readData();
    const request = data.find((r) => String(r._id) === String(id));
    if (!request) return null;
    return {
      ...request,
      toJSON: () => request,
      toObject: () => request,
    };
  },

  create: async (payload) => {
    const data = readData();
    const newRequest = {
      ...payload,
      _id: Math.random().toString(36).substring(2, 9),
      studentAddress: payload.studentAddress.toLowerCase(),
      status: 'Pending',
      txHash: null,
      certificateId: null,
      adminNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.push(newRequest);
    writeData(data);
    return {
      ...newRequest,
      toJSON: () => newRequest,
      toObject: () => newRequest,
    };
  },

  findByIdAndUpdate: async (id, updates, options = {}) => {
    const data = readData();
    const idx = data.findIndex((r) => String(r._id) === String(id));
    if (idx === -1) return null;

    const updatedRequest = {
      ...data[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data[idx] = updatedRequest;
    writeData(data);

    return {
      ...updatedRequest,
      toJSON: () => updatedRequest,
      toObject: () => updatedRequest,
    };
  },
};

export default MockRequest;
