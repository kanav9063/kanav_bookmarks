import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const results: Record<string, unknown> = {}
  
  try {
    const cwd = process.cwd()
    results.cwd = cwd
    results.devDbExists = fs.existsSync(path.join(cwd, 'prisma', 'dev.db'))
    results.seedDbExists = fs.existsSync(path.join(cwd, 'prisma', 'seed.db'))
    results.tmpDbExists = fs.existsSync('/tmp/siftly.db')
    
    if (fs.existsSync('/tmp/siftly.db')) {
      const stat = fs.statSync('/tmp/siftly.db')
      results.tmpDbSize = stat.size
      results.tmpDbMode = stat.mode.toString(8)
    }
    
    // Try a write
    try {
      const insight = await prisma.insight.create({
        data: {
          content: 'debug test ' + Date.now(),
          source: 'manual',
        },
      })
      results.writeTest = 'OK: ' + insight.id
      await prisma.insight.delete({ where: { id: insight.id } })
      results.deleteTest = 'OK'
    } catch (e) {
      results.writeTest = 'FAIL: ' + String(e).slice(0, 300)
    }
    
    const count = await prisma.readingItem.count()
    results.readingItemCount = count
  } catch (e) {
    results.error = String(e).slice(0, 300)
  }
  
  return NextResponse.json(results)
}
