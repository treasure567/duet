import { test } from '@playwright/test';

test('capture judge-facing Duet states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
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
  await page.goto('/');
  await page.screenshot({ path: 'docs/submission/assets/duet-studio.png', fullPage: true });

  await page.evaluate(async () => {
    const tools = (
      window as unknown as {
        __duetTools: Map<string, { execute: (input: unknown) => Promise<unknown> }>;
      }
    ).__duetTools;
    await tools.get('duet.load_piece')!.execute({ pieceId: 'minuet-in-g' });
    await tools.get('duet.transform_piece')!.execute({ hands: ['right'], tempoScale: 0.7 });
    await tools.get('duet.set_loop')!.execute({ enabled: true, fromBar: 1, toBar: 4 });
    await tools.get('duet.set_count_in')!.execute({ bars: 1 });
    await tools.get('duet.set_metronome')!.execute({ enabled: true });
    await tools.get('duet.highlight_keys')!.execute({
      keys: ['G4', 'A4', 'B4', 'C5', 'D5'],
      label: 'Opening phrase · right hand',
    });
    await tools.get('duet.start_practice')!.execute({});
  });
  await page.getByTestId('label-qwerty').click();
  await page.screenshot({ path: 'docs/submission/assets/duet-agent-lesson.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: 'docs/submission/assets/duet-thumbnail.png' });
});
