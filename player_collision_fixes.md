
# SURVIVAL ISLAND: THE LOST WORLD
# PLAYER GROUND COLLISION — PRIORITY FIX

## OBJECTIVE
Fix player ground collision, terrain detection, falling through the world, spawning, and respawning. Implement the fixes directly in the existing game source code.

## 1. TERRAIN COLLISION
- Ensure the player reliably collides with all walkable terrain.
- Fix collision gaps between streamed terrain chunks.
- Prevent the player from falling through terrain seams.
- Correct terrain height sampling and collision synchronization.
- Support uneven ground, hills, valleys, and steep slopes.
- Preserve existing terrain deformation and procedural generation.

## 2. ROADS, BRIDGES AND BUILDINGS
- Ensure roads have reliable walkable collision surfaces.
- Fix collision detection on bridges and elevated platforms.
- Ensure building floors and accessible structures support the player.
- Prevent the player from passing through floors or becoming trapped inside geometry.
- Correct transitions between terrain, roads, bridges, and buildings.

## 3. GROUND DETECTION AND RAYCASTING
- Inspect existing raycasting and collision systems before modifying them.
- Correct ray origins, directions, distances, and collision filtering.
- Prevent false ground detection through walls or unrelated geometry.
- Ensure downward ground detection selects the correct walkable surface.
- Handle moving and streamed geometry safely.
- Avoid unnecessary raycasts that could reduce mobile performance.

## 4. GRAVITY AND PLAYER MOVEMENT
- Correct gravity and vertical velocity synchronization.
- Prevent sudden downward snapping and unwanted bouncing.
- Ensure the player lands smoothly on slopes and uneven surfaces.
- Preserve walking, running, jumping, swimming, and flying.
- Do not interfere with vehicle physics or other movement systems.

## 5. SPAWNING AND RESPAWNING
- Ensure the player spawns above a valid walkable surface.
- Verify ground height before completing a spawn.
- Prevent spawning underneath terrain or inside structures.
- Fix respawning when falling outside the playable world.
- Preserve existing checkpoints and game-mode-specific spawn behavior.

## 6. STREAMING AND PERFORMANCE
- Preserve the existing 64-meter terrain chunk streaming system.
- Preserve full draw distance and existing graphics settings.
- Ensure collision data remains synchronized as chunks load and unload.
- Prevent memory leaks and unnecessary collision-object accumulation.
- Avoid introducing additional rendering loops or duplicate physics systems.

## 7. TESTING REQUIREMENTS
Run focused tests for:
- Walking across ordinary terrain.
- Walking across terrain chunk boundaries.
- Walking up and down slopes.
- Crossing roads and bridges.
- Entering and walking inside buildings.
- Jumping and landing.
- Spawning and respawning.
- Moving between streamed terrain sections.
- Mobile performance and collision stability.

Fix any regressions discovered during testing.

## STRICT PRESERVATION RULES
- Modify the existing game; do not rebuild it.
- Do not replace the player controller or physics engine unnecessarily.
- Do not remove existing gameplay features.
- Do not simplify terrain or reduce graphics quality.
- Do not overwrite unrelated systems.
- Back up every source file before modifying it.
- Preserve existing functionality unless a change is necessary for the collision fix.

## COMPLETION REQUIREMENTS
The task is not complete until:
1. Actual source-code changes have been implemented.
2. Focused tests have been executed.
3. Existing gameplay has been checked for regressions.
4. Modified files and test results have been reported.
5. The original published version remains protected.

Do not merely provide recommendations or a proposed solution. Implement the actual fixes.
