# Implementation ledger
Plan: ../docs/superpowers/plans/2026-10-25-mining-game.md
Scope: approved GAME_SPEC. Native execution explicitly authorized by «да, приступай».
Ruling: new isolated project directory, no existing Git repository; no worktree or commits are possible without introducing a repository. Deliver source archive instead.
Preflight: simulation owns Run; renderer only reads it; progress settles outcome once; SDK adapter owns callbacks and pause reasons.
Task 1: complete — core and economy tests green, wooden routes found on all 12 maps.
Task 2: complete — desktop/mobile browser playthrough, two wins and stone purchase/one nudge verified.
Task 3: complete locally — actual SDK callbacks integrated, simulated branches tested; actual platform still UNVERIFIED without draft.
Final review: two Important findings fixed RED→GREEN, full suite 15/15. No minors.
Ruling: separate standalone preview excludes SDK instead of simulating it; production ZIP retains actual platform integration. No advertising revenue or platform approval is claimed.
