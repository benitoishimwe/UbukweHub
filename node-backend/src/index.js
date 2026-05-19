'use strict';

// Load env vars before anything else
require('dotenv').config();

const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { disconnectPrisma } = require('./config/prisma');

const server = http.createServer(app);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

let isShuttingDown = false;

/**
 * Perform a clean shutdown:
 *   1. Stop accepting new connections
 *   2. Wait for in-flight requests to finish (30 s timeout)
 *   3. Disconnect Prisma / database pool
 *   4. Exit
 */
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[server] Received ${signal}. Starting graceful shutdown...`);

  // Set a hard kill timer so a hung request never blocks the process forever
  const forceExit = setTimeout(() => {
    console.error('[server] Forced exit after 30 s timeout');
    process.exit(1);
  }, 30_000);
  forceExit.unref(); // Don't keep the event loop alive for the timer alone

  try {
    // Stop accepting new TCP connections
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        console.log('[server] HTTP server closed — no longer accepting connections');
        resolve();
      });
    });

    // Disconnect database
    await disconnectPrisma();
    console.log('[server] Database connection closed');

    clearTimeout(forceExit);
    console.log('[server] Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('[server] Error during shutdown:', err);
    clearTimeout(forceExit);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections so they don't silently swallow errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // In production, exit and let the process manager restart
  if (config.isProduction) {
    shutdown('unhandledRejection');
  }
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err);
  shutdown('uncaughtException');
});

// ── Start ────────────────────────────────────────────────────────────────────

server.listen(config.port, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           Prani Backend — Node.js                ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Environment : ${config.nodeEnv.padEnd(33)}║`);
  console.log(`║  Port        : ${String(config.port).padEnd(33)}║`);
  console.log(`║  Database    : Connected via Prisma               ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = server;
