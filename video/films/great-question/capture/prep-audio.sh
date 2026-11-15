#!/usr/bin/env bash
# Voice assets for the film: the take's moderator MP3s (what the page played, from /turn/) and the
# simulated participant answers that went into the fake mic, each loudness-normalized to -18 LUFS
# (two-pass loudnorm, linear gain, true peak -1.5 dBTP), 48 kHz mono WAV in assets/audio/.
# Run from films/great-question/.
set -euo pipefail
norm() { # src dst
  local j; j=$(ffmpeg -v info -i "$1" -af loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  local mi mtp mlra mth off
  mi=$(echo "$j" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["input_i"])')
  mtp=$(echo "$j" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["input_tp"])')
  mlra=$(echo "$j" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["input_lra"])')
  mth=$(echo "$j" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["input_thresh"])')
  off=$(echo "$j" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["target_offset"])')
  ffmpeg -v error -y -i "$1" -af "loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true" -ar 48000 -ac 1 -c:a pcm_s16le "$2"
  echo "$2 (from $mi LUFS)"
}
norm raw/take/mod1.mp3 assets/audio/mod1.wav
norm raw/take/mod2.mp3 assets/audio/mod2.wav
norm raw/take/mod3.mp3 assets/audio/mod3.wav
norm raw/answers/a1_take1.tight.wav assets/audio/a1.wav
norm raw/answers/a2_who.tight.wav assets/audio/a2.wav
