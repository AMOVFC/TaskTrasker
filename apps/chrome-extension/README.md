# TaskTrasker Chrome Extension

A Chrome extension for quickly capturing and managing tasks from any tab, powered by the TaskTrasker backend.

## Features

- **Quick task capture** — Add tasks from the popup or right-click context menu
- **Task list** — View your tasks in a tree structure with expand/collapse
- **Status management** — Cycle task status (To Do → In Progress → Done) with one click
- **Badge count** — See your incomplete task count on the extension icon
- **Keyboard shortcut** — `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac) to open the popup
- **Context menu** — Right-click selected text or a page to create a task from it

## Setup

### Load as unpacked extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `apps/chrome-extension/` directory
5. The TaskTrasker extension icon should appear in your toolbar

### Authentication

The extension uses Google OAuth via Supabase (same auth as the web app). Click the extension icon and sign in with your Google account.

**Note:** For the OAuth flow to work, the extension's redirect URL (`https://<extension-id>.chromiumapp.org/`) must be added as an allowed redirect URL in the Supabase project's Google OAuth settings.

## Architecture

- **Manifest V3** — Modern Chrome extension format with service worker
- **Direct Supabase access** — Communicates directly with Supabase (bypasses the Next.js API routes, which use httpOnly cookies not accessible to extensions)
- **chrome.storage.local** — Custom storage adapter for persisting Supabase auth tokens
- **No build step** — Plain JavaScript, ready to load as-is

## File Structure

```
chrome-extension/
├── manifest.json        — Extension configuration (Manifest V3)
├── popup.html           — Popup UI markup
├── popup.css            — Dark theme styles matching TaskTrasker
├── popup.js             — Popup interaction logic
├── background.js        — Service worker (context menu, badge, alarms)
├── supabase-client.js   — Supabase client with Chrome storage adapter
├── tasks-api.js         — Task CRUD operations via Supabase
├── vendor/
│   └── supabase.min.js  — Supabase JS library (vendored)
├── icons/
│   ├── icon16.png       — 16×16 toolbar icon
│   ├── icon48.png       — 48×48 extension page icon
│   └── icon128.png      — 128×128 Chrome Web Store icon
└── README.md
```

## Development

After making changes, go to `chrome://extensions` and click the refresh icon on the TaskTrasker extension card to reload it.

To update the vendored Supabase library:

```bash
npm install @supabase/supabase-js@2
cp node_modules/@supabase/supabase-js/dist/umd/supabase.js vendor/supabase.min.js
rm -rf node_modules package.json package-lock.json
```
