'use strict';

const { PrismaClient } = require('@prisma/client');
const config = require('./env');

/**
 * Prisma client singleton.
 * In development we attach the instance to globalThis to survive hot-reload
 * without exhausting the connection pool. In production we always create one
 * instance at module load time and reuse it.
 */

let prisma;

if (config.isDevelopment) {
  if (!globalThis.__prismaClient) {
    globalThis.__prismaClient = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = globalThis.__prismaClient;
} else {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
}

/**
 * Gracefully disconnect Prisma when the process exits.
 * Called from src/index.js during shutdown, but registering here ensures
 * it also fires if the client is imported without the server entry point.
 */
async function disconnectPrisma() {
  await prisma.$disconnect();
}

process.on('beforeExit', async () => {
  await disconnectPrisma();
});

module.exports = prisma;
module.exports.disconnectPrisma = disconnectPrisma;
