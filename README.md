# Dwellness

Home-management PWA for **12104 Estrada Ct**: House Vitals, Floorplan, Equipment (make / model / serial / warranty), Pool & Spa water tests, Maintenance Timeline, Punch List, Ask the House, and Pros.

It uses the same setup as GameTrack and Reel Deck:
- A single-file `index.html` PWA.
- Sign-in is hand-rolled OAuth2 Auth-Code + PKCE against a dedicated Entra SPA app (no MSAL, no client secret).
- Data is a single JSON file in OneDrive, read and written whole through Microsoft Graph.
- Hosted on GitHub Pages.

## Files

```
index.html          the whole app
manifest.json       PWA manifest
sw.js               app-shell cache (never caches Graph or login calls)
icons/              icon-192, icon-512, maskable-512, apple-touch-icon, favicon.svg, favicon-32
```

## Where the data lives

`0 - Data/AI/Life OS/Family/House/app/dwellness.json`

This file is created automatically on the first sign-in, pre-filled with rooms and a starter maintenance schedule. To store it somewhere else, change `CONFIG.DATA_PATH` near the top of `index.html`.

## One-time setup (≈10 min)

1. **Create the Entra app.** Go to Entra → App registrations → New registration.
   - Name: `Dwellness`
   - Account type: Single tenant (tenant `0ae860f2-b1e0-4222-b0e1-37314eddf4df`)
   - Redirect URI: platform **Single-page application (SPA)**, value = the Pages URL, with a trailing slash (e.g. `https://gronnigers.github.io/dwellness/`)
   - Optional: add `http://localhost:8080/` as a second SPA redirect URI for local testing.
2. **Add API permissions** (Microsoft Graph, delegated):
   - `User.Read`, which provides the first name shown in the greeting
   - `Sites.Selected`, scoped to the Dwellness site only (see below)
   - `offline_access`
   - Then grant admin consent.
3. **Paste the client ID.** Copy the Application (client) ID into `CONFIG.CLIENT_ID` in `index.html`, replacing `YOUR-DWELLNESS-CLIENT-ID`.
4. **Publish.** Create a repo named `dwellness` under `gronnigers`, push these files to the repo root, then go to Settings → Pages → Deploy from branch `main` / root.
5. **Install on your devices.** Open the Pages URL:
   - iPhone / iPad: Safari → Share → Add to Home Screen.
   - Desktop: Edge or Chrome → Install.

## Where the data lives, and what the app can reach

- **Data:** SharePoint site `https://gronnigers.sharepoint.com/sites/Dwellness` → Documents → `Dwellness/` holds `dwellness.json` plus a `photos/` folder. It's created automatically on first sign-in.
- **Permissions:** the Dwellness app holds only `User.Read`, `Sites.Selected` and `offline_access`.
- **Site grant:** `Sites.Selected` has been granted **write** on the Dwellness site only (done once with PowerShell `New-MgSitePermission`). It can't reach OneDrive, mail, calendar, or any other site, and it can't grant other apps access to the site. This was verified with a 20-check test on 2026-09-28.
- **Access:** everyone who uses the app needs access to the Dwellness site. You can add people with the app's Invite button (Settings → Household), which shares the `Dwellness` folder with edit rights, or from SharePoint → Share.
- **Saving:** writes are conditional (If-Match on the eTag). If someone else saved first, the app pulls their version, does a 3-way merge per record, and retries.
- **Seeing other people's changes:** while the app is open, it checks every ~20 seconds and whenever it comes back to the foreground.
- **Personal to each device:** theme choice only.

## Behavior notes

- **Greeting** uses the signed-in Entra user's first name (`givenName` from Graph `/me`).
- **Address** under the logo defaults to `12104 Estrada Ct`. You can edit it in Settings; the change is stored in the data file.
- **Layout by device:**
  - Desktop, and iPad or iPhone in landscape: nav on the left.
  - iPhone or iPad in portrait: floating bottom tabs (Vitals · Equipment · Pool · Punch · Ask · More). More holds Floorplan, Timeline, Pros and Settings.
  - Short landscape phones: a slim icon rail.
- **House Vitals score** (0–100 per system) is calculated from:
  - overdue and upcoming maintenance
  - open punch items, weighted by priority
  - warranties ending soon
  - pool and spa tests that are stale or out of range
- **Pool & Spa targets:**
  - Pool: pH 7.2–7.8, free chlorine 1–3, alkalinity 80–120, CYA 30–50
  - Spa: pH 7.2–7.8, bromine 3–5, alkalinity 80–120, max 104°F
  - To change these, edit `RANGES` in `index.html`.
- **Ask the House** runs entirely in the app; nothing is sent anywhere else. It answers questions about serials, models and warranties, what's due or overdue, water status, open fixes, who to call, and when a task was last done. It also takes commands like "add leaky faucet to the punch list".
- **Try it with sample data** on the sign-in screen runs a demo that stays on the device and never touches OneDrive.
- **Offline:** the last loaded copy is cached on the device. Changes save to OneDrive about 0.7 seconds after each edit, and the sidebar shows Synced, Saving… or Not saved. The app re-reads OneDrive whenever it comes back to the foreground.
- **Backup:** Settings → Export backup downloads the JSON.

## AI in Search

- **How it works:** Search sends your question, plus a text copy of the house records (no photos), to a Cloudflare Worker called `dwellness-ai`, at https://dwellness-ai.gronniger.workers.dev.
- **Who can use it:** the Worker checks the Microsoft sign-in with Graph `/me`, allows only the tenant `0ae860f2-…`, and only accepts calls from gronnigers.github.io. It then asks Claude and returns the answer.
- **Where it lives:** the Worker code is in `C:\dwellness` (`wrangler.toml` and `src/index.js`). The Anthropic key is a Wrangler secret (`ANTHROPIC_API_KEY`) and never appears in this repo.
- **Change the model:** edit `MODEL` in `wrangler.toml`, then run `npx wrangler deploy`.
- **Restrict to specific people:** set `ALLOWED_USERS` to a comma-separated list of emails.
- **Rotate the key:** run `npx wrangler secret put ANTHROPIC_API_KEY`. The current key expires 12/31/2027.
- **Fallbacks:** demo mode, the "AI off" toggle, and any Worker failure all fall back to the on-device search.

## Roadmap

- **Link previews for Ideas:** fill in the photo, title and price automatically from a pasted product link. This needs a small helper service.
- **Security hardening:** add a Content Security Policy, self-host the fonts, add a Conditional Access policy for the Dwellness app, and harden the GitHub account.

## If sign-in fails

Check Entra → Enterprise apps → Dwellness → Sign-in logs for the AADSTS error code. Usual causes:
- The redirect URI isn't the exact Pages URL, including the trailing slash.
- The redirect is registered under "Web" instead of "SPA".
- Admin consent hasn't been granted.
