# Duet Judge Guide

## The one sentence to remember

Duet lets an agent turn “teach me this passage” into a real playable lesson inside the browser piano.

## What is technically distinctive

1. WebMCP exposes musical intent rather than DOM mechanics.
2. Human and agent commands share one typed score, transport, practice, and activity state.
3. Playback uses the browser audio clock with lookahead scheduling.
4. The agent can read exact transport and bounded score pages before and after acting.
5. Device boundaries remain honest: audio requires a human gesture, and microphone use requires permission.
6. The lesson remains directly playable after the agent finishes.

## Best screenshot order

1. `duet-agent-lesson.png`
2. `duet-studio.png`
3. A close crop of the highlighted keyboard
4. A close crop of agent-attributed activity

The hero screenshot should be first because it shows the 21-tool connection, transformed piece, 70% tempo, loop, count-in, metronome, highlights, and Practice state in one frame.

## Thumbnail crop

Use `duet-devpost-thumbnail.png`, the final 1536 × 1024 (3:2) marketing thumbnail. It preserves the real lesson controls while making the human act of playing the emotional focus.

Thumbnail copy: **Turn the music you love into a piano lesson made for you.**

## Fast manual verification

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Expected results:

- 72 Vitest checks across music, pitch, state, and WebMCP contracts
- 4 Playwright journeys across desktop and laptop
- Successful typecheck, lint, and production build

## Claims to avoid

- Do not claim timing- or dynamics-aware practice scoring.
- Do not claim polyphonic microphone transcription.
- Do not claim MIDI, MusicXML, PDF, or image import exists today.
- Do not describe the Web Audio synth as a sampled concert piano.
- Do not claim a real-microphone device matrix until it has been run.

## Remaining publishing work

- Add a public repository URL.
- Deploy and add a public demo URL, or retain exact local run instructions.
- Record the 90-second demo and add its URL.
- Verify microphone capture on the recording computer.
- Confirm the live Devpost questions and judging criteria through the Devpost connection.
- Run a secret scan before making the repository public.
