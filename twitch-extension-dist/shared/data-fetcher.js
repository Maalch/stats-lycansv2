/**
 * Data fetcher for the Lycans Tracker Twitch Extension.
 *
 * Fetches static JSON files from www.lycanstracker.fr/data with
 * sessionStorage caching to avoid redundant network requests on
 * repeated view opens within the same browser session.
 *
 * All public functions return Promises.
 */

const DataFetcher = (() => {
  // ── Cache helpers ──────────────────────────────────────────────────────

  const CACHE_PREFIX = 'lycans_ext_';

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, expiresAt } = JSON.parse(raw);
      if (Date.now() > expiresAt) {
        sessionStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function cacheSet(key, data, ttlMs) {
    try {
      sessionStorage.setItem(
        CACHE_PREFIX + key,
        JSON.stringify({ data, expiresAt: Date.now() + ttlMs })
      );
    } catch {
      // sessionStorage quota exceeded — silently ignore
    }
  }

  // ── Core fetch ─────────────────────────────────────────────────────────

  /**
   * Fetch a JSON file from the data CDN.
   * @param {string} path - Relative path under LYCANS_DATA_URL (e.g. '/joueurs.json')
   * @param {string} cacheKey
   * @param {number} ttlMs
   * @returns {Promise<Object>}
   */
  async function fetchJson(path, cacheKey, ttlMs) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const url = LYCANS_DATA_URL + path;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

    const data = await res.json();
    cacheSet(cacheKey, data, ttlMs);
    return data;
  }

  // ── Optional fetch (returns null instead of throwing) ─────────────────

  async function fetchJsonOptional(path, cacheKey, ttlMs) {
    try {
      return await fetchJson(path, cacheKey, ttlMs);
    } catch {
      return null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Fetch the main team joueurs.json (player registry with Twitch URLs).
   * @param {boolean} [isDiscord]
   */
  function fetchJoueurs(isDiscord = false) {
    const path = isDiscord ? '/discord/joueurs.json' : '/joueurs.json';
    return fetchJson(path, 'joueurs' + (isDiscord ? '_discord' : ''), CACHE_TTL.JOUEURS);
  }

  /**
   * Fetch the lightweight player summary (main output of generate-player-summary.js).
   * @param {boolean} [isDiscord]
   */
  function fetchPlayerSummary(isDiscord = false) {
    const path = isDiscord ? '/discord/playerSummary.json' : '/playerSummary.json';
    return fetchJsonOptional(path, 'summary' + (isDiscord ? '_discord' : ''), CACHE_TTL.SUMMARY);
  }

  /**
   * Fetch player titles.
   * @param {boolean} [isDiscord]
   */
  function fetchPlayerTitles(isDiscord = false) {
    const path = isDiscord ? '/discord/playerTitles.json' : '/playerTitles.json';
    return fetchJsonOptional(path, 'titles' + (isDiscord ? '_discord' : ''), CACHE_TTL.TITLES);
  }

  /**
   * Fetch player achievements.
   * @param {boolean} [isDiscord]
   */
  function fetchPlayerAchievements(isDiscord = false) {
    const path = isDiscord ? '/discord/playerAchievements.json' : '/playerAchievements.json';
    return fetchJsonOptional(path, 'achievements' + (isDiscord ? '_discord' : ''), CACHE_TTL.ACHIEVEMENTS);
  }

  /**
   * Fetch all data needed for the panel in parallel.
   * Returns an object with keys: joueurs, summary, titles, achievements
   * @param {boolean} [isDiscord]
   */
  async function fetchPanelData(isDiscord = false) {
    const [joueurs, summary, titles, achievements] = await Promise.all([
      fetchJoueurs(isDiscord),
      fetchPlayerSummary(isDiscord),
      fetchPlayerTitles(isDiscord),
      fetchPlayerAchievements(isDiscord),
    ]);
    return { joueurs, summary, titles, achievements };
  }

  /**
   * Fetch the minimal data needed for the video overlay (lighter than full panel).
   * @param {boolean} [isDiscord]
   */
  async function fetchOverlayData(isDiscord = false) {
    const [joueurs, summary, titles] = await Promise.all([
      fetchJoueurs(isDiscord),
      fetchPlayerSummary(isDiscord),
      fetchPlayerTitles(isDiscord),
    ]);
    return { joueurs, summary, titles };
  }

  return { fetchPanelData, fetchOverlayData, fetchJoueurs, fetchPlayerSummary, fetchPlayerTitles, fetchPlayerAchievements };
})();
