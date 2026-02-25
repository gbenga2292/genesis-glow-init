---
description: How to release a new version of the DCEL Inventory app (Electron + Android)
---

# How to Release a New Version

This workflow covers the full release process. GitHub Actions does the heavy lifting
(building the Electron .exe and Android bundle) — you just need to bump the version and push a tag.

## Pre-requisites
- Your code is working correctly on the `develop` branch
- You've tested both Electron (`npm run electron:dev`) and Android modes

---

## Step 1 — Merge develop → main

On your machine, switch to main and merge:

```bash
git checkout main
git merge develop
```

---

## Step 2 — Bump the version number

Choose ONE of these depending on the type of change:

```bash
# Patch release (bug fixes only): 1.0.0 → 1.0.1
npm version patch

# Minor release (new features, backward compatible): 1.0.0 → 1.1.0
npm version minor

# Major release (breaking changes): 1.0.0 → 2.0.0
npm version major
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag (e.g. `v1.0.1`)

---

## Step 3 — Push both the commit AND the tag

```bash
git push && git push --tags
```

The `--tags` part is critical — it's what triggers the release workflow on GitHub Actions.

---

## Step 4 — Monitor the build on GitHub

1. Go to: https://github.com/gbenga2292/genesis-glow-init/actions
2. You'll see the "🚀 Release — Build & Publish" workflow running
3. It takes approximately 10–15 minutes to build everything
4. When complete, a new Release is created at:
   https://github.com/gbenga2292/genesis-glow-init/releases

---

## Step 5 — Add release notes (optional but recommended)

1. Go to the newly created Release on GitHub
2. Click "Edit"
3. Fill in the "What's Changed" section with what you fixed/added
4. Click "Save"

---

## What users see after this:

### Desktop (Electron) users:
- App checks for updates 10 seconds after launch (if auto-check is on)
- A non-invasive popup appears in the bottom-right corner: "Update Available"
- User clicks "Go to Settings to Update"
- In Settings → App Updates, they click "Download Update"
- Progress bar shows download
- "Install & Restart" button appears — app restarts with new version ✅

### Android users:
- Same non-invasive popup appears after app loads
- User goes to Settings → App Updates → "Check for Updates"
- If a new version is found, "Download Update" button appears
- App downloads new bundle in-background
- "Install & Restart" applies the update on next launch ✅

---

## Branch Strategy

| Branch | Purpose | CI/CD Trigger |
|--------|---------|---------------|
| `develop` | Day-to-day work | Lint + TypeScript check only |
| `main` | Stable, production-ready code | Nothing (waiting for a tag) |
| `v1.0.1` (tag) | Version release tag | Full build + GitHub Release |

---

## Reverting a bad release

If you accidentally released a broken version:

```bash
# Delete the tag locally and remotely
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1
```

Then go to GitHub → Releases → mark the release as "Pre-release" or delete it
so the updater won't serve it to users.
