# Atlas PWA bundle

Generated from `../atlas-v1/index.html` (the prototype is never modified).

**Rebuild:** `node build.mjs` rewrites index.html, sw.js, manifest and icons. The cache name hashes the source, so edits invalidate old caches.

**Host:** upload this folder as-is to any static host over HTTPS (GitHub Pages, Netlify, Cloudflare Pages, `tailscale serve`...). Subpaths work (all URLs are relative). Local test: `python3 -m http.server`, then http://localhost:8000.

**Install:**
- iOS (Safari only): Share > Add to Home Screen. Opens standalone with a translucent status bar.
- Android (Chrome): menu > Install app / Add to Home screen.

**Updates:** a new version downloads in the background and activates after a full close and reopen.

**Sim strip:** triple-tap the coverage text (top-left) or open with `?sim`.
Progress lives in localStorage per origin, so moving host = fresh state.
iOS may evict Safari-tab storage after ~7 days unused (installed PWAs are exempt).
