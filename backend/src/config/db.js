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
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is not defined in environment variables.\n' +
        'Please copy .env.example to .env and fill in your MongoDB connection string.'
      );
    }

    /**
     * Mongoose connection options:
     *  - No deprecated options needed in Mongoose 8+; defaults are sensible.
     *  - dbName: explicitly specify the database name (can also be in URI).
     */
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: process.env.DB_NAME || 'certchain',
      serverSelectionTimeoutMS: 3000, // Timeout after 3s to trigger fallback quickly
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    global.useMockDb = false;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('\n⚠️  [FALLBACK] Initializing a local file-based database (db_fallback.json) instead.');
    console.log('   You can still test and run the entire application fully!');
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
