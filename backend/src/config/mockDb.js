/**
 * mockDb.js — Lightweight File-Based JSON Database Fallback
 *
 * This utility acts as a drop-in mock replacement for Mongoose/MongoDB when
 * a local MongoDB server is not running. It allows the system to remain
 * fully functional out-of-the-box without crashing, storing metadata in a
 * local `db_fallback.json` file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store the JSON file in the backend root directory
const FILE_PATH = path.join(__dirname, '..', '..', 'db_fallback.json');

// Initialize JSON file if it doesn't exist
const initFile = () => {
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2));
  }
};

// Read all certificates from JSON file
const readData = () => {
  initFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Mock DB] Error reading fallback database:', err);
    return [];
  }
};

// Write certificates to JSON file
const writeData = (data) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Mock DB] Error writing fallback database:', err);
  }
};

/**
 * Mock Model representing the Certificate database.
 * Mimics Mongoose query methods: findOne, create, find, sort, limit.
 */
const MockCertificate = {
  findOne: async (query) => {
    const data = readData();
    const cert = data.find(c => c.certificateId === query.certificateId);
    if (!cert) return null;
    return {
      ...cert,
      toJSON: () => cert,
      toObject: () => cert,
      isValid: !cert.isRevoked
    };
  },

  create: async (payload) => {
    const data = readData();
    const newCert = {
      ...payload,
      _id: Math.random().toString(36).substring(2, 9),
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isRevoked: false,
      isValid: true
    };
    data.push(newCert);
    writeData(data);
    return {
      ...newCert,
      toJSON: () => newCert,
      toObject: () => newCert
    };
  },

  find: (query = {}) => {
    let data = readData();

    // Filter by issuerAddress if specified
    if (query.issuerAddress) {
      data = data.filter(c => c.issuerAddress.toLowerCase() === query.issuerAddress.toLowerCase());
    }

    // Return chainable helper methods to match Mongoose
    const chain = {
      sort: (sortOption) => {
        // Mongoose { createdAt: -1 } or similar sorting
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return chain;
      },
      limit: (limitCount) => {
        data = data.slice(0, limitCount);
        return chain;
      },
      // Finally return data when awaited or executed
      then: (resolve) => {
        resolve(data.map(cert => ({
          ...cert,
          toJSON: () => cert,
          toObject: () => cert,
          isValid: !cert.isRevoked
        })));
      }
    };

    return chain;
  }
};

export default MockCertificate;
