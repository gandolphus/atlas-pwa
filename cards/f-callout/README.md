F · Anchored callout: a fixed-size popover with a tail sits beside the clicked tile, covering neighbours; the grid never moves.
The clicked tile stays visible and lit as the anchor (lavender, green on done); callout flips right/left/below/above to stay in the viewport.
Optimises: zero layout change, keyboard-first (Enter advances; Shift+arrows, or plain arrows when not typing, move the anchor to adjacent tiles and open it).
Flow: guess -> meet -> recall-until-right -> done (Enter = next word); learned card = ask first, reveal, 1/Enter rate, Down = deepen.
Trade-offs: covers ~9-12 tiles while open; moving anchor mid-learn discards that word's progress; fixed height leaves air on short stages.
