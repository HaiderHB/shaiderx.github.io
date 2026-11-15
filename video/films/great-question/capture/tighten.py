# Cap pauses longer than 0.45 s at 0.4 s and trim edge silence (0.08 s lead, 0.1 s tail), so the page's
# 1.2 s end-of-answer detector never fires mid-answer and the simulated answers stay short.
# Writes raw/answers/<id>.tight.wav (48 kHz mono s16).
import sys, os, glob, numpy as np
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'raw', 'answers')
from scipy.io import wavfile
MAXP, KEEP, FR = 0.45, 0.40, 0.01
for f in sorted(glob.glob(os.path.join(DIR, '*.wav'))):
    if f.endswith('.tight.wav'): continue
    sr, x = wavfile.read(f); x = x.astype(np.float32)
    n = int(sr*FR); nfr = len(x)//n
    rms = np.sqrt((x[:nfr*n].reshape(nfr, n)**2).mean(1)) / 32768
    loud = 20*np.log10(rms+1e-9) > -42
    idx = np.where(loud)[0]; first, last = idx[0], idx[-1]
    out = [np.zeros(int(sr*0.08), np.float32)]
    i = first
    while i <= last:
        if loud[i]:
            out.append(x[i*n:(i+1)*n]); i += 1; continue
        j = i
        while j <= last and not loud[j]: j += 1
        seg = x[i*n:j*n]
        if (j-i)*FR > MAXP:
            k = int(KEEP/2*sr)
            seg = np.concatenate([seg[:k], seg[-k:]])
        out.append(seg); i = j
    out.append(x[(last+1)*n:(last+1)*n + int(sr*0.1)])
    y = np.concatenate(out)
    wavfile.write(f.replace('.wav', '.tight.wav'), sr, np.clip(y, -32768, 32767).astype(np.int16))
    print(f, round(len(x)/sr, 2), '->', round(len(y)/sr, 2))
