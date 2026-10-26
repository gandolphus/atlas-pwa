# H · Lens (camera zoom)
Idea: the atlas is a fixed canvas; opening a tile moves a camera (scale+translate on the whole grid) onto it until the tile IS the card. Nothing reflows; neighbours stay blurred exactly where they are.
Optimises: spatial memory (you travel through the language: Enter on done glides the camera to the next new tile), zero layout change, fully keyboard-driven, Enter-first flow guess > meet > recall > done; learned card = ask, reveal, deepen.
Motion: 320 ms camera ease, 140 ms card fade, all off under prefers-reduced-motion.
Trade-offs: tile is 7x scaled so the neighbours seen are only the 8 around it (dimmed); card size is fixed 3:2 so it can feel roomy for short cards; blur on ~60 scaled tiles may cost GPU on weak machines.
Not done: persistence, real frequency data (mock 63 words, in-memory state).
