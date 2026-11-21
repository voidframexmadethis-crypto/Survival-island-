
# SURVIVAL ISLAND: THE LOST WORLD
# VEHICLE AUDIO & MUSIC PRO SYSTEM

## 1. MAIN OBJECTIVE

Build a highly realistic vehicle audio system with unique sound profiles for every vehicle.

The system must include:
- Realistic engine and exhaust sounds.
- Vehicle-specific factory radio systems.
- Deep bass systems for classic vehicles.
- Custom high-output audio for the Chevy Tahoe.
- Extreme 182 dB in-game audio showcase for the Blue DONK.
- Music Pro, allowing players to upload and play their own music.
- Realistic interior and exterior audio positioning.
- Performance protection to prevent CPU spikes, memory leaks, lag, and freezes.

Preserve all existing vehicles, interiors, vehicle physics, graphics, gameplay, and mobile controls.

Do not replace existing vehicle systems unnecessarily.

---

## 2. SHARED VEHICLE AUDIO ENGINE

Create a centralized vehicle audio engine.

Requirements:

- Use one coordinated audio management system.
- Support realistic engine startup, idle, acceleration, deceleration, and shutdown.
- Support different engine types and exhaust configurations.
- Match engine pitch and volume to engine RPM and throttle.
- Simulate realistic exhaust positioning.
- Support Doppler effects when vehicles pass the player.
- Support interior and exterior sound profiles.
- Support spatial 3D audio.
- Support realistic distance attenuation.
- Support sound obstruction and occlusion.
- Prevent multiple copies of the same engine sound from playing simultaneously.
- Smoothly transition between audio states.

Every vehicle must have its own sound identity.

Do not make every vehicle sound identical.

---

## 3. FIFTEEN MODERN SUPERCARS

The 15 modern supercars must use realistic factory-style radio systems.

IMPORTANT:
These cars must NOT receive enormous aftermarket subwoofer systems by default.

Their audio should resemble an ordinary modern production vehicle.

Requirements:

- Factory-style speakers.
- Normal factory bass response.
- Clear vocals and music.
- Realistic mids and highs.
- Moderate low-frequency response.
- Realistic dashboard speaker positioning.
- Vehicle-specific cabin acoustics.
- Realistic engine and exhaust audio.

The supercars should have impressive engine sounds, but their radio systems should remain ordinary factory-style systems.

Do not give them the extreme bass characteristics of the Blue DONK or Chevy Tahoe.

---

## 4. OLD-SCHOOL CLASSIC VEHICLES

Classic vehicles must have a noticeably deeper and stronger bass character than the modern supercars.

Requirements:

- Deep vintage-style bass.
- Warm low-frequency response.
- Realistic older stereo characteristics.
- Distinct speaker and cabin acoustics.
- Vehicle-specific audio tuning.
- Strong but controlled bass.
- Realistic dashboard and door speaker positioning.

Each classic vehicle should have its own recognizable sound.

The classic cars should sound powerful without matching the extreme custom systems in the Tahoe or Blue DONK.

---

## 5. CHEVY TAHOE CUSTOM BASS SYSTEM

The Chevy Tahoe receives a heavily upgraded custom audio system.

This is not an ordinary factory stereo.

The Tahoe must have a custom high-output bass system with subwoofers installed throughout its customized cabin.

The user's intended custom setup includes a stripped-out interior with extensive subwoofer placement rather than ordinary passenger seating.

Requirements:

- Multiple powerful subwoofers.
- Custom amplifier system.
- High-output low-frequency response.
- Deep, heavy bass.
- Realistic bass pressure inside the cabin.
- Strong bass resonance through the vehicle body.
- Interior vibration synchronized with the music.
- Realistic speaker and subwoofer positioning.
- Distinctive Tahoe audio tuning.

The Tahoe must have noticeably stronger bass than the classic vehicles.

Do not give this setup to the 15 modern supercars.

---

## 6. BLUE DONK EXTREME AUDIO SYSTEM

The Blue DONK receives the most extreme custom bass system in the game.

Target showcase:
182 dB IN-GAME AUDIO EFFECT.

This is a stylized fictional game showcase, not a real-world sound-pressure measurement.

The Blue DONK must have:

- Extremely powerful custom subwoofers.
- High-output amplifiers.
- Heavy low-frequency response.
- Strong bass pulses.
- Realistic cabin vibration.
- Rear audio port effects.
- Vehicle-body vibration.
- Bass-reactive rear quarter panels.

### QUARTER-PANEL VIBRATION

One of the most important features:

When the Blue DONK plays powerful bass, its rear quarter panels must rapidly vibrate.

The panels should visibly flex and shake in a realistic way, similar to the dramatic vibration shown in extreme car-audio demonstrations.

Requirements:

- Rapid vibration synchronized with bass hits.
- Visible rear quarter-panel movement.
- Rear port and body-panel vibration.
- Stronger movement at higher bass intensity.
- Smooth movement between bass hits.
- No random animation.
- No permanent deformation.
- No broken vehicle physics.

### REAR WHEEL AND SUSPENSION RESPONSE

Add subtle, controlled bass-reactive movement to the rear wheels, tires, and suspension.

The movement must:

- React to low-frequency audio energy.
- Remain synchronized with the bass.
- Never cause vehicle instability.
- Never interfere with driving or collision physics.
- Never change the actual tire collision geometry.

Use audio amplitude envelopes and low-frequency RMS measurements to drive the visual effects.

Do not use random shaking.

The 182 dB showcase should be visually impressive while remaining stable and playable.

---

## 7. MUSIC PRO PLAYER-UPLOAD SYSTEM

Create Music Pro as a built-in music player.

Players must be able to upload their own music files and listen to them through the actual audio system of the vehicle they are driving.

Support common audio formats when supported by the selected decoder:

- MP3
- WAV
- M4A
- AAC
- FLAC

Validate file types, codecs, and file sizes before importing.

Display a clear message when a format cannot be played.

### MUSIC LIBRARY

Create a music library that supports:

- Uploaded songs.
- Song titles.
- Artist names when metadata exists.
- Album information when available.
- Playlists.
- Recently played music.
- Saved music.
- Search.
- Track selection.

### PLAYER CONTROLS

Include:

- Play.
- Pause.
- Next track.
- Previous track.
- Seek bar.
- Volume control.
- Shuffle.
- Repeat.
- Playlist selection.
- Track progress.
- Current song display.

Music should continue playing while driving and should transition correctly when entering or exiting vehicles.

### FILE STORAGE AND SAFETY

- Request permission before accessing user-selected files.
- Keep imported music private to the player.
- Use local storage or approved application storage.
- Do not upload music to external services without explicit consent.
- Enforce file-size and storage limits.
- Validate imported files.
- Handle corrupted and unsupported files safely.
- Do not allow one imported file to crash the audio engine.
- Preserve the player's library when the game restarts, where supported.

Players must have the rights to use the music they import. Do not bypass copyright restrictions or unauthorized streaming protections.

---

## 8. REALISTIC IN-CAR MUSIC EXPERIENCE

Music Pro must sound like music playing through an actual car stereo.

Do not make uploaded music sound like generic background game music.

### INSIDE THE VEHICLE

When the player sits inside a vehicle:

- Music should sound like it is coming from the vehicle speakers.
- Use realistic left/right speaker positioning.
- Apply vehicle-specific EQ.
- Apply realistic cabin acoustics.
- Simulate appropriate bass response.
- Use realistic interior reflections and resonance.

### OUTSIDE THE VEHICLE

When the player exits:

- The music should sound like it is coming from the vehicle.
- Volume should decrease naturally with distance.
- Bass should remain perceptible at appropriate distances.
- Sound should be spatially positioned around the vehicle.

### BEHIND THE VEHICLE

When standing behind a vehicle:

- Sound should reflect the location of rear speakers and subwoofers.
- Rear audio ports should have appropriate low-frequency presence.
- The Blue DONK should have its distinctive rear bass character.

### WINDOWS

If functional window controls exist, support the difference between open-window and closed-window acoustics.

Do not create duplicate music playback when switching camera views or entering and exiting a vehicle.

---

## 9. AUDIO PERFORMANCE AND MEMORY PROTECTION

This system must be optimized for mobile devices.

Prevent:

- CPU spikes.
- Memory leaks.
- Audio decoding freezes.
- Repeated audio initialization.
- Duplicate playback.
- Excessive audio processing.
- Unnecessary file loading.
- Audio thread overload.
- Main-thread blocking.
- Sudden memory growth.

Requirements:

- Decode tracks efficiently.
- Load music only when needed.
- Stream longer tracks where appropriate.
- Release unused audio resources.
- Reuse audio nodes and processing resources when safe.
- Avoid creating a new audio engine for every vehicle.
- Limit unnecessary simultaneous sound sources.
- Use efficient audio processing.
- Handle background and foreground transitions.
- Recover gracefully from audio errors.

Audio must never interfere with vehicle physics, player controls, world streaming, or multiplayer gameplay.

Do not promise zero lag without testing on actual target devices.

---

## 10. MULTIPLAYER AUDIO

Where multiplayer supports shared vehicle experiences:

- Keep vehicle engine sounds synchronized appropriately.
- Replicate vehicle audio state where necessary.
- Do not transmit entire uploaded music files between players.
- Respect each player's local music settings and permissions.
- Prevent duplicate audio playback.
- Keep custom music private unless a properly authorized sharing feature is explicitly implemented.

A player's personal Music Pro library must not automatically become public to other players.

---

## 11. TESTING REQUIREMENTS

Test all of the following:

1. All 15 modern supercars use ordinary factory-style radio systems.
2. Modern supercars have realistic engine and exhaust audio.
3. Classic cars have deeper vintage-style bass.
4. Classic cars have individual audio profiles.
5. Chevy Tahoe has its custom high-output subwoofer system.
6. Blue DONK has its extreme 182 dB in-game showcase.
7. Blue DONK quarter panels vibrate in synchronization with bass.
8. Rear wheel and suspension effects remain physically stable.
9. Music Pro imports supported music formats.
10. Music playback works while driving.
11. Music playback works when entering and exiting vehicles.
12. Interior and exterior audio positioning works.
13. Distance attenuation works.
14. Audio does not duplicate when switching vehicles.
15. Music library persistence works.
16. Unsupported and corrupted files fail safely.
17. Mobile performance remains stable.
18. CPU and memory usage are profiled.
19. Multiplayer audio does not create duplicate playback.
20. Existing game features continue working.

---

## 12. PRESERVE EXISTING GAME FEATURES

Do not remove or break:

- Existing vehicles.
- Vehicle interiors and exteriors.
- Vehicle physics.
- Vehicle handling.
- Existing audio features.
- Player controls.
- Mobile controls.
- Graphics settings.
- World streaming.
- Terrain systems.
- Multiplayer.
- Existing gameplay.
- Music Pro features already present.

Before modifying existing source files, create a backup of the affected files.

Integrate this system into the existing architecture instead of replacing working systems unnecessarily.

---

## 13. IMPLEMENTATION AND COMPLETION

This document is the implementation specification.

The actual implementation must include:

- Inspection of existing vehicle and audio code.
- Integration with the existing vehicle system.
- Music Pro implementation.
- Vehicle-specific audio profiles.
- Blue DONK bass-reactive body effects.
- Performance safeguards.
- Automated tests where appropriate.
- Testing on supported mobile devices.

Do not report a feature as completed until its source code has actually been changed and the relevant tests have passed.

Provide a clear implementation summary identifying:
- Files changed.
- Features implemented.
- Tests performed.
- Any remaining limitations.

FINAL GOAL:

Make vehicle audio in SURVIVAL ISLAND: THE LOST WORLD feel like a real automotive audio experience.

The modern supercars should sound like modern production vehicles.

The classic cars should have deep vintage bass.

The Chevy Tahoe should have a powerful custom subwoofer system.

The Blue DONK should deliver an extreme 182 dB-style in-game bass showcase with rapidly vibrating rear quarter panels.

Music Pro should let players bring their own music into the game and hear it through the actual vehicle stereo system.
