import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GameEvent, PlayerStat } from '../../hooks/useCombinedRawData';
import { GameTimeline, getActionLabel } from './GameTimeline';

vi.mock('../../types/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../types/api')>();
  return { ...actual, useThemeAdjustedLycansColorScheme: () => ({}) };
});

function makePlayer(overrides: Partial<PlayerStat>): PlayerStat {
  return {
    Username: 'khalen',
    MainRoleInitial: 'Villageois',
    MainRoleChanges: [],
    Power: null,
    SecondaryRole: null,
    DeathDateIrl: null,
    DeathTiming: null,
    DeathPosition: null,
    DeathType: null,
    KillerName: null,
    Victorious: false,
    Votes: [],
    SecondsTalkedOutsideMeeting: 0,
    SecondsTalkedDuringMeeting: 0,
    ...overrides,
  };
}

const nightStart = '2026-03-03T14:37:12.3780654Z';
const meetingStart = '2026-03-03T14:38:42.6945994Z';
const boundaryDate = '2026-03-03T14:38:42.6935952Z';
const phases: GameEvent[] = [
  { Date: nightStart, Timing: 'N2', Type: 'NewPhase', Name: 'N2' },
  { Date: meetingStart, Timing: 'M2', Type: 'NewPhase', Name: 'M2' },
];

function renderTimeline(gameEvents: GameEvent[], playerData: PlayerStat[] = []) {
  render(createElement(GameTimeline, {
    game: { gameEvents, playerData, startDate: nightStart },
  }));
  fireEvent.click(screen.getByRole('button', { name: /Chronologie de la Partie/ }));
  for (const button of screen.getAllByRole('button', { name: /Journée|Pré-partie/ })) {
    fireEvent.click(button);
  }
}

describe('getActionLabel', () => {
  it.each([
    ['TournamentWon', 'Remporte le tournoi'],
    ['TournamentLost', 'Perd le tournoi'],
  ])('translates %s', (actionType, expectedLabel) => {
    expect(getActionLabel(actionType, null, null)).toBe(expectedLabel);
  });
});

describe('GameTimeline phase assignment', () => {
  it.each([
    {
      name: 'death',
      player: makePlayer({ DeathDateIrl: boundaryDate, DeathTiming: 'M2' }),
      description: 'Meurt',
    },
    {
      name: 'action',
      player: makePlayer({
        Actions: [{
          Date: boundaryDate,
          Timing: 'M2',
          Position: { x: 0, y: 0, z: 0 },
          ActionType: 'Transform',
          ActionName: null,
          ActionTarget: null,
        }],
      }),
      description: 'Se transforme',
    },
    {
      name: 'vote',
      player: makePlayer({ Votes: [{ Day: 2, Target: 'Passé', Date: boundaryDate }] }),
      description: 'Passe son vote',
    },
  ])('uses recorded timing for a $name just before the phase marker', ({ player, description }) => {
    renderTimeline(phases, [player]);

    expect(screen.getByText('🗣️ Réunion 2')).toBeInTheDocument();
    expect(screen.queryByText('🌙 Nuit 2')).not.toBeInTheDocument();
    expect(screen.getAllByText(description)).toHaveLength(1);
  });

  it('uses recorded timing for game events just before the phase marker', () => {
    renderTimeline([
      ...phases,
      { Date: boundaryDate, Timing: 'M2', Type: 'NewMayor', Name: 'khalen' },
    ]);

    expect(screen.getByText('🗣️ Réunion 2')).toBeInTheDocument();
    expect(screen.queryByText('🌙 Nuit 2')).not.toBeInTheDocument();
    expect(screen.getAllByText('khalen devient Maire')).toHaveLength(1);
  });

  it('keeps an event in its recorded phase even after the next phase marker', () => {
    renderTimeline([
      ...phases,
      { Date: meetingStart, Timing: 'N2', Type: 'NewMayor', Name: 'khalen' },
    ]);

    expect(screen.getByText('🌙 Nuit 2')).toBeInTheDocument();
    expect(screen.queryByText('🗣️ Réunion 2')).not.toBeInTheDocument();
    expect(screen.getAllByText('khalen devient Maire')).toHaveLength(1);
  });

  it.each(['', 'invalid', 'M9'])('falls back to timestamps for unmatched timing "%s"', timing => {
    renderTimeline([
      ...phases,
      { Date: meetingStart, Timing: timing, Type: 'NewMayor', Name: 'khalen' },
    ]);

    expect(screen.getByText('🗣️ Réunion 2')).toBeInTheDocument();
    expect(screen.queryByText('🌙 Nuit 2')).not.toBeInTheDocument();
    expect(screen.getAllByText('khalen devient Maire')).toHaveLength(1);
  });

  it('does not duplicate a known-phase event before the first phase as pre-game', () => {
    renderTimeline([
      ...phases,
      { Date: '2026-03-03T14:37:12.3770654Z', Timing: 'N2', Type: 'NewMayor', Name: 'khalen' },
    ]);

    expect(screen.getByText('🌙 Nuit 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pré-partie/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('khalen devient Maire')).toHaveLength(1);
  });

  it('preserves pre-game grouping when the recorded phase is unavailable', () => {
    renderTimeline([
      ...phases,
      { Date: '2026-03-03T14:37:12.3770654Z', Timing: '', Type: 'NewMayor', Name: 'khalen' },
    ]);

    expect(screen.getByRole('button', { name: /Pré-partie/ })).toBeInTheDocument();
    expect(screen.getAllByText('khalen devient Maire')).toHaveLength(1);
  });

  it('orders events by timestamp within their recorded phase', () => {
    renderTimeline([
      ...phases,
      { Date: '2026-03-03T14:38:44.0000000Z', Timing: 'M2', Type: 'NewMayor', Name: 'Dernier' },
      { Date: boundaryDate, Timing: 'M2', Type: 'NewMayor', Name: 'Premier' },
      { Date: meetingStart, Timing: 'M2', Type: 'NewMayor', Name: 'Deuxième' },
    ]);

    expect(screen.queryByText('🌙 Nuit 2')).not.toBeInTheDocument();
    expect(screen.getAllByText(/devient Maire/).map(element => element.textContent)).toEqual([
      'Premier devient Maire',
      'Deuxième devient Maire',
      'Dernier devient Maire',
    ]);
  });
});
