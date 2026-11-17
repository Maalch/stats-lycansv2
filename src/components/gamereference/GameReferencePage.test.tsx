import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import referenceJson from '../../../data/gameReference.json?raw';
import type { GameReferenceData } from '../../hooks/useGameReference';
import { GameReferencePage } from './GameReferencePage';

const referenceData: GameReferenceData = JSON.parse(referenceJson);

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(referenceJson)));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(['hierarchical', 'flat'] as const)('GameReferencePage (%s)', viewMode => {
  async function renderPage() {
    const user = userEvent.setup();
    render(<GameReferencePage />);
    await screen.findByText(`Mod v${referenceData._meta.version}`);
    if (viewMode === 'flat') {
      await user.click(screen.getByTitle('Vue liste'));
    }
    return user;
  }

  it('displays and expands every game rule, including the new systems', async () => {
    const user = await renderPage();
    if (viewMode === 'flat') {
      await user.click(screen.getByRole('button', { name: /Règles du Jeu/ }));
    }

    for (const rule of referenceData.gameRules.filter(rule => viewMode === 'flat' || !rule.campSpecific)) {
      const card = screen.getByRole('heading', { name: rule.name, level: 3 }).closest<HTMLElement>('[role="button"]')!;
      expect(within(card).getByText(rule.description)).toBeVisible();
      await user.click(card);
      expect(card).toHaveAttribute('aria-expanded', 'true');
      for (const detail of rule.details) {
        expect(within(card).getByText(detail)).toBeVisible();
      }
    }

    if (viewMode === 'hierarchical') {
      await user.click(screen.getByRole('button', { name: 'Explorer le camp Loups' }));
      for (const rule of referenceData.gameRules.filter(rule => rule.campSpecific === 'loup')) {
        expect(screen.getByRole('heading', { name: rule.name })).toBeVisible();
        expect(screen.getByText(rule.description)).toBeVisible();
        for (const detail of rule.details) {
          expect(screen.getByText(detail)).toBeVisible();
        }
      }
    }
  });

  it('displays gas mechanics and finds the gadget by its gas descriptions', async () => {
    const user = await renderPage();
    await user.click(screen.getByRole('button', { name: /Gadgets & Objets/ }));

    const gasTypes = referenceData.gadgets.find(gadget => gadget.id === 'gaz')!.gasTypes!;
    for (const gas of gasTypes) {
      expect(screen.getByText(gas.description!)).toBeVisible();
    }

    await user.type(screen.getByRole('textbox'), "N'applique pas Poison");
    expect(screen.getByRole('heading', { name: 'Fiole de gaz' })).toBeVisible();
    expect(screen.getByText(gasTypes.find(gas => gas.id === 'puanteur')!.description!)).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Piège' })).not.toBeInTheDocument();
  });

  it('displays the added potion and status effects with current durations and tutorials', async () => {
    const user = await renderPage();
    await user.click(screen.getByRole('button', { name: /Effets & Potions/ }));

    for (const effect of referenceData.statusEffects.filter(effect =>
      ['endurance', 'sanctuaire', 'sursis', 'renforce'].includes(effect.id)
    )) {
      expect(screen.getByText(effect.name, { selector: '.ref-effect-card__name' })).toBeVisible();
      expect(screen.getByText(effect.tutorial!)).toBeVisible();
    }

    const potionHeading = screen.getByRole('heading', { name: /Effets de Potions/ });
    const potionSection = within(potionHeading.parentElement!);
    for (const id of ['energie', 'confusion']) {
      const effect = referenceData.potionEffects.find(effect => effect.id === id)!;
      const card = potionSection.getByText(effect.name, { selector: '.ref-effect-card__name' }).closest<HTMLElement>('.ref-effect-card')!;
      expect(within(card).getByText(effect.tutorial!)).toBeVisible();
      expect(within(card).getByText(`⏱ ${effect.durationSeconds}s`)).toBeVisible();
    }
  });
});
