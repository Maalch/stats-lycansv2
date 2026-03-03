/**
 * Lycans Tracker Twitch Extension — Video Overlay Logic
 *
 * Renders a small toggleable badge in the bottom-right corner of the video:
 *   Collapsed → pill showing primary title emoji + win rate
 *   Expanded  → card with name, title, win rate, games played, streak
 *
 * Lighter than the panel: loads only joueurs + playerSummary + playerTitles.
 * Toggle state persists in localStorage so returning viewers keep their preference.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'lycans_overlay_expanded';

  // ── DOM refs ──────────────────────────────────────────────────────────
  const badge     = document.getElementById('overlay-badge');
  const pill      = badge.querySelector('.badge-pill');
  const pillEmoji = badge.querySelector('.pill-emoji');
  const pillWr    = badge.querySelector('.pill-winrate');
  const pillTitle = badge.querySelector('.pill-title-text');
  const card      = badge.querySelector('.badge-card');
  const cardName  = badge.querySelector('.card-name');
  const cardTitle = badge.querySelector('.card-title');
  const cardStats = badge.querySelector('.card-stats');
  const cardLink  = badge.querySelector('.card-link');

  // ── Helpers ────────────────────────────────────────────────────────────

  function fmtPct(n) { return n == null ? '—' : n.toFixed(1) + '%'; }

  function streakLabel(s) {
    if (!s) return '—';
    return s > 0 ? `🔥 ${s}` : `🥶 ${Math.abs(s)}`;
  }

  function streakClass(s) {
    if (!s) return '';
    return s > 0 ? 'streak-pos' : 'streak-neg';
  }

  // ── Toggle expand/collapse ────────────────────────────────────────────

  function setExpanded(expanded) {
    badge.classList.toggle('expanded', expanded);
    try { localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0'); } catch {}
  }

  // Read stored preference
  const storedExpanded = (() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  })();

  badge.addEventListener('click', () => setExpanded(!badge.classList.contains('expanded')));

  // ── Render ─────────────────────────────────────────────────────────────

  function render(playerInfo, titleData) {
    const ps = playerInfo;
    const primaryTitle = titleData?.primaryTitle;
    const titleEmoji   = primaryTitle?.emoji  || '🐺';
    const titleText    = primaryTitle?.title  || '';

    // Pill
    pillEmoji.textContent = titleEmoji;
    pillWr.textContent    = fmtPct(ps.winRate);
    if (pillTitle) pillTitle.textContent = titleText ? `· ${titleText}` : '';

    // Expanded card
    cardName.textContent  = ps.playerName || '—';
    cardTitle.textContent = titleText ? `${titleEmoji} ${titleText}` : '';

    const sc = streakClass(ps.currentStreak);
    cardStats.innerHTML = `
      <div class="card-stat">
        <span class="card-stat-value win-rate">${fmtPct(ps.winRate)}</span>
        <span class="card-stat-label">Victoires</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-value">${ps.totalGames ?? '—'}</span>
        <span class="card-stat-label">Parties</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-value ${sc}">${streakLabel(ps.currentStreak)}</span>
        <span class="card-stat-label">Série</span>
      </div>
    `;

    cardLink.href = `${LYCANS_DASHBOARD_URL}/?highlightedPlayer=${encodeURIComponent(ps.playerName)}&tab=playerSelection`;

    badge.classList.remove('hidden');
    setExpanded(storedExpanded);
  }

  // ── Main ───────────────────────────────────────────────────────────────

  async function init() {
    try {
      const { joueurs, summary, titles } = await DataFetcher.fetchOverlayData(false);

      if (!joueurs) return; // Can't identify without joueurs

      const result = await PlayerMatcher.identify(joueurs);
      if (!result.found) return; // Not a known player — keep overlay hidden

      const { playerId } = result.player;
      const ps = summary?.players?.[playerId];
      const pt = titles?.players?.[playerId];

      if (!ps) return; // No stats yet for this player

      render(ps, pt);
    } catch (err) {
      console.warn('[LycansOverlay] init error:', err);
      // Silently fail — overlay stays hidden
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
