import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/app/generated/prisma/client'
import fs from 'fs'
import path from 'path'

function resolveDbPath(): string {
  const cwd = process.cwd()
  const devDb = path.join(cwd, 'prisma', 'dev.db')

  // Local dev: use prisma/dev.db directly
  if (fs.existsSync(devDb)) return devDb

  // Vercel/serverless: copy bundled seed.db to /tmp on cold start
  const tmpDb = '/tmp/siftly.db'
  if (!fs.existsSync(tmpDb)) {
    const seedDb = path.join(cwd, 'prisma', 'seed.db')
    if (fs.existsSync(seedDb)) {
      fs.copyFileSync(seedDb, tmpDb)
      console.log('[db] Copied seed.db to /tmp/siftly.db')
    } else {
      throw new Error('No database found: neither prisma/dev.db nor prisma/seed.db exist')
    }
  }
  return tmpDb
}

const dbPath = resolveDbPath()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
