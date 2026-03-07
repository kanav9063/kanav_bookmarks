#!/usr/bin/env node
// Fetch X bookmarks via API v2 (OAuth2 user token) and save as JSON for Siftly import

const fs = require('fs');
const path = require('path');

const TOKENS_PATH = path.join(process.env.HOME, '.config/x-cli/oauth2_tokens.json');
const ENV_PATH = path.join(process.env.HOME, '.config/x-cli/.env');

async function loadTokens() {
  const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
  const env = fs.readFileSync(ENV_PATH, 'utf8');
  const envVars = {};
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) envVars[k.trim()] = v.join('=').trim();
  }
  return { ...tokens, ...envVars };
}

async function refreshToken(tokens) {
  const { client_id, client_secret, refresh_token } = tokens;
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
    client_id,
  });

  const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  
  const res = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const newTokens = await res.json();
  // Save refreshed tokens
  const updated = {
    ...tokens,
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token || tokens.refresh_token,
    expires_in: newTokens.expires_in,
  };
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(updated, null, 2));
  console.log('✓ Refreshed OAuth2 token');
  return updated;
}

async function getMe(accessToken) {
  const res = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`getMe failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

async function fetchBookmarks(accessToken, userId, paginationToken) {
  const params = new URLSearchParams({
    max_results: '100',
    'tweet.fields': 'created_at,author_id,entities,attachments,text',
    'user.fields': 'name,username',
    'media.fields': 'url,preview_image_url,type,variants',
    expansions: 'author_id,attachments.media_keys',
  });
  if (paginationToken) params.set('pagination_token', paginationToken);

  const url = `https://api.x.com/2/users/${userId}/bookmarks?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    const reset = res.headers.get('x-rate-limit-reset');
    const waitSec = reset ? Math.max(0, Number(reset) - Math.floor(Date.now()/1000)) + 2 : 60;
    console.log(`Rate limited. Waiting ${waitSec}s...`);
    await new Promise(r => setTimeout(r, waitSec * 1000));
    return fetchBookmarks(accessToken, userId, paginationToken);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bookmarks fetch failed (${res.status}): ${text}`);
  }

  return res.json();
}

function convertV2ToLegacy(tweet, usersMap, mediaMap) {
  const author = usersMap[tweet.author_id] || {};
  const mediaKeys = tweet.attachments?.media_keys || [];
  const mediaEntities = mediaKeys.map(k => mediaMap[k]).filter(Boolean).map(m => {
    if (m.type === 'video' || m.type === 'animated_gif') {
      const variants = m.variants || [];
      return {
        type: m.type === 'animated_gif' ? 'animated_gif' : 'video',
        media_url_https: m.preview_image_url || m.url || '',
        video_info: { variants: variants.map(v => ({ content_type: v.content_type, bitrate: v.bit_rate || 0, url: v.url })) },
      };
    }
    return { type: 'photo', media_url_https: m.url || '' };
  });

  const hashtags = (tweet.entities?.hashtags || []).map(h => ({ text: h.tag }));
  const urls = (tweet.entities?.urls || []).map(u => ({ expanded_url: u.expanded_url || u.url }));

  return {
    id_str: tweet.id,
    full_text: tweet.text || '',
    created_at: tweet.created_at || '',
    user: { screen_name: author.username || 'unknown', name: author.name || 'Unknown' },
    entities: { hashtags, urls, media: mediaEntities.length ? mediaEntities : undefined },
    extended_entities: mediaEntities.length ? { media: mediaEntities } : undefined,
  };
}

async function main() {
  console.log('Loading tokens...');
  let tokens = await loadTokens();
  
  // Always refresh to ensure valid token
  try {
    tokens = await refreshToken(tokens);
  } catch (e) {
    console.log('Refresh failed, trying existing token:', e.message);
  }

  console.log('Fetching user info...');
  let me;
  try {
    me = await getMe(tokens.access_token);
  } catch (e) {
    // Token might be expired, try refresh once more
    console.log('Token expired, refreshing...');
    tokens = await refreshToken(tokens);
    me = await getMe(tokens.access_token);
  }
  console.log(`✓ Authenticated as @${me.username} (${me.id})`);

  const allTweets = [];
  let usersMap = {};
  let mediaMap = {};
  let nextToken = undefined;
  let page = 0;

  while (true) {
    page++;
    console.log(`Fetching page ${page}...`);
    const data = await fetchBookmarks(tokens.access_token, me.id, nextToken);
    
    if (!data.data || data.data.length === 0) {
      console.log('No more bookmarks.');
      break;
    }

    // Build lookup maps from includes
    if (data.includes?.users) {
      for (const u of data.includes.users) usersMap[u.id] = u;
    }
    if (data.includes?.media) {
      for (const m of data.includes.media) mediaMap[m.media_key] = m;
    }

    for (const tweet of data.data) {
      allTweets.push(convertV2ToLegacy(tweet, usersMap, mediaMap));
    }
    console.log(`  Got ${data.data.length} bookmarks (total: ${allTweets.length})`);

    nextToken = data.meta?.next_token;
    if (!nextToken) break;
  }

  const outPath = path.join(__dirname, 'bookmarks-export.json');
  fs.writeFileSync(outPath, JSON.stringify(allTweets, null, 2));
  console.log(`\n✓ Exported ${allTweets.length} bookmarks to ${outPath}`);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
