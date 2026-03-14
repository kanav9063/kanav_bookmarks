import { execSync } from 'child_process';
import OpenAI from 'openai';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../prisma/dev.db');
const SEED_PATH = resolve(__dirname, '../prisma/seed.db');

function cuid() {
  return 'c' + randomUUID().replace(/-/g, '').slice(0, 24);
}

function estimateReadTime(text) {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  if (minutes < 60) return `~${minutes} min read`;
  return `~${Math.round(minutes / 60)}h read`;
}

export async function processArticle(url) {
  const db = new Database(DB_PATH);

  // Check if already exists
  const existing = db.prepare('SELECT id FROM ReadingItem WHERE url = ?').get(url);
  if (existing) {
    console.log('Article already saved');
    db.close();
    return { status: 'exists', id: existing.id };
  }

  console.log(`Processing article: ${url}`);

  // 1. Extract article content via summarize CLI
  let content = '';
  let title = '';
  let author = '';
  let description = '';
  let ogImage = null;

  try {
    console.log('Extracting content...');
    content = execSync(
      `summarize "${url}" --extract --plain`,
      { timeout: 30000, maxBuffer: 1024 * 1024 * 5 }
    ).toString().trim();
    console.log(`Content: ${content.length} chars`);
  } catch (e) {
    console.log('Extract failed, trying fetch...');
  }

  // 2. Fetch OG metadata
  try {
    console.log('Fetching metadata...');
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Siftly/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    // Extract OG tags
    const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]*)"/) ||
                    html.match(/<title[^>]*>([^<]*)<\/title>/);
    const ogDesc = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"/) ||
                   html.match(/<meta\s+name="description"\s+content="([^"]*)"/) ;
    const ogImg = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]*)"/);
    const ogAuthor = html.match(/<meta\s+(?:property|name)="(?:author|article:author)"\s+content="([^"]*)"/) ||
                     html.match(/<meta\s+name="twitter:creator"\s+content="([^"]*)"/);

    if (ogTitle) title = ogTitle[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    if (ogDesc) description = ogDesc[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    if (ogImg) ogImage = ogImg[1];
    if (ogAuthor) author = ogAuthor[1];

    // Try to get author from page content if not in meta
    if (!author) {
      const byline = html.match(/class="[^"]*(?:author|byline)[^"]*"[^>]*>([^<]+)</i);
      if (byline) author = byline[1].trim();
    }

    // Extract site name as fallback author
    if (!author) {
      const siteName = html.match(/<meta\s+(?:property|name)="og:site_name"\s+content="([^"]*)"/);
      if (siteName) author = siteName[1];
    }

    console.log(`Title: ${title}`);
    console.log(`Author: ${author || '(unknown)'}`);
    console.log(`Image: ${ogImage ? 'yes' : 'no'}`);
  } catch (e) {
    console.log('Metadata fetch failed:', e.message?.slice(0, 80));
  }

  // Fallback title from URL
  if (!title) {
    title = url.replace(/^https?:\/\/(www\.)?/, '').split('/').filter(Boolean).pop() || url;
  }

  // 3. Generate insights via OpenAI
  const openai = new OpenAI();
  let insights = [];
  const textForAI = content || description;

  if (textForAI && textForAI.length > 100) {
    console.log('Generating insights...');
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract 3-5 key takeaways from this article. Each should be:
- A concise, opinionated insight (1-2 sentences)
- Written as a standalone takeaway
- Actionable or thought-provoking
Return a JSON array of strings. ONLY valid JSON array.`
          },
          {
            role: 'user',
            content: `Article: "${title}" by ${author || 'unknown'}\n\nContent:\n${textForAI.slice(0, 10000)}`
          }
        ],
        temperature: 0.4,
        max_tokens: 1000,
      });
      const text = res.choices[0].message.content.trim()
        .replace(/^```json?\s*/, '').replace(/\s*```$/, '');
      insights = JSON.parse(text);
      console.log(`Insights: ${insights.length}`);
    } catch (e) {
      console.log('Insights failed:', e.message?.slice(0, 80));
    }
  }

  // 4. Save to database
  const readingId = cuid();
  const now = new Date().toISOString();
  const readTime = content ? estimateReadTime(content) : null;
  const finalDesc = description || (content ? content.slice(0, 300) + '...' : null);

  db.prepare(`INSERT INTO ReadingItem (id, type, title, author, url, description, coverImage, notes, status, seen, addedAt)
    VALUES (?, 'article', ?, ?, ?, ?, ?, ?, 'want-to-read', 0, ?)`).run(
    readingId, title, author || null, url, finalDesc, ogImage || null, readTime, now
  );

  for (const insightContent of insights) {
    db.prepare(`INSERT INTO Insight (id, content, source, readingItemId, createdAt)
      VALUES (?, ?, 'ai', ?, ?)`).run(cuid(), insightContent, readingId, now);
  }

  db.close();
  copyFileSync(DB_PATH, SEED_PATH);

  console.log(`\n✅ Saved: ${title}`);
  console.log(`   ID: ${readingId}`);
  console.log(`   Author: ${author || '(unknown)'}`);
  console.log(`   Image: ${ogImage ? 'yes' : 'no'}`);
  console.log(`   Read time: ${readTime || '?'}`);
  console.log(`   Insights: ${insights.length}`);

  return { status: 'created', readingId, title };
}

// CLI mode
const url = process.argv[2];
if (url) {
  processArticle(url)
    .then(result => {
      if (result.status === 'created') {
        console.log('\n🚀 Auto-deploying...');
        try {
          execSync('cd /home/ubuntu/Siftly && git add -A && git commit -m "auto: add article" && git push origin main', { stdio: 'inherit', timeout: 30000 });
          execSync('cd /home/ubuntu/Siftly && npx vercel --prod --yes --token "$VERCEL_TOKEN"', { stdio: 'inherit', timeout: 120000, env: { ...process.env, VERCEL_TOKEN: process.env.VERCEL_TOKEN || 'KjYqQOAj538m59jQ2jR55pfW' } });
          console.log('✅ Deployed!');
        } catch (e) {
          console.log('Deploy skipped:', e.message?.slice(0, 60));
        }
      }
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}
