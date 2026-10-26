# C - small batch, interleaved, with neighbours
Idea: an unlearned tile starts a batch of 3 (clicked word + two sentence/family mates) on the docked panel: guess A, B, C (committed, no English), meet all three at once, recall in shuffled order, misses requeue at the end ("just this word" opts out to 1).
Optimises: pretesting + interleaving + within-session spacing, fewer context switches (one meet screen for 3 words, shared sentences), no scoreboard or timer, tiles turn green together with a quiet wave.
Learned card: ask-first when due (rate 1-4, auto-advances to next due), calm view when not due (meaning, next review, "test me anyway"), deepen row (S/F/T) in both.
Trade-offs: 3 guesses before any feedback delays the first answer; mates may feel arbitrary; Esc mid-batch discards it; a miss on the last word repeats immediately (little spacing).
Run: open index.html; arrows move over tiles, Enter opens, Alt+1/Alt+3 switch batch size before the first guess.
