import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/app/generated/prisma/client'
import fs from 'fs'
import path from 'path'

function resolveDbPath(): string {
  const cwd = process.cwd()
  const isVercel = !!process.env.VERCEL

  // Local dev: use prisma/dev.db directly
  if (!isVercel) {
    const devDb = path.join(cwd, 'prisma', 'dev.db')
    if (fs.existsSync(devDb)) return devDb
  }

  // Vercel/serverless: always copy to writable /tmp
  const tmpDb = '/tmp/siftly.db'
  if (!fs.existsSync(tmpDb)) {
    // Try seed.db first, then dev.db
    const seedDb = path.join(cwd, 'prisma', 'seed.db')
    const devDb = path.join(cwd, 'prisma', 'dev.db')
    const source = fs.existsSync(seedDb) ? seedDb : fs.existsSync(devDb) ? devDb : null
    if (source) {
      fs.copyFileSync(source, tmpDb)
      fs.chmodSync(tmpDb, 0o666)
      console.log(`[db] Copied ${path.basename(source)} to /tmp/siftly.db (writable)`)
    } else {
      throw new Error('No database found')
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
