# Title

Duet — The Piano Your Agent Can Play and Teach From

## One-line Summary

Ask your agent to turn any structured piece into a visible, playable lesson by controlling the score, piano, transport, practice loop, and captured phrases through WebMCP.

## Problem

Music learners already ask agents questions such as “teach me this passage,” “slow it down,” or “help me practise the right hand.” The response is usually instructions in chat. The learner must then find the piece, adjust a metronome, isolate notes, create a loop, and remember every recommendation in a separate music application.

Agents understand the request but cannot operate the musical environment where the learner needs the answer. DOM clicking is especially weak here because correct behavior depends on browser audio state, musical timing, stable score data, transport position, and microphone permission.

## Solution

Duet is a browser piano whose musical concepts are exposed directly through 21 WebMCP tools. A connected agent can load a piece, read its score safely, transform tempo and key, isolate a hand, configure a loop and count-in, control the transport, highlight keys, start practice, and read a sung phrase.

The result is not another answer in chat. It is a live lesson inside the instrument. The keyboard, note strip, transport, expected notes, and activity history visibly change, and the learner immediately continues with mouse, touch, computer keyboard, or voice.

## Why This Matters

Learning music is iterative and embodied. A useful agent must do more than explain what the learner should try; it must shape the environment, listen to the result, and adapt without taking control away from the person.

Duet shows how WebMCP can bridge high-level intent and precise real-time applications:

- Musical commands replace brittle UI coordinates.
- The agent and person act on one shared score and transport.
- Audio and microphone constraints are reported honestly.
- Read operations do not trigger devices.
- Agent actions are visible, attributable, and immediately playable.
- Score data is paginated instead of silently truncated.

The pattern applies to other real-time creative tools where timing, state, and direct manipulation matter.

## How We Used AI

The connected agent is the lesson planner and musical collaborator. It reads Duet’s capabilities and current state, reasons about the learner’s request, sequences narrow tools, and verifies the transport afterward. It can also provide its own structured arrangement or read a captured sung phrase and answer it with new notes.

Duet supplies deterministic musical execution: validated notes, transformations, transport timing, practice state, pitch extraction, and UI feedback. The agent supplies intent, sequencing, explanation, and adaptation. WebMCP is the contract joining the two.

## How We Used Codex

Codex helped us research the WebMCP interaction model, iterate toward a realistic piano interface, build the Web Audio voice and transport, design the 21-tool contract, create a public-domain library, and test complete agent journeys.

We used Codex to pressure-test the product rather than only generate code. It identified that the first 88-key layout was too compressed, helped replace it with an adaptive realistic range, removed distracting falling-note visuals, implemented true pause/resume and lookahead scheduling, and expanded the interface around a focused practice loop. During submission preparation, Codex found and fixed a genuine score-pagination bug where a valid page could exceed the response budget and be replaced by an omitted envelope. It then added browser tests proving the repaired agent journey is visible on desktop and laptop layouts.

## Key Features

- Realistic browser piano with mouse, touch, and A–Z/0–9 input
- Fourteen public-domain pieces and exercises
- Agent-supplied structured arrangements
- Demo, Play Along, and Practice modes
- Tempo, transpose, simplify, bar-range, and hand transforms
- Play, pause, resume, stop, seek, loop, count-in, metronome, and hand mix
- Audio-clock scheduling and robust all-voice stop
- Visible note/QWERTY strip and key highlighting
- Expected-note practice with hit and miss tracking
- Microphone permission flow and monophonic phrase capture
- Agent-readable captured phrases and agent-playable musical answers
- Bounded paginated score reads
- Capabilities, strict schemas, state versions, stable errors, and next actions
- Shared activity history with human, agent, and system attribution

## Architecture

Duet is a React 19 and TypeScript single-page application. Zustand provides one command/state layer for the UI and WebMCP tools. Web Audio supplies the piano engine and timing clock. A lookahead transport schedules playback, looping, count-ins, metronome, seeking, and hand mix. Zod validates every tool input. Twenty-one tools register through `document.modelContext.registerTool` with strict schemas, read/write annotations, and lifecycle cleanup. A microphone and pitch-detection pipeline creates structured monophonic phrases. Vitest verifies the music, pitch, state, and tool contracts; Playwright verifies human and agent journeys at desktop and laptop widths.

## Testing Instructions

Requirements: Node.js 20 or newer and a modern Chromium browser.

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run dev
```

Manual judge path:

1. Open the local URL and press a piano key to unlock browser audio.
2. Play a few keys with the pointer or A–Z/0–9 keyboard mapping.
3. Switch between Demo, Play Along, and Practice.
4. In the connected agent, use the prompt below.
5. Confirm Minuet in G loads, the right hand remains, tempo reads 70%, loop reads 1–4, count-in reads 1, metronome is active, highlighted keys appear, and Practice shows step 1.
6. Press an expected key and confirm the practice state advances.
7. Inspect the Activity panel and confirm agent actions are distinct.

Demo prompt:

> Load Minuet in G. Keep only the right hand, slow it to 70 percent, loop bars 1–4, add a one-bar count-in and metronome, highlight G4 A4 B4 C5 D5 as “Opening phrase · right hand,” and start practice. Read the transport and the first score page, then tell me exactly what changed.

Verified locally on September 3, 2026:

- TypeScript: passing
- ESLint: passing
- Vitest: 72/72 passing
- Playwright: 4/4 passing across desktop and laptop
- Production build: passing

## Public Demo Link

`TODO: add the deployed public URL`

Local fallback: run `npm install && npm run dev` from the project directory.

## Public Repository Link

https://github.com/treasure567/duet

## Demo Video

`TODO: add the final public video URL`

Planned 90-second flow:

1. Play the realistic piano and show that sound requires a human gesture.
2. Give the agent the full Minuet practice request.
3. Show all visible transport and score changes happen through WebMCP.
4. Play an expected key and show practice advance.
5. Switch to note labels and show the same lesson remains playable.
6. Optionally sing a phrase, let the agent read it, and have Duet answer.
7. End on the 21-tool status and shared activity history.

The complete narration and fallback plan are in `docs/submission/DEMO_SCRIPT.md`.

## Screenshot Shot List

1. `docs/submission/assets/duet-agent-lesson.png` — hero: agent-created four-bar lesson, highlighted keys, 70% tempo, loop, click, count-in, practice, and 21-tool status.
2. `docs/submission/assets/duet-studio.png` — clean default instrument and public-domain library.
3. `docs/submission/assets/duet-devpost-thumbnail.png` — final 1536 × 1024 (3:2) project thumbnail.
4. Optional close crop — realistic piano keys with QWERTY labels and expected-note highlights.
5. Optional activity crop — agent-attributed load, transform, loop, highlight, and practice actions.

## Submission Readiness Notes

Complete:

- Product title, positioning, problem, solution, feature story, architecture, test instructions, known limitations, demo script, and screenshot assets
- Fixed bounded score pagination and full green automated verification
- Repeatable browser screenshot capture
- Public-domain content statement and project license

Still required before the final Devpost action:

- Connect or authenticate the Devpost tool and confirm registration
- Reconcile this draft with the live official form and judging criteria
- Add the public demo URL or confirm local-only judging instructions
- Record and add the demo video URL
- Test microphone capture on the exact demonstration computer and browser
- Confirm team member names and any required profile fields

## Known Limitations

- MIDI, MusicXML, score-image, and PDF imports are not part of this build.
- Practice currently scores expected pitch, not timing, dynamics, articulation, or polyphonic input.
- Microphone pitch detection is monophonic and environment-dependent.
- The pitch pipeline is unit-tested with synthesized data but still needs a documented real-device matrix.
- The piano uses Web Audio synthesis rather than large sampled-instrument assets.
- Projects and practice history are not persisted across sessions.

## TODO Official Form Fields

The live Devpost submission tools were not available in the current session, so no official form-specific question has been invented here.

- `TODO: confirm exact official category and form questions from Devpost`
- `TODO: add team member names`
- `TODO: add any required Codex session ID only if the live form requests one`
- `TODO: add demo and video URLs`
