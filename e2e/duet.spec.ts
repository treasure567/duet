import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool: { name: string }, options: { signal?: AbortSignal }) {
          tools.set(tool.name, tool);
          Object.assign(window, { __duetTools: tools });
          options.signal?.addEventListener('abort', () => tools.delete(tool.name));
        },
      },
    });
  });
});

test('a player can switch learning modes and operate the realistic keyboard', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('webmcp-status')).toContainText('21 tools');
  await page.getByTestId('mode-practice').click();
  await expect(page.getByTestId('mode-practice')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('label-qwerty').click();
  await expect(page.getByTestId('label-qwerty')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Piano keyboard' })).toBeVisible();
  await page.keyboard.press('a');
  await expect(page.getByText('Switched to practice mode.')).toBeVisible();
});

test('WebMCP builds a visible four-bar practice lesson', async ({ page }) => {
  await page.goto('/');

  const response = await page.evaluate(async () => {
    const tools = (
      window as unknown as {
        __duetTools: Map<
          string,
          { execute: (input: unknown) => Promise<{ content: Array<{ text?: string }> }> }
        >;
      }
    ).__duetTools;
    const call = async (name: string, input: unknown = {}) => {
      const result = await tools.get(name)!.execute(input);
      return JSON.parse(result.content[0].text!);
    };

    return {
      loaded: await call('duet.load_piece', { pieceId: 'minuet-in-g' }),
      transformed: await call('duet.transform_piece', { hands: ['right'], tempoScale: 0.7 }),
      looped: await call('duet.set_loop', { enabled: true, fromBar: 1, toBar: 4 }),
      counted: await call('duet.set_count_in', { bars: 1 }),
      clicked: await call('duet.set_metronome', { enabled: true }),
      highlighted: await call('duet.highlight_keys', {
        keys: ['G4', 'A4', 'B4', 'C5', 'D5'],
        label: 'Opening phrase · right hand',
      }),
      practised: await call('duet.start_practice'),
      score: await call('duet.read_score'),
      names: [...tools.keys()],
    };
  });

  expect(response.names).toHaveLength(21);
  expect(response.loaded.ok).toBe(true);
  expect(response.transformed.ok).toBe(true);
  expect(response.looped.ok).toBe(true);
  expect(response.counted.ok).toBe(true);
  expect(response.clicked.ok).toBe(true);
  expect(response.highlighted.ok).toBe(true);
  expect(response.practised.ok).toBe(true);
  expect(response.score.ok).toBe(true);
  expect(response.score.data.omitted).not.toBe(true);
  expect(response.score.data.notes.length).toBeLessThanOrEqual(12);
  await expect(page.getByText('Opening phrase · right hand').first()).toBeVisible();
  await expect(page.getByText('Minuet in G', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('70%', { exact: true })).toBeVisible();
  await expect(page.getByTestId('loop-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('countin-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('metronome-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/step 1/)).toBeVisible();
});
