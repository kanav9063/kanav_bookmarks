#!/bin/bash
# Auto-commit script — runs multiple times daily to keep GitHub green
# Each run does something useful, not empty commits

cd /home/ubuntu/Siftly
export PATH="/home/ubuntu/.npm-global/bin:/home/ubuntu/.local/bin:$PATH"

LOGFILE="/tmp/siftly-autocommit.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

echo "[$TIMESTAMP] Auto-commit starting..." >> "$LOGFILE"

# 1. Sync X bookmarks (fetches new ones)
if [ -f fetch-bookmarks.js ]; then
    echo "[$TIMESTAMP] Syncing bookmarks..." >> "$LOGFILE"
    node fetch-bookmarks.js >> "$LOGFILE" 2>&1
fi

# 2. Export bookmarks JSON (tracks changes)
if [ -f scripts/export-bookmarks.js ]; then
    node scripts/export-bookmarks.js >> "$LOGFILE" 2>&1
fi

# 3. Copy DB to seed
cp prisma/dev.db prisma/seed.db

# 4. Check if there are actual changes
if git diff --quiet prisma/seed.db bookmarks-export.json 2>/dev/null; then
    # No data changes — make a maintenance commit instead
    # Update a stats file
    STATS=$(node -e "
    const Database = require('better-sqlite3');
    const db = new Database('prisma/dev.db');
    const bookmarks = db.prepare('SELECT COUNT(*) as c FROM Bookmark').get().c;
    const reading = db.prepare('SELECT COUNT(*) as c FROM ReadingItem').get().c;
    const insights = db.prepare('SELECT COUNT(*) as c FROM Insight').get().c;
    const categories = db.prepare('SELECT COUNT(*) as c FROM Category').get().c;
    console.log(JSON.stringify({bookmarks, reading, insights, categories, updated: new Date().toISOString()}));
    db.close();
    " 2>/dev/null)
    
    echo "$STATS" > stats.json
    
    MSG="chore: stats update $(date '+%H:%M') — $(echo $STATS | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.bookmarks+'b/'+d.reading+'r/'+d.insights+'i')" 2>/dev/null || echo 'sync')"
else
    MSG="auto: sync $(date '+%H:%M') — new content"
fi

# 5. Stage and commit
git add -A
git diff --cached --quiet && {
    echo "[$TIMESTAMP] Nothing to commit" >> "$LOGFILE"
    exit 0
}

git commit -m "$MSG" >> "$LOGFILE" 2>&1
git push origin main >> "$LOGFILE" 2>&1

echo "[$TIMESTAMP] Pushed: $MSG" >> "$LOGFILE"
