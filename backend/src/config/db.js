/**
 * db.js — MongoDB Connection Utility
 *
 * Uses Mongoose to connect to MongoDB. Reads the connection URI from the
 * MONGODB_URI environment variable (set in .env).
 *
 * Features:
 *  - Retries aren't needed — Mongoose handles reconnection automatically
 *  - Logs connection success or failure clearly
 *  - Graceful process exit on fatal connection error
 *
 * Usage:  import connectDB from './config/db.js';  connectDB();
 */

import mongoose from 'mongoose';

/**
 * connectDB — establishes a connection to MongoDB Atlas or local instance.
 * Called once at server startup in server.js.
 */
const connectDB = async () => {
  try {
    let MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is not defined in environment variables.\n' +
        'Please copy .env.example to .env and fill in your MongoDB connection string.'
      );
    }

    /**
     * Node 18+ resolves "localhost" to the IPv6 loopback (::1) by default on
     * Windows, which causes connection failures when MongoDB only listens on
     * IPv4 (127.0.0.1). We explicitly swap it to avoid this.
     */
    MONGODB_URI = MONGODB_URI.replace('mongodb://localhost', 'mongodb://127.0.0.1');

    /**
     * Mongoose connection options:
     *  - No deprecated options needed in Mongoose 8+; defaults are sensible.
     *  - dbName: explicitly specify the database name (can also be in URI).
     */
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: process.env.DB_NAME || 'certchain',
      serverSelectionTimeoutMS: 5000, // Timeout after 5s to trigger fallback
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    global.useMockDb = false;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('\n⚠️  [FALLBACK] Switching to file-based database (requests_fallback.json / db_fallback.json).');
    console.log('   The application is still fully functional — all data is persisted to JSON files.');
    global.useMockDb = true;
  }
};

// ── Mongoose event listeners ──────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Mongoose will attempt to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

export default connectDB;
