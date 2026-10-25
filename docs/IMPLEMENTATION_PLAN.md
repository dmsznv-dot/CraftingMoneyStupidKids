# Mining Game Implementation Plan
> **For agentic workers:** Use superpowers:executing-plans to implement this plan in this session.
**Goal:** Playable local MVP with automatic mining, 0–4 limited nudges, permanent upgrades and Yandex adapter.
**Architecture:** Deterministic fixed-step simulation independent of Phaser; DOM UI; persistent economy and idempotent results. Platform adapter owns SDK/lifecycle/ads.
**Tech Stack:** TypeScript, Vite, Phaser 3, Node test runner.
**Spec:** GAME_SPEC.md
## Global Constraints
- Automatic gravity and spin; wooden/stone/iron/gold/diamond have 0/1/2/3/4 shared nudges.
- No stakes, currency losses on failure, paid randomness or rewarded barriers.
- 12 fixed maps, direct purchases, one enchantment slot, one permanent starter TNT.
- RU/EN, guest saves, pause reasons, production /sdk.js and no ad mocks in release.
## Review Focus
- Reload after result must not duplicate currency: economy test.
- Keyboard repeat/rapid taps must not consume extra nudges: core and browser tests.
- Hidden tab/ad close must not resume another pause: lifecycle test.
- Corrupted saves must not crash startup: persistence test.
- Low FPS/TNT cascades must remain finite: core long simulation tests.
## Task 1 — Rules and simulation
Files: package.json, tsconfig.json, index.html, src/core.ts, src/progress.ts, tests/core.test.ts.
Interfaces: createRun(level,pick,enchant,starter), stepRun(run,dt), nudge(run,direction); buy(progress,id), settle(progress,run).
- [ ] Write and run failing behavioral tests for nudge budgets, cooldown, victory ordering, TNT, replay and idempotent economy.
- [ ] Implement the independent simulation and economy.
- [ ] Run npm test and simulate all fixed maps with wooden pick; tune physics from output.
## Task 2 — Playable presentation
Files: src/main.ts, src/scene.ts, src/style.css, src/i18n.ts, src/audio.ts.
Consumes core run; produces responsive preparation/play/results/shop UI.
- [ ] Implement original procedural pixel textures, rotating pick sprite, mine camera, particles, sound and responsive controls.
- [ ] Verify browser: first run, result, purchase stone, one nudge, pause, reload and mobile.
## Task 3 — Persistence and platform
Files: src/platform.ts, src/storage.ts, tests/platform.test.ts.
Interfaces: Platform.init/ready/gameplay/advert, SaveStore.load/save; independent pause reasons.
- [ ] Write/run failing tests for pause independence, malformed data and duplicate reward.
- [ ] Implement local snapshots and cloud queue, callbacks-based real SDK ads and explicit local unavailable ads.
- [ ] Verify tests, production build and unavailable-network paths.
## Task 4 — Delivery
Files: README.md, QA.md, production ZIP and source ZIP.
- [ ] Run typecheck, complete tests and browser smoke with screenshots.
- [ ] Fresh review, fix important findings, repeat relevant checks.
- [ ] Save source and playable build as persistent deliverables; keep local preview open.

