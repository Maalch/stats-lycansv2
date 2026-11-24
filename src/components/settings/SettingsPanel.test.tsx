import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../../context/SettingsContext';
import { SettingsPanel } from './SettingsPanel';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/?dateRangeEnabled=true&dateStart=2025-01-01');
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ GameStats: [] }) })));
});

afterEach(() => vi.unstubAllGlobals());

it('switches between the current session and the retained custom date range', async () => {
  render(<SettingsProvider><SettingsPanel /></SettingsProvider>);
  await waitFor(() => expect(fetch).toHaveBeenCalled());

  const start = screen.getByLabelText('Du :');
  expect(start).toHaveValue('2025-01-01');
  const session = screen.getByRole('checkbox', { name: /Session en cours/ });
  fireEvent.click(session);
  expect(screen.queryByLabelText('Du :')).not.toBeInTheDocument();
  expect(new URLSearchParams(window.location.search).get('currentSession')).toBe('true');

  fireEvent.click(session);
  expect(screen.getByLabelText('Du :')).toHaveValue('2025-01-01');
  expect(new URLSearchParams(window.location.search).has('currentSession')).toBe(false);
});
