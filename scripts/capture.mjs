#!/usr/bin/env node
/**
 * Universal content capture — auto-detects URL type and processes accordingly.
 * Usage: node capture.mjs <url> [--no-deploy]
 */
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function detectType(url) {
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed/.test(url)) return 'youtube';
  if (/twitter\.com|x\.com/.test(url)) return 'tweet';
  if (/arxiv\.org/.test(url)) return 'paper';
  return 'article';
}

const url = process.argv[2];
const noDeploy = process.argv.includes('--no-deploy');

if (!url) {
  console.log('Usage: node capture.mjs <url> [--no-deploy]');
  process.exit(1);
}

const type = detectType(url);
console.log(`Detected type: ${type}`);

let result;
if (type === 'youtube') {
  const { processYouTube } = await import('./process-youtube.mjs');
  // Override deploy behavior - we'll handle it here
  result = await processYouTube(url);
} else {
  const { processArticle } = await import('./process-article.mjs');
  result = await processArticle(url);
}

if (result.status === 'created' && !noDeploy) {
  console.log('\n🚀 Deploying...');
  try {
    execSync('cd /home/ubuntu/Siftly && git add -A && git commit -m "auto: capture content" && git push origin main', { stdio: 'inherit', timeout: 30000 });
    execSync('cd /home/ubuntu/Siftly && npx vercel --prod --yes --token "$VERCEL_TOKEN"', {
      stdio: 'inherit',
      timeout: 120000,
      env: { ...process.env, VERCEL_TOKEN: process.env.VERCEL_TOKEN || 'KjYqQOAj538m59jQ2jR55pfW' }
    });
    console.log('✅ Live!');
  } catch (e) {
    console.log('Deploy failed:', e.message?.slice(0, 60));
  }
} else if (result.status === 'exists') {
  console.log('Already saved — skipping.');
}
