# Discord Team Data Sync - Quick Start

## 🚀 Setup in 3 Steps

### Step 1: Add GitHub Secret (Required)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter:
   - **Name:** `DISCORD_STATS_LIST_URL`
   - **Value:** Your Discord Team's StatsList.json URL from S3
   - Example: `https://discord-team-bucket.s3.amazonaws.com/StatsList.json`
5. Click **Add secret**

### Step 2: Trigger First Sync

**Option A - Manual Trigger (Recommended for first run):**
1. Go to **Actions** tab in GitHub
2. Select **Update Discord Team Stats Data**
3. Click **Run workflow** → **Run workflow**
4. Wait 2-3 minutes for completion

**Option B - Wait for Scheduled Run:**
- Workflow runs automatically at 5 AM UTC daily

### Step 3: Verify Output

Check that files were created:
1. Go to repository root
2. Navigate to `data/` folder
3. Look for files ending with `_TeamDiscord` or `_TeamDiscord.json`:
   - ✅ `gameLog_TeamDiscord.json`
   - ✅ `playerAchievements_TeamDiscord.json`
   - ✅ `index_TeamDiscord.json`

## ✅ That's It!

Your Discord Team data sync is now active and will:
- 📊 Fetch data from Discord Team's S3 bucket daily
- 🔄 Update `gameLog_TeamDiscord.json` automatically
- 🏆 Generate achievements for Discord Team players
- 📝 Commit changes to your repository
- 🌐 Deploy updates to GitHub Pages

---

## 🧪 Optional: Test Locally

```bash
# Set environment variable (PowerShell)
$env:STATS_LIST_URL="https://your-discord-s3-url.com/StatsList.json"

# Run sync
npm run sync-data-discord

# Check output
ls data/*TeamDiscord*
```

---

## 📋 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run sync-data-discord` | Run Discord Team sync locally |
| Actions → Update Discord Team Stats Data → Run workflow | Manual trigger in GitHub |
| `data/gameLog_TeamDiscord.json` | Main output file |

---

## 🔧 Troubleshooting

**Problem:** Workflow fails with "environment variable not found"  
**Solution:** Add `DISCORD_STATS_LIST_URL` secret (see Step 1)

**Problem:** No files created  
**Solution:** Check workflow logs in Actions tab for errors

**Problem:** Files created but empty  
**Solution:** Verify S3 URL is correct and accessible

---

## 📚 Documentation

- **`DISCORD_SETUP_GUIDE.md`** - Complete setup guide
- **`DISCORD_SUMMARY.md`** - Feature summary
- **`SCRIPTS_COMPARISON.md`** - Compare all sync scripts
- **`ARCHITECTURE.md`** - Visual architecture diagrams

---

## 🆘 Need Help?

1. Check workflow logs in GitHub Actions
2. Review `DISCORD_SETUP_GUIDE.md` for detailed instructions
3. Test locally with `npm run sync-data-discord`
4. Verify S3 bucket accessibility

---

## ✨ Key Features

- ✅ **Independent**: No conflicts with main data files
- ✅ **Automated**: Daily sync at 5 AM UTC
- ✅ **Validated**: Automatic file validation
- ✅ **Documented**: Comprehensive guides included
- ✅ **Tested**: Ready to use out of the box

---

**Next:** After setup, check `docs/data/gameLog_TeamDiscord.json` to see your Discord Team statistics!
