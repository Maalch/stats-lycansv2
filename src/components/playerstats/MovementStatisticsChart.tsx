import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useMovementStats } from '../../hooks/useMovementStats';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { formatSecondsToMinutesSeconds } from '../../utils/durationFormatters';
import { MIN_GAMES_OPTIONS, MIN_GAMES_DEFAULTS, CHART_LIMITS } from '../../config/chartConstants';
import type { PlayerMovementStats, CampFilter } from '../../hooks/utils/movementStatsUtils';

type ChartMovementStat = PlayerMovementStats & {
  isHighlightedAddition?: boolean;
};

type MovementView = 'running' | 'immobile' | 'walking' | 'crouched' | 'breakdown';

const minGamesOptions = MIN_GAMES_OPTIONS.COMPACT;

export function MovementStatisticsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();

  const [minGames, setMinGames] = useState<number>(
    navigationState.movementStatsState?.minGames || MIN_GAMES_DEFAULTS.STANDARD
  );
  const [view, setView] = useState<MovementView>(
    (navigationState.movementStatsState?.view as MovementView) || 'running'
  );
  const [campFilter, setCampFilter] = useState<CampFilter>(
    (navigationState.movementStatsState?.campFilter as CampFilter) || 'all'
  );
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  const { data: movementData, isLoading, error } = useMovementStats(campFilter);
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  useEffect(() => {
    const currentNavState = navigationState.movementStatsState;
    if (!currentNavState ||
      currentNavState.minGames !== minGames ||
      currentNavState.view !== view ||
      currentNavState.campFilter !== campFilter) {
      updateNavigationState({
        movementStatsState: { minGames, view, campFilter }
      });
    }
  }, [minGames, view, campFilter, updateNavigationState]);

  // Running % ranking
  const { runningChartData, highlightedPlayerAddedRunning } = useMemo(() => {
    if (!movementData?.playerStats) {
      return { runningChartData: [], highlightedPlayerAddedRunning: false };
    }
    const eligible = movementData.playerStats.filter(p => p.gamesPlayed >= minGames);
    const sorted = [...eligible].sort((a, b) => b.runningPercentage - a.runningPercentage).slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let finalData: ChartMovementStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !highlightedInTop) {
      const hp = movementData.playerStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) {
        finalData.push({ ...hp, isHighlightedAddition: true });
        added = true;
      }
    }
    return { runningChartData: finalData, highlightedPlayerAddedRunning: added };
  }, [movementData, minGames, settings.highlightedPlayer]);

  // Immobile % ranking
  const { immobileChartData, highlightedPlayerAddedImmobile } = useMemo(() => {
    if (!movementData?.playerStats) {
      return { immobileChartData: [], highlightedPlayerAddedImmobile: false };
    }
    const eligible = movementData.playerStats.filter(p => p.gamesPlayed >= minGames);
    const sorted = [...eligible].sort((a, b) => b.immobilePercentage - a.immobilePercentage).slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let finalData: ChartMovementStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !highlightedInTop) {
      const hp = movementData.playerStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) {
        finalData.push({ ...hp, isHighlightedAddition: true });
        added = true;
      }
    }
    return { immobileChartData: finalData, highlightedPlayerAddedImmobile: added };
  }, [movementData, minGames, settings.highlightedPlayer]);

  // Walking standing % ranking
  const { walkingChartData, highlightedPlayerAddedWalking } = useMemo(() => {
    if (!movementData?.playerStats) {
      return { walkingChartData: [], highlightedPlayerAddedWalking: false };
    }
    const eligible = movementData.playerStats.filter(p => p.gamesPlayed >= minGames);
    const sorted = [...eligible].sort((a, b) => b.walkingStandingPercentage - a.walkingStandingPercentage).slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let finalData: ChartMovementStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !highlightedInTop) {
      const hp = movementData.playerStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) {
        finalData.push({ ...hp, isHighlightedAddition: true });
        added = true;
      }
    }
    return { walkingChartData: finalData, highlightedPlayerAddedWalking: added };
  }, [movementData, minGames, settings.highlightedPlayer]);

  // Crouched % ranking (WalkingCrouched + ImmobileCrouched)
  const { crouchedChartData, highlightedPlayerAddedCrouched } = useMemo(() => {
    if (!movementData?.playerStats) {
      return { crouchedChartData: [], highlightedPlayerAddedCrouched: false };
    }
    const eligible = movementData.playerStats.filter(p => p.gamesPlayed >= minGames);
    const sorted = [...eligible].sort((a, b) => b.crouchedPercentage - a.crouchedPercentage).slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let finalData: ChartMovementStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !highlightedInTop) {
      const hp = movementData.playerStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) {
        finalData.push({ ...hp, isHighlightedAddition: true });
        added = true;
      }
    }
    return { crouchedChartData: finalData, highlightedPlayerAddedCrouched: added };
  }, [movementData, minGames, settings.highlightedPlayer]);

  // Avg total movement time per game breakdown (stacked bar)
  const { breakdownChartData, highlightedPlayerAddedBreakdown } = useMemo(() => {
    if (!movementData?.playerStats) {
      return { breakdownChartData: [], highlightedPlayerAddedBreakdown: false };
    }
    const eligible = movementData.playerStats.filter(p => p.gamesPlayed >= minGames);
    const sorted = [...eligible]
      .sort((a, b) => (b.avgRunning + b.avgWalkingStanding + b.avgWalkingCrouched + b.avgImmobileStanding + b.avgImmobileCrouched)
        - (a.avgRunning + a.avgWalkingStanding + a.avgWalkingCrouched + a.avgImmobileStanding + a.avgImmobileCrouched))
      .slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && sorted.some(p => p.player === settings.highlightedPlayer);
    let finalData: ChartMovementStat[] = [...sorted];
    let added = false;
    if (settings.highlightedPlayer && !highlightedInTop) {
      const hp = movementData.playerStats.find(p => p.player === settings.highlightedPlayer);
      if (hp) {
        finalData.push({ ...hp, isHighlightedAddition: true });
        added = true;
      }
    }
    return { breakdownChartData: finalData, highlightedPlayerAddedBreakdown: added };
  }, [movementData, minGames, settings.highlightedPlayer]);

  if (isLoading) {
    return <div className="donnees-attente">Récupération des statistiques de déplacement...</div>;
  }
  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }
  if (!movementData) {
    return <div className="donnees-manquantes">Aucune donnée de déplacement disponible</div>;
  }

  const eligiblePlayersCount = movementData.playerStats.filter(p => p.gamesPlayed >= minGames).length;

  const renderXAxis = () => (
    <XAxis
      dataKey="player"
      angle={-45}
      textAnchor="end"
      height={80}
      interval={0}
      tick={({ x, y, payload }: any) => (
        <text
          x={x} y={y} dy={16}
          textAnchor="end"
          fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
          fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
          fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
          transform={`rotate(-45 ${x} ${y})`}
        >
          {payload.value}
        </text>
      )}
    />
  );

  const renderBar = (dataKey: string, chartTitle: string) => (
    <Bar
      dataKey={dataKey}
      shape={(props: any) => {
        const { x, y, width, height, payload } = props;
        const entry = payload as ChartMovementStat;
        const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
        const isHoveredPlayer = highlightedPlayer === entry.player;
        const isHighlightedAddition = entry.isHighlightedAddition;
        const playerColor = playersColor[entry.player] || 'var(--chart-primary)';

        return (
          <Rectangle
            x={x} y={y} width={width} height={height}
            fill={playerColor}
            stroke={
              isHighlightedFromSettings ? 'var(--accent-primary)' :
              isHoveredPlayer ? '#000000' : 'none'
            }
            strokeWidth={isHighlightedFromSettings ? 3 : isHoveredPlayer ? 2 : 0}
            strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
            opacity={isHighlightedAddition ? 0.8 : 1}
            onClick={() => navigateToGameDetails({ selectedPlayer: entry.player, fromComponent: chartTitle })}
            onMouseEnter={() => setHighlightedPlayer(entry.player)}
            onMouseLeave={() => setHighlightedPlayer(null)}
            style={{ cursor: 'pointer' }}
          />
        );
      }}
    />
  );

  const renderTooltip = (primaryLabel: string, primaryKey: keyof PlayerMovementStats, isPercent: boolean) => (
    <Tooltip
      content={({ active, payload }) => {
        if (active && payload && payload.length > 0) {
          const d = payload[0].payload as ChartMovementStat;
          const primaryValue = d[primaryKey] as number;
          return (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
              <div>Parties: {d.gamesPlayed}</div>
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                <strong>{primaryLabel}:</strong> {isPercent ? `${primaryValue.toFixed(1)}%` : formatSecondsToMinutesSeconds(primaryValue)}
              </div>
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                <strong>Moyennes par partie:</strong>
              </div>
              <div>🏃 Course: {formatSecondsToMinutesSeconds(d.avgRunning)} ({d.runningPercentage.toFixed(1)}%)</div>
              <div>🚶 Marche debout: {formatSecondsToMinutesSeconds(d.avgWalkingStanding)}</div>
              <div>🧎 Marche accroupi: {formatSecondsToMinutesSeconds(d.avgWalkingCrouched)}</div>
              <div>🧍 Immobile debout: {formatSecondsToMinutesSeconds(d.avgImmobileStanding)}</div>
              <div>🪑 Immobile accroupi: {formatSecondsToMinutesSeconds(d.avgImmobileCrouched)}</div>
              {d.isHighlightedAddition && (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                  🎯 Affiché via sélection personnelle
                  {d.gamesPlayed < minGames && ` (< ${minGames} parties)`}
                </div>
              )}
            </div>
          );
        }
        return null;
      }}
    />
  );

  const renderHighlightNote = (added: boolean) => (
    added && settings.highlightedPlayer && (
      <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary-text)', fontStyle: 'italic', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
        🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
      </p>
    )
  );

  const renderControls = () => (
    <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <label htmlFor="movement-view-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Vue:</label>
      <select
        id="movement-view-select"
        value={view}
        onChange={(e) => setView(e.target.value as MovementView)}
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
      >
        <option value="running">% Temps en course</option>
        <option value="immobile">% Temps immobile (debout)</option>
        <option value="walking">% Temps de marche (debout)</option>
        <option value="crouched">% Temps accroupi</option>
        <option value="breakdown">Répartition moyenne</option>
      </select>

      <label htmlFor="camp-filter-movement" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '1rem' }}>Camp:</label>
      <select
        id="camp-filter-movement"
        value={campFilter}
        onChange={(e) => setCampFilter(e.target.value as CampFilter)}
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
      >
        <option value="all">Tous les camps</option>
        <option value="villageois">Camp Villageois</option>
        <option value="loup">Camp Loup</option>
        <option value="autres">Autres (Solo)</option>
      </select>

      <label htmlFor="min-games-movement" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '1rem' }}>Min. parties:</label>
      <select
        id="min-games-movement"
        value={minGames}
        onChange={(e) => setMinGames(Number(e.target.value))}
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
      >
        {minGamesOptions.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques de Déplacement</h2>
      <p className="lycans-stats-info">
        {movementData.gamesWithMovementData} parties avec données de déplacement.
      </p>

      {renderControls()}

      <div className="lycans-graphiques-groupe">
        {view === 'running' && (
          <div className="lycans-graphique-section">
            <h3>Pourcentage du temps en course</h3>
            {renderHighlightNote(highlightedPlayerAddedRunning)}
            <FullscreenChart title="% Temps en Course">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runningChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    {renderXAxis()}
                    <YAxis
                      label={{ value: '% du temps en course', angle: 270, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    {renderTooltip('% en course', 'runningPercentage', true)}
                    {renderBar('runningPercentage', '% Temps en Course')}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
              Top {runningChartData.length} des joueurs (sur {eligiblePlayersCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
            </p>
          </div>
        )}

        {view === 'immobile' && (
          <div className="lycans-graphique-section">
            <h3>Pourcentage du temps immobile (debout)</h3>
            {renderHighlightNote(highlightedPlayerAddedImmobile)}
            <FullscreenChart title="% Temps Immobile (debout)">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={immobileChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    {renderXAxis()}
                    <YAxis
                      label={{ value: '% du temps immobile debout', angle: 270, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    {renderTooltip('% immobile debout', 'immobilePercentage', true)}
                    {renderBar('immobilePercentage', '% Temps Immobile (debout)')}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
              Top {immobileChartData.length} des joueurs (sur {eligiblePlayersCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
            </p>
          </div>
        )}

        {view === 'walking' && (
          <div className="lycans-graphique-section">
            <h3>Pourcentage du temps de marche (debout)</h3>
            {renderHighlightNote(highlightedPlayerAddedWalking)}
            <FullscreenChart title="% Temps de Marche (debout)">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={walkingChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    {renderXAxis()}
                    <YAxis
                      label={{ value: '% du temps en marche debout', angle: 270, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    {renderTooltip('% marche debout', 'walkingStandingPercentage', true)}
                    {renderBar('walkingStandingPercentage', '% Temps de Marche (debout)')}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
              Top {walkingChartData.length} des joueurs (sur {eligiblePlayersCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
            </p>
          </div>
        )}

        {view === 'crouched' && (
          <div className="lycans-graphique-section">
            <h3>Pourcentage du temps accroupi (marche + immobile)</h3>
            {renderHighlightNote(highlightedPlayerAddedCrouched)}
            <FullscreenChart title="% Temps Accroupi">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={crouchedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    {renderXAxis()}
                    <YAxis
                      label={{ value: '% du temps accroupi', angle: 270, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    {renderTooltip('% accroupi', 'crouchedPercentage', true)}
                    {renderBar('crouchedPercentage', '% Temps Accroupi')}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
              Top {crouchedChartData.length} des joueurs (sur {eligiblePlayersCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
            </p>
          </div>
        )}

        {view === 'breakdown' && (
          <div className="lycans-graphique-section">
            <h3>Répartition moyenne du temps par partie</h3>
            {renderHighlightNote(highlightedPlayerAddedBreakdown)}
            <FullscreenChart title="Répartition Moyenne du Temps">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    {renderXAxis()}
                    <YAxis
                      label={{ value: 'Secondes par partie', angle: 270, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                      tickFormatter={(v) => formatSecondsToMinutesSeconds(v)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const d = payload[0].payload as ChartMovementStat;
                          const totalAvg = d.avgRunning + d.avgWalkingStanding + d.avgWalkingCrouched + d.avgImmobileStanding + d.avgImmobileCrouched;
                          return (
                            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px', fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                              <div>Parties: {d.gamesPlayed}</div>
                              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                                <strong>Temps moyen total: {formatSecondsToMinutesSeconds(totalAvg)}</strong>
                              </div>
                              <div style={{ color: '#e74c3c' }}>🏃 Course: {formatSecondsToMinutesSeconds(d.avgRunning)} ({d.runningPercentage.toFixed(1)}%)</div>
                              <div style={{ color: '#3498db' }}>🚶 Marche debout: {formatSecondsToMinutesSeconds(d.avgWalkingStanding)} ({d.walkingPercentage > 0 ? ((d.avgWalkingStanding / totalAvg) * 100).toFixed(1) : '0'}%)</div>
                              <div style={{ color: '#2ecc71' }}>🧎 Marche accroupi: {formatSecondsToMinutesSeconds(d.avgWalkingCrouched)}</div>
                              <div style={{ color: '#f39c12' }}>🧍 Immobile debout: {formatSecondsToMinutesSeconds(d.avgImmobileStanding)}</div>
                              <div style={{ color: '#9b59b6' }}>🪑 Immobile accroupi: {formatSecondsToMinutesSeconds(d.avgImmobileCrouched)}</div>
                              {d.isHighlightedAddition && (
                                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                                  🎯 Affiché via sélection personnelle
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="avgRunning" stackId="movement" fill="#e74c3c" name="Course" />
                    <Bar dataKey="avgWalkingStanding" stackId="movement" fill="#3498db" name="Marche debout" />
                    <Bar dataKey="avgWalkingCrouched" stackId="movement" fill="#2ecc71" name="Marche accroupi" />
                    <Bar dataKey="avgImmobileStanding" stackId="movement" fill="#f39c12" name="Immobile debout" />
                    <Bar dataKey="avgImmobileCrouched" stackId="movement" fill="#9b59b6" name="Immobile accroupi" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
              Top {breakdownChartData.length} des joueurs (sur {eligiblePlayersCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
              <span style={{ color: '#e74c3c' }}>● Course</span>
              <span style={{ color: '#3498db' }}>● Marche debout</span>
              <span style={{ color: '#2ecc71' }}>● Marche accroupi</span>
              <span style={{ color: '#f39c12' }}>● Immobile debout</span>
              <span style={{ color: '#9b59b6' }}>● Immobile accroupi</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
