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

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function cuid() {
  return 'c' + randomUUID().replace(/-/g, '').slice(0, 24);
}

export async function processYouTube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  const db = new Database(DB_PATH);

  // Check if already exists
  const existing = db.prepare('SELECT id FROM VideoMeta WHERE videoId = ?').get(videoId);
  if (existing) {
    console.log('Video already saved');
    db.close();
    return { status: 'exists', videoId };
  }

  console.log(`Processing ${videoId}...`);

  // 1. Fetch metadata via oEmbed
  const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  if (!oembedRes.ok) throw new Error('Could not fetch video metadata');
  const oembed = await oembedRes.json();

  const title = oembed.title;
  const channelName = oembed.author_name;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  console.log(`Title: ${title}`);
  console.log(`Channel: ${channelName}`);

  // 2. Transcribe via summarize CLI
  let transcript = '';
  try {
    console.log('Transcribing...');
    transcript = execSync(
      `summarize "https://www.youtube.com/watch?v=${videoId}" --extract --plain`,
      { timeout: 120000, maxBuffer: 1024 * 1024 * 10 }
    ).toString().trim();

    // Clean the "Transcript:" prefix if present
    transcript = transcript.replace(/^Transcript:\s*/i, '');
    console.log(`Transcript: ${transcript.length} chars`);
  } catch (e) {
    console.log('Transcript failed:', e.message?.slice(0, 100));
  }

  // 3. Generate chapters + insights via OpenAI
  const openai = new OpenAI();
  let chapters = '[]';
  let insights = [];

  if (transcript.length > 200) {
    console.log('Generating chapters...');
    try {
      const chapterRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You create a structured breakdown of a video talk. For each section create:
- time: timestamp like "02:45"
- title: short descriptive heading (4-8 words)
- quote: the most insightful direct quote from that section (2-4 sentences, verbatim from transcript)
- summary: 1-2 sentence editorial note explaining significance

Return a JSON array of 8-12 sections. ONLY valid JSON array, no markdown.`
          },
          {
            role: 'user',
            content: `Video: "${title}" by ${channelName}\n\nTranscript:\n${transcript.slice(0, 15000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });
      chapters = chapterRes.choices[0].message.content.trim()
        .replace(/^```json?\s*/, '').replace(/\s*```$/, '');
      JSON.parse(chapters); // validate
      console.log(`Chapters: ${JSON.parse(chapters).length}`);
    } catch (e) {
      console.log('Chapters failed:', e.message?.slice(0, 100));
      chapters = '[]';
    }

    console.log('Generating insights...');
    try {
      const insightRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract 3-5 key takeaways from this video. Each should be:
- A concise, opinionated insight (1-2 sentences)
- Written as a standalone takeaway, not "the speaker says..."
- Actionable or thought-provoking

Return a JSON array of strings. ONLY valid JSON array.`
          },
          {
            role: 'user',
            content: `Video: "${title}" by ${channelName}\n\nTranscript:\n${transcript.slice(0, 10000)}`
          }
        ],
        temperature: 0.4,
        max_tokens: 1000,
      });
      const insightText = insightRes.choices[0].message.content.trim()
        .replace(/^```json?\s*/, '').replace(/\s*```$/, '');
      insights = JSON.parse(insightText);
      console.log(`Insights: ${insights.length}`);
    } catch (e) {
      console.log('Insights failed:', e.message?.slice(0, 100));
    }
  }

  // 4. Save to database
  const readingId = cuid();
  const videoMetaId = cuid();
  const now = new Date().toISOString();
  const description = transcript ? transcript.slice(0, 300) + '...' : null;

  db.prepare(`INSERT INTO ReadingItem (id, type, title, author, url, description, coverImage, status, seen, addedAt)
    VALUES (?, 'video', ?, ?, ?, ?, ?, 'want-to-read', 0, ?)`).run(
    readingId, title, channelName,
    `https://www.youtube.com/watch?v=${videoId}`,
    description, thumbnailUrl, now
  );

  db.prepare(`INSERT INTO VideoMeta (id, readingItemId, videoId, thumbnailUrl, channelName, transcript, chapters, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    videoMetaId, readingId, videoId, thumbnailUrl, channelName,
    transcript || null, chapters, now
  );

  for (const content of insights) {
    db.prepare(`INSERT INTO Insight (id, content, source, readingItemId, createdAt)
      VALUES (?, ?, 'ai', ?, ?)`).run(cuid(), content, readingId, now);
  }

  db.close();

  // 5. Copy to seed.db for Vercel deployment
  copyFileSync(DB_PATH, SEED_PATH);
  console.log('Copied DB to seed.db');

  console.log(`\n✅ Saved: ${title}`);
  console.log(`   ID: ${readingId}`);
  console.log(`   Transcript: ${transcript.length} chars`);
  console.log(`   Chapters: ${JSON.parse(chapters).length}`);
  console.log(`   Insights: ${insights.length}`);

  return { status: 'created', readingId, videoId, title };
}

// CLI mode
const url = process.argv[2];
if (url) {
  processYouTube(url)
    .then(result => {
      if (result.status === 'created') {
        console.log('\n🚀 Auto-deploying to Vercel...');
        try {
          execSync('cd /home/ubuntu/Siftly && git add -A && git commit -m "auto: add video ' + result.videoId + '" && git push origin main', { stdio: 'inherit', timeout: 30000 });
          execSync('cd /home/ubuntu/Siftly && npx vercel --prod --yes --token "$VERCEL_TOKEN"', { stdio: 'inherit', timeout: 120000, env: { ...process.env, VERCEL_TOKEN: process.env.VERCEL_TOKEN || 'KjYqQOAj538m59jQ2jR55pfW' } });
          console.log('✅ Deployed!');
        } catch (e) {
          console.log('Deploy failed (manual deploy needed):', e.message?.slice(0, 80));
        }
      }
    })
    .catch(e => {
      console.error('Error:', e.message);
      process.exit(1);
    });
}
