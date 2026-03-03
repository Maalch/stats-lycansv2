/**
 * Player matcher for the Lycans Tracker Twitch Extension.
 *
 * Auto-detects which Lycans Tracker player the current broadcaster is by
 * matching their Twitch channel login name against the Twitch URLs stored
 * in joueurs.json (e.g. "https://www.twitch.tv/ponce" → "ponce").
 *
 * 83 out of 89 players have Twitch URLs, so auto-detection covers ~93% of
 * known broadcasters. The remaining players fall back to a manual selector.
 */

const PlayerMatcher = (() => {

  /**
   * Extract the Twitch login name from a full Twitch URL.
   * "https://www.twitch.tv/Ponce" → "ponce"
   * @param {string|null} url
   * @returns {string|null}
   */
  function twitchLoginFromUrl(url) {
    if (!url) return null;
    try {
      const parts = new URL(url).pathname.replace(/^\//, '').split('/');
      return parts[0]?.toLowerCase() || null;
    } catch {
      return url.split('/').pop()?.toLowerCase() || null;
    }
  }

  /**
   * Build a lookup map: twitchLogin → { playerId, playerName, image, twitchUrl }
   * from the loaded joueurs.json data.
   *
   * Works with both the main joueurs.json (SteamID field) and the Discord
   * variant (ID field).
   *
   * @param {Object} joueursData - Parsed joueurs.json
   * @returns {Map<string, Object>}
   */
  function buildLoginMap(joueursData) {
    const map = new Map();
    for (const p of (joueursData?.Players || [])) {
      const login = twitchLoginFromUrl(p.Twitch);
      if (login) {
        map.set(login, {
          playerId:   p.SteamID || p.ID || p.Joueur,
          playerName: p.Joueur,
          image:      p.Image || null,
          twitchUrl:  p.Twitch || null,
        });
      }
    }
    return map;
  }

  /**
   * Return all known players as an array for the manual-fallback selector,
   * sorted alphabetically by display name.
   *
   * @param {Object} joueursData
   * @returns {Array<{ playerId, playerName, image }>}
   */
  function allPlayers(joueursData) {
    return (joueursData?.Players || [])
      .map(p => ({
        playerId:   p.SteamID || p.ID || p.Joueur,
        playerName: p.Joueur,
        image:      p.Image || null,
      }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName));
  }

  /**
   * Attempt to identify the broadcaster from the Twitch Extension context.
   *
   * The Twitch Extension SDK calls `onContext` with a context object that
   * contains `context.channel` — the channel login name (e.g. "ponce").
   *
   * Returns a Promise that resolves with:
   *   { found: true,  player: { playerId, playerName, image, twitchUrl } }
   *   { found: false, allPlayers: [...], loginMap: Map }   ← manual selection needed
   *
   * @param {Object} joueursData - Pre-loaded joueurs.json
   * @returns {Promise<Object>}
   */
  function identify(joueursData) {
    const loginMap = buildLoginMap(joueursData);

    return new Promise(resolve => {
      let resolved = false;

      function tryResolve(channelLogin) {
        if (resolved) return;
        if (!channelLogin) return;

        resolved = true;
        const player = loginMap.get(channelLogin.toLowerCase());
        if (player) {
          resolve({ found: true, player });
        } else {
          resolve({ found: false, allPlayers: allPlayers(joueursData), loginMap });
        }
      }

      // Primary source: onContext provides the channel name
      if (window.Twitch?.ext?.onContext) {
        window.Twitch.ext.onContext(context => {
          tryResolve(context.channel);
        });
      }

      // Fallback: onAuthorized may provide channelId (numeric) – not directly
      // useful for name matching, but we can still use it as a signal that
      // auth is ready and attempt resolution if context has already fired.
      if (window.Twitch?.ext?.onAuthorized) {
        window.Twitch.ext.onAuthorized(() => {
          // If context hasn't resolved us yet, give it one more tick
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve({ found: false, allPlayers: allPlayers(joueursData), loginMap });
            }
          }, 500);
        });
      }

      // Hard timeout: if neither callback fires (e.g. local dev without rig),
      // resolve after 3 seconds to show the manual selector.
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ found: false, allPlayers: allPlayers(joueursData), loginMap });
        }
      }, 3000);
    });
  }

  /**
   * Look up a player record from all loaded data by their playerId.
   *
   * @param {string} playerId
   * @param {Object} summary        - playerSummary.json
   * @param {Object|null} titles    - playerTitles.json
   * @param {Object|null} achievements - playerAchievements.json
   * @returns {{ summary, title, achievements } | null}
   */
  function lookupPlayer(playerId, summary, titles, achievements) {
    const s = summary?.players?.[playerId] || null;
    const t = titles?.players?.[playerId] || null;
    const a = achievements?.players?.[playerId] || null;
    if (!s && !t && !a) return null;
    return { summary: s, title: t, achievements: a };
  }

  return { identify, lookupPlayer, allPlayers, twitchLoginFromUrl };
})();
