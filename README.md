# bookmarkX

A local app to organize, browse, and export your Twitter/X bookmarks. Auto-categorizes with Claude AI and visualizes as an interactive mindmap.

## Features

- **Import** — Upload a JSON export from the [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) browser extension
- **AI Categorization** — Auto-sorts bookmarks into categories (funny memes, AI resources, dev tools, etc.) using Claude Haiku
- **Browse** — Search and filter by category, media type, or date
- **Mindmap** — Interactive visual map of all your bookmarks by category
- **Export** — Download images/videos, export categories as ZIP, export data as CSV/JSON

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up the database**
   ```bash
   npx prisma db push
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Add your Anthropic API key to .env.local
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Importing Bookmarks

1. Install the [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) Chrome/Firefox extension
2. Go to [twitter.com/bookmarks](https://twitter.com/bookmarks)
3. Click the extension icon → **Export as JSON**
4. Go to [localhost:3000/import](http://localhost:3000/import) and upload the JSON file
5. Hit **Categorize with AI** to auto-sort bookmarks (requires Anthropic API key)

## Stack

- Next.js 15 (App Router)
- TypeScript + Tailwind CSS v4
- Prisma 7 + SQLite (local, no setup required)
- Claude Haiku API (for categorization)
- React Flow (@xyflow/react) for mindmap
