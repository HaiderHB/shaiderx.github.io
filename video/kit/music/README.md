# Music beds

Instrumental beds for launch films (no vocals). Generated 2026-11-15 with ElevenLabs Music v2.5 through
fal (`elevenlabs/music/v2.5`, `force_instrumental: true`, 60 s, mp3 48 kHz 192 kbps) on Haider's fal
account. Each ends on its own outro around 57 s; trim with a fade, never mid-phrase without one.

| File | Feel | Level (integrated) | Notes |
| --- | --- | --- | --- |
| `bright-pluck-112.mp3` | Light, upbeat minimal electronic pop: plucked synth arpeggio, pads, muted guitar, soft kick, 112 BPM | -15.0 LUFS, LRA 3.9 | **Default.** Steady from 0 s; outro from ~52 s |
| `marimba-tech-120.mp3` | Bright corporate-tech: marimba and bells over staccato synths, 120 BPM | -12.1 LUFS, LRA 0.9 | Very even; busier, use at a lower level |
| `lofi-keys-92.mp3` | Calm lo-fi: Rhodes chords, brushed drums, 92 BPM | -14.8 LUFS, LRA 9.2 | Quiet first ~10 s, so it suits films that open slowly |

Prompts are in `prompts.json`. Mix beds under on-screen text at about -20 LUFS integrated for the film
(see `components/music-bed.html`), fade in 0.3 s and out 1.5 s, and never let a film end on a cut.
