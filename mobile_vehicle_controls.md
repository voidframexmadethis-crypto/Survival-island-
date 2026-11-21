
# SURVIVAL ISLAND: THE LOST WORLD
# MOBILE VEHICLE CONTROLS — PRIORITY FIX

## OBJECTIVE
Fix overlapping vehicle controls, menus, touch interactions, and responsive layouts on iPhone and other mobile devices.

Implement actual improvements in the existing game source code while preserving every existing vehicle feature.

## 1. IPHONE SCREEN RESPONSIVENESS
- Adapt vehicle controls to different iPhone screen sizes.
- Respect safe areas, screen edges, and device notches.
- Prevent buttons from being cut off or hidden.
- Keep important driving controls visible during gameplay.
- Support portrait and landscape layouts where the game allows them.
- Scale and position controls appropriately without making them difficult to touch.

## 2. STEERING AND DRIVING CONTROLS
- Make steering controls responsive and reliable.
- Fix delayed or missed touch inputs.
- Prevent steering buttons from interfering with other controls.
- Ensure acceleration and braking respond immediately.
- Preserve smooth steering and vehicle movement.
- Prevent accidental simultaneous inputs when controls overlap.

## 3. OVERLAPPING MENUS
- Fix vehicle menus that overlap each other.
- Prevent radio, hydraulics, customization, and other panels from covering essential driving controls.
- Establish clear panel positioning and layering.
- Make menus expandable and collapsible where appropriate.
- Ensure only the intended active panel receives touch input.
- Prevent invisible or closed menus from blocking taps.

## 4. TOUCH INPUT AND INTERACTION
- Correct touch event handling.
- Prevent stuck buttons when a finger moves away or lifts.
- Support reliable multi-touch interactions when required.
- Prevent duplicate touch and click events.
- Ensure controls remain responsive during vehicle movement.
- Handle opening and closing menus without interrupting driving unexpectedly.

## 5. PRESERVE EVERY EXISTING VEHICLE FUNCTION
Do not remove or disable:
- Steering.
- Acceleration and braking.
- Parking brake and handbrake.
- Vehicle entry and exit.
- Hydraulic suspension.
- Hydraulic hopping.
- Vehicle flight controls where supported.
- Existing vehicle customization.
- Radio and music controls.
- Existing vehicle-specific features.

## 6. RADIO AND MUSIC PRO CONTROLS
- Make radio controls accessible on mobile screens.
- Prevent the radio interface from blocking driving controls.
- Preserve existing music playback functionality.
- Ensure play, pause, skip, and other available controls respond correctly.
- Keep the interface usable while driving.

## 7. PERFORMANCE
- Avoid unnecessary UI rendering.
- Prevent touch-event listeners from accumulating.
- Clean up event handlers when components unmount.
- Avoid introducing input delays or performance drops.
- Preserve existing game performance and graphics settings.

## 8. TESTING REQUIREMENTS
Test the following:
- Steering while accelerating.
- Steering while braking.
- Parking brake and handbrake.
- Vehicle entry and exit.
- Hydraulic suspension and hopping.
- Flight controls where supported.
- Opening and closing vehicle menus.
- Radio controls while driving.
- Multi-touch interactions.
- Different iPhone screen sizes.
- Portrait and landscape layouts where supported.
- Hidden menus never intercepting touches.

Fix any regressions discovered during testing.

## STRICT PRESERVATION RULES
- Modify the existing game; do not rebuild it.
- Do not replace the vehicle system unnecessarily.
- Do not remove existing vehicle functions.
- Do not change vehicle physics unless necessary to fix an input issue.
- Do not overwrite unrelated systems.
- Back up every source file before modifying it.
- Preserve existing gameplay and vehicle behavior.

## COMPLETION REQUIREMENTS
The task is not complete until:
1. Actual source-code changes have been implemented.
2. Mobile controls have been tested.
3. Existing vehicle functions have been verified.
4. Modified files and test results have been reported.
5. The published version remains protected.

Do not merely provide recommendations or a proposed solution. Implement the actual fixes.
