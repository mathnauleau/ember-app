BUILD BRIEF: Ember (iPad web app)

GOAL
Personal nightly guitar practice app for a beginner. iPad Safari, installed
as a PWA, landscape first. The Claude Design project is the visual source of
truth (tokens, screens, states). Implement it, don't redesign it.

STACK
- Vite + React + TypeScript. No backend.
- Static hosting over HTTPS (Netlify, Cloudflare Pages or GitHub Pages).
  Mic access requires HTTPS; file:// won't work.
- Design tokens as CSS variables, from the Claude Design export.
- PWA: manifest, icons, service worker (offline after first load),
  standalone display.
- Web Audio API only. Optional pitch lib: pitchy (MPM).
- Content (chords, patterns, songs, theory cards, warm-ups) in JSON files,
  not hard-coded in components.

ARCHITECTURE
- /audio: mic input, pitch, chroma, onset, metronome, synth
- /engine: session state machine, curriculum rules, streak
- /data: chords.json, patterns.json, songs.json, theory.json, warmups.json
- /store: persisted progress
- /screens: Home, SessionShell, Tuner, Warmup, ChordDrill, Strum, Song,
  Theory, Summary, Debug
- Screens use hooks (useTuner, useChordCheck, useStrumTiming, useMetronome).
  They never touch Web Audio directly.

AUDIO: MIC INPUT
- getUserMedia({audio: {echoCancellation: false, noiseSuppression: false,
  autoGainControl: false}}). Safari may ignore some; verify on device.
- Create/resume one shared AudioContext on the first tap (iOS requirement),
  used for mic, metronome and synth.
- iOS home-screen apps may re-prompt for mic each launch. Design for it:
  friendly one-tap permission screen.
- UI states: no-permission, silent, listening, noisy.
- Measure the noise floor for 1s at mic start. Silent = RMS near the floor.
  Noisy = floor above a configurable threshold.

AUDIO: TUNER
- YIN or MPM on 4096-sample windows (low E at 82.41 Hz needs it),
  about 30 readings/s. Median-smooth the last 5. Drop low-clarity readings.
- Targets: E2 82.41, A2 110.00, D3 146.83, G3 196.00, B3 246.94,
  E4 329.63 Hz. Auto-detect nearest string; tap to lock.
- cents = 1200 * log2(f / target). In tune = within +/-5 cents for 400 ms.
  The ember glow tightens continuously with distance.
- Main bug to guard against: octave errors. Restrict to the string's range.

AUDIO: CHORD CHECK (target-driven, not open detection)
- The drill always knows the target chord, so verify against it. This is far
  more reliable than identifying chords from scratch.
- FFT 16384 -> 12-bin chromagram over 80-2000 Hz (log magnitude, normalized).
- One template per chord, built from its real open voicing
  (string/fret -> pitch classes, bass note weighted higher).
- score = cosine(chroma, template). Also score the other learned chords:
  pass only if the target wins by a margin.
- Thresholds in one config file. States: try again, close enough.
- "Hold 2s" accumulates while close enough and decays slowly when not
  (never a hard reset).
- Change drill: a change counts when the target switches A -> B and chroma
  stays stable for 300 ms. Count clean changes per time window.
- By design this is "close enough" feedback, not strict pass/fail.

AUDIO: STRUM TIMING (onset)
- AudioWorklet computing spectral flux (or a high-passed energy envelope).
  Post onset times on the audio clock.
- Compare against the metronome grid on the same AudioContext clock.
  Subtract outputLatency/baseLatency plus a user calibration offset
  (one-time "strum along for 8 beats" in Settings).
- Ignore onsets within +/-20 ms of a scheduled click (click leaking into the
  mic). Keep click volume low; suggest headphones.
- Per bar: median offset of matched onsets. Within +/-70 ms = on time,
  otherwise a bit early/late. Fewer than 4 matched onsets = no feedback.
- Song "clean changes X of Y" = chord check at each bar boundary.

AUDIO: METRONOME + SYNTH
- Look-ahead scheduler (setTimeout every 25 ms, schedule 100 ms ahead on
  audioContext.currentTime). Never setInterval for timing.
- Beat highlight UI via requestAnimationFrame reading audioContext.currentTime.
- Strum "Listen" phase: synthesize strums (Karplus-Strong per string,
  10-20 ms stagger; down = low to high, up = high to low).
- Optional: tap a tuner string to hear its reference tone.
- Test early: iOS may change output volume/routing while the mic is active.

SESSION ENGINE
- State machine: idle -> step(n) -> paused -> complete.
- 15 min: tune 1, warm-up 2, chords 5, strum 4, song 3, theory 0.5.
  10 min: tune 1, chords 4, strum 3, song 2, theory shown on Summary.
- A step ends on completion or timer. Skip/Next always available.
  Skipped steps earn no log.
- Persist state at each step so a reload resumes the session.
- Screen Wake Lock during a session (where supported).
- Leaving a session stops all audio and releases the mic.

CURRICULUM (JSON, editable)
- Chord order: Em, Am, D, A, E, G, C, then Dm.
- New chord only after the current set has passed in 3 sessions.
  Pass = "Hold 2s" completed at least once in that session.
- Strum patterns rated 1-5. Advance after 3 sessions with at least half the
  bars "on time".
- Songs: chord-only progressions, no lyrics, prefer traditional songs.
  Unlock when all their chords are learned. Locked list shows "Needs: ...".
- Warm-ups rotate daily. Theory cards: one per day, in order, no repeats
  until the set is done.

PROGRESS + STREAK
- Store: learnedChords, passCounts, patternLevel, songs, streak,
  lastSessionDate, history[], settings (default duration, sound, BPM per
  pattern, latency offset).
- Streak +1 per day with a completed session (chord drill done).
- Missed days: fire level decays (1 day = dim, 3+ = embers), never zero.
  Streak resets after 2+ missed days (1 grace day).
- localStorage is enough. Safari clears site data after 7 days without use in
  the browser; installed home-screen apps are exempt. So: install as a PWA
  and add Export/Import progress (JSON) in Settings.

DEBUG SCREEN (build in M1)
- Live: input level, noise floor, pitch + cents, chroma bars, chord scores,
  onset markers, threshold sliders. This is how thresholds get tuned on a
  real guitar.

TESTING
- Unit tests for DSP with synthetic signals (sines at string frequencies,
  summed chord tones, click trains).
- 10-20 s WAV fixtures of the real guitar and room noise for regression.
- Final check is always the real iPad on the deployed URL.

MILESTONES (one at a time, each deployed and tested on the iPad)
M0 Spike: HTTPS page, tap to start, mic permission, live pitch readout.
   Pass = steady reading on open low E.
M1 Tuner + Debug screen + tokens + Session shell.
M2 Metronome + Strum screen + onset feedback + latency calibration.
M3 Chord drill (hold + change drill).
M4 Session engine, Home, Summary, storage, streak.
M5 Warm-up, Song section, Theory card, curriculum rules.
M6 PWA polish: offline, wake lock, export/import, icons.

OUT OF SCOPE (v1)
Accounts, sync, backend, lyrics, video, scores/leaderboards, recognizing
chords outside the learned set.

FIRST TASK
Do M0 only. Report what you measured on the iPad, then stop.


------------------------------------------------------------------------
APPENDIX A: DESIGN REFERENCES

Tokens: handoff/tokens.css (CSS variables + button, toggle, log classes).
Copy into src/styles/ and import once. Do not hard-code values from screens.

Screen map (each frame id is visible as a badge in the design file):
- Home ............ Campfire Home.dc.html
                    1a first launch, 1b active streak, 1c missed days,
                    1d portrait; token sheet at the bottom
- SessionShell .... Campfire Session.dc.html (top bar, bottom bar,
                    "Pause the fire?" = 1j)
- ChordDrill ...... Campfire Session.dc.html
                    1b mic permission, 1c listening, 1d close enough,
                    1e try again, 1f silent, 1g noisy, 1h change drill,
                    1i step complete, 1a live loop, 1k portrait
- Tuner ........... Campfire Tuner & Strum.dc.html 1a-1h
- Strum ........... Campfire Tuner & Strum.dc.html 1i-1o
- Warmup .......... Campfire Warm-up Song Theory Summary.dc.html 1a-1b
- Song ............ same file 1c play, 1d run feedback, 1e locked list,
                    1j portrait
- Theory .......... same file 1f
- Summary ......... same file 1g 15 min, 1h 10 min, 1i after missed days
- Debug ........... not designed. Build it plain; tokens only.

Visual rules carried by every screen:
- Ember is stroke + glow. No solid ember fills on controls, no red/green.
- Min tap target 56px; toggles 64px; primary 84px.
- Nothing below 15px; reading text 18px+.
- Fire art in the designs is a CSS sketch. Treat it as a placeholder until
  real illustration assets exist (3 levels: full, dim, embers).

APPENDIX B: WHERE DESIGN AND BRIEF DIFFER (brief wins unless noted)

1. Chord order. Designs show G, C, D as learned chords; the curriculum
   starts Em, Am. Drive all chord content from chords.json.
2. Song feedback. Designs say "Clean changes: 5 of 7" (7 changes in 8
   bars). Brief counts a check at each bar boundary. Pick one: "X of 8 bars"
   or "X of 7 changes".
3. Missed days. Design 1i (Summary) shows "1 night tonight, 12 kept
   before", i.e. streak reset. Brief allows 1 grace day, so after a single
   missed day the streak continues; show the reset copy only after 2+.
   Fire levels: 1 day = dim, 3+ = embers (Home 1c shows embers).
4. Mic permission. Design shows it inline in the Chord drill. Since iOS may
   re-prompt each launch, show it on the first mic step of the session
   (usually Tuner) using the same layout.
5. Not designed yet: Settings (latency calibration, export/import,
   defaults), Debug, "Practice without listening" behaviour, step timer
   running out, resume-after-reload prompt.
6. 10 min mode: steps are Tune, Chord drill, Strum, Song. Home already
   hides Warm-up and Theory card in 10 min mode.
