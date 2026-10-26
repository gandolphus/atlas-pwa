# D - the tile is the card
Idea: no panel. The clicked tile grows in place (neighbours glide, rank order kept, clamped at the right edge) through guess -> meet -> recall -> done, then Enter jumps to the next unlearned tile.
Optimises: zero context switch and zero covering of the atlas; the card is a spatial object and closes into the green tile. All-keyboard: Enter / Esc / arrows, Tab pops out to a larger card (8 cols).
Learned tile: same shell, ask-first (type or empty Enter), reveal, 1/Enter rate, Down unfolds forms/grammar by growing the tile taller.
Trade-offs: the card reflows the grid (neighbours move, so eyes re-find places); small on ultra-wide unless popped out; bottom rows scroll into view; text capacity is bounded by the tile span.
Run: open index.html (single file, no network, 60 real words, in-memory state).
