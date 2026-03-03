/**
 * Lycans Tracker Twitch Extension — Panel Logic
 *
 * Flow:
 *  1. Show loading spinner
 *  2. Fetch all data in parallel (joueurs + summary + titles + achievements)
 *  3. Identify broadcaster from Twitch context channel name
 *  4a. If found → render full player card
 *  4b. If not found → show manual player selector dropdown
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────
  let _data        = null;  // { joueurs, summary, titles, achievements }
  let _playerId    = null;  // Currently displayed player's Steam/ID key
  let _isDiscord   = false; // Future: detect from context if needed

  // ── DOM refs ──────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  function showState(id) {
    ['loading-state', 'error-state', 'not-found-state', 'selector-state', 'player-card']
      .forEach(s => {
        const el = $(s);
        if (el) el.classList.toggle('hidden', s !== id);
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  function fmtPct(n) { return (n == null ? '—' : n.toFixed(1) + '%'); }

  function roleLabel(role, power) {
    if (role === 'Villageois Élite' && power) {
      const emoji = ROLE_EMOJI[power] || '⚜️';
      return `${emoji} ${power}`;
    }
    return `${ROLE_EMOJI[role] || '🎭'} ${role}`;
  }

  function streakLabel(streak) {
    if (!streak) return '—';
    if (streak > 0) return `🔥 ${streak}`;
    return `🥶 ${Math.abs(streak)}`;
  }

  function streakClass(streak) {
    if (!streak) return '';
    return streak > 0 ? 'streak-pos' : 'streak-neg';
  }

  function campEmoji(camp) {
    if (camp === 'Villageois') return '👤';
    if (camp === 'Loup')       return '🐺';
    return '⚔️';
  }

  function tierLabel(tier, subLevel) {
    const meta = TIER_META[tier];
    if (!meta) return '';
    return `<span style="color:${meta.color}">${meta.stars}</span> ${meta.label} ${subLevel}`;
  }

  function dashboardUrl(playerName) {
    const params = new URLSearchParams({ highlightedPlayer: playerName, tab: 'playerSelection' });
    return `${LYCANS_DASHBOARD_URL}/?${params}`;
  }

  // ── Rendering functions ────────────────────────────────────────────────

  function renderHeader(player, titleData) {
    const card   = $('player-card');
    const name   = player.playerName || 'Joueur inconnu';
    const avatar = player.image;
    const primaryTitle = titleData?.primaryTitle;
    const titleText = primaryTitle
      ? `${primaryTitle.emoji || ''} ${primaryTitle.title}`
      : '';
    const titleDesc = primaryTitle?.description || '';

    const avatarEl = avatar
      ? `<img class="player-avatar" src="${avatar}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        + `<div class="player-avatar-placeholder" style="display:none">🐺</div>`
      : `<div class="player-avatar-placeholder">🐺</div>`;

    card.querySelector('.card-header').innerHTML = `
      ${avatarEl}
      <div class="header-info">
        <div class="player-name">${name}</div>
        ${titleText ? `<div class="primary-title">${titleText}</div>` : ''}
        ${titleDesc ? `<div class="title-description">${titleDesc}</div>` : ''}
      </div>
    `;
  }

  function renderQuickStats(player) {
    const el = $('quick-stats');
    const sc = streakClass(player.currentStreak);
    el.innerHTML = `
      <div class="stat-item">
        <span class="stat-value win-rate">${fmtPct(player.winRate)}</span>
        <span class="stat-label">Taux victoire</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${player.totalGames ?? '—'}</span>
        <span class="stat-label">Parties</span>
      </div>
      <div class="stat-item">
        <span class="stat-value ${sc}">${streakLabel(player.currentStreak)}</span>
        <span class="stat-label">Série</span>
      </div>
    `;
  }

  function renderCampStats(player) {
    const el = $('camp-stats');
    const camps = ['Villageois', 'Loup', 'Autres'];
    el.innerHTML = camps.map(camp => {
      const s     = player.campStats?.[camp] || { games: 0, wins: 0, winRate: 0 };
      const color = CAMP_COLORS[camp] || '#adadb8';
      if (!s.games) return '';
      return `
        <div class="camp-row">
          <span class="camp-icon">${campEmoji(camp)}</span>
          <div class="camp-bar-wrap">
            <div class="camp-bar-fill" style="width:${s.winRate}%;background:${color}"></div>
          </div>
          <span class="camp-pct">${fmtPct(s.winRate)}</span>
          <span class="camp-games">${s.games}p</span>
        </div>
      `;
    }).join('');
  }

  function renderAchievements(achievementData) {
    const el = $('achievements');
    if (!achievementData) {
      el.closest('.section').classList.add('hidden');
      return;
    }

    $('ach-count-value').textContent = achievementData.totalUnlocked ?? 0;

    // Find the top 3 unlocked levels, ranked by tier value then subLevel
    const TIER_ORDER = { bronze: 0, argent: 1, or: 2, lycans: 3 };
    const unlocked = [];

    for (const ach of (achievementData.achievements || [])) {
      for (const level of (ach.unlockedLevels || [])) {
        unlocked.push({ achId: ach.id, tier: level.tier, subLevel: level.subLevel });
      }
    }

    // Also need definitions to get name/emoji — resolve from window _achDefs if available
    const defs      = _data?.achievements?.achievementDefinitions || [];
    const defMap    = Object.fromEntries(defs.map(d => [d.id, d]));

    unlocked.sort((a, b) => {
      const ta = TIER_ORDER[a.tier] ?? -1;
      const tb = TIER_ORDER[b.tier] ?? -1;
      if (tb !== ta) return tb - ta;
      return b.subLevel - a.subLevel;
    });

    const top3 = unlocked.slice(0, 3);
    el.innerHTML = top3.map(u => {
      const def = defMap[u.achId] || {};
      return `
        <div class="ach-item">
          <span class="ach-emoji">${def.emoji || '🏆'}</span>
          <div class="ach-details">
            <div class="ach-name">${def.name || u.achId}</div>
            <div class="ach-tier">${tierLabel(u.tier, u.subLevel)}</div>
          </div>
        </div>
      `;
    }).join('');

    if (!top3.length) {
      el.innerHTML = '<div style="color:#adadb8;font-size:11px;text-align:center;padding:4px">Aucun succès débloqué</div>';
    }
  }

  function renderRecentGames(player) {
    const el = $('recent-games');
    const games = (player.last10Games || []).slice(0, 5);
    if (!games.length) {
      el.innerHTML = '<div style="color:#adadb8;font-size:11px;text-align:center;padding:4px">Aucune partie récente</div>';
      return;
    }
    el.innerHTML = games.map(g => `
      <div class="game-item ${g.victorious ? 'win' : 'loss'}">
        <span class="game-outcome">${g.victorious ? '✅' : '❌'}</span>
        <span class="game-map">${g.mapName}</span>
        <span class="game-role">${roleLabel(g.role, g.power)}</span>
      </div>
    `).join('');
  }

  function renderFavLine(player) {
    const el = $('fav-line');
    const role = player.favoriteRole || '—';
    const map  = player.favoriteMap  || '—';
    const emoji = ROLE_EMOJI[role] || '🎭';
    el.innerHTML = `Rôle favori&nbsp;: <span>${emoji} ${role}</span>&nbsp;&nbsp;|&nbsp;&nbsp;Carte favorite&nbsp;: <span>${map}</span>`;
  }

  function renderFooter(player) {
    $('dashboard-link').href = dashboardUrl(player.playerName);
  }

  // ── Full card render ───────────────────────────────────────────────────

  function renderCard(playerId) {
    _playerId = playerId;

    const { summary, titles, achievements } = _data;
    const playerRecord = PlayerMatcher.lookupPlayer(playerId, summary, titles, achievements);
    if (!playerRecord) {
      showState('not-found-state');
      return;
    }

    const { summary: ps, title: pt, achievements: pa } = playerRecord;

    // Also merge identity from joueurs.json if summary doesn't have image
    const joueurInfo = (_data.joueurs?.Players || []).find(
      p => p.SteamID === playerId || p.ID === playerId
    );
    if (joueurInfo && ps) {
      if (!ps.image)     ps.image     = joueurInfo.Image || null;
      if (!ps.twitchUrl) ps.twitchUrl = joueurInfo.Twitch || null;
    }

    renderHeader(ps || { playerName: pt?.playerName || '?' }, pt);
    if (ps) {
      renderQuickStats(ps);
      renderCampStats(ps);
      renderRecentGames(ps);
      renderFavLine(ps);
    }
    renderAchievements(pa);
    renderFooter(ps || { playerName: pt?.playerName || '?' });

    showState('player-card');
  }

  // ── Manual selector ────────────────────────────────────────────────────

  function buildSelector(players) {
    const sel = $('player-select');
    sel.innerHTML = '<option value="">-- Choisir un joueur --</option>'
      + players.map(p =>
          `<option value="${p.playerId}">${p.playerName}</option>`
        ).join('');

    sel.addEventListener('change', () => {
      if (sel.value) renderCard(sel.value);
    });

    showState('selector-state');
  }

  // ── Main initialisation ────────────────────────────────────────────────

  async function init() {
    showState('loading-state');

    try {
      // Fetch all data in parallel
      _data = await DataFetcher.fetchPanelData(_isDiscord);

      if (!_data.joueurs) {
        throw new Error('Impossible de charger la liste des joueurs.');
      }

      // Try auto-detection
      const result = await PlayerMatcher.identify(_data.joueurs);

      if (result.found) {
        renderCard(result.player.playerId);
      } else {
        buildSelector(result.allPlayers);
      }
    } catch (err) {
      console.error('[LycansExt] init error:', err);
      const msgEl = $('error-msg');
      if (msgEl) msgEl.textContent = err.message || 'Erreur de chargement.';
      showState('error-state');
    }
  }

  // ── Boot ───────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
