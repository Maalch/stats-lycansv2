import { getActionLabel } from './GameTimeline';

describe('getActionLabel', () => {
  it.each([
    ['TournamentWon', 'Remporte le tournoi'],
    ['TournamentLost', 'Perd le tournoi'],
  ])('translates %s', (actionType, expectedLabel) => {
    expect(getActionLabel(actionType, null, null)).toBe(expectedLabel);
  });
});
