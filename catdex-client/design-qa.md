# ProfileSetupScreen Design QA

## Comparison Target

- Source visual truth: `/Users/persimmontree/orca/catdex/catdex-client/design-qa-assets/reference-06-keyboard-focused.png`
- Final keyboard implementation: `/Users/persimmontree/orca/catdex/catdex-client/design-qa-assets/profile-setup-keyboard.png`
- Default implementation: `/Users/persimmontree/orca/catdex/catdex-client/design-qa-assets/profile-setup-default.png`
- Earlier failed keyboard implementation: `/Users/persimmontree/orca/catdex/catdex-client/design-qa-assets/profile-setup-keyboard-before-fix.png`
- Component: `/Users/persimmontree/orca/catdex/catdex-client/src/features/auth/screens/ProfileSetupScreen.tsx`

## Viewport And Normalization

- Target surface: iPhone portrait onboarding screen.
- Source pixels: 390 × 844.
- Simulator app viewport capture: 368 × 800 logical pixels on iPhone 17 / iOS 26.5.
- Orca simulator-window evidence was captured at 2× density, cropped to the device screen, and normalized to 390 × 844 for visual comparison.
- Device bezel, Dynamic Island, status bar, and system keyboard are simulator-owned UI and are not implemented as app assets.
- Theme: light.
- Compared interaction state: nickname field focused with Korean software keyboard visible.

## Primary Interactions Tested

- Existing profile image and nickname render from the authenticated user.
- Nickname field receives focus and displays a cursor and orange focus border.
- Korean software keyboard opens.
- Hero, heading, avatar, and field compact into the visible region.
- `사원증 요청` remains fully visible and tappable immediately above the software keyboard.
- Default state shows the saved neighborhood, derived branch label, location consent, and CTA.
- TypeScript compile check passed with `npm run typecheck`.
- Native iOS build and launch succeeded for scheme `app` on iPhone 17 / iOS 26.5.

## Full-view Comparison Evidence

The source and final implementation were opened together at the same normalized 390 × 844 size. The implementation preserves the source hierarchy: compact office illustration, centered welcome copy, circular avatar, focused required nickname field, orange CTA, and Korean keyboard. The CTA and input occupy the same functional zone above the keyboard.

The live app intentionally shows the authenticated user's provider avatar and nickname instead of the mock's sample avatar and `홍길동`. This is realistic data variation, not a layout mismatch. The default state adds the previously required branch and location consent block; this block is removed from the visible composition only while typing and returns when the keyboard closes.

## Focused Region Comparison Evidence

- Input region: orange focus border, cursor, `10/10` counter, and 2–10 character constraint are present. Padding and radius are visually consistent with the source.
- CTA/keyboard boundary: after the fix, the CTA has a stable gap above the keyboard and no longer sits behind it.
- Hero region: the generated transparent office asset preserves the warm orange/beige storybook treatment and scales without clipping.
- Location region: in the default state, branch information uses the same warm neutral surface and orange location token as the rest of the screen.

## Comparison History

### Iteration 1 — blocked

- [P0] CTA hidden behind the iOS software keyboard.
  - Evidence: `profile-setup-keyboard-before-fix.png` showed the input above the keyboard but no visible `사원증 요청` button.
  - Cause: `KeyboardAvoidingView` did not reliably move the fixed footer for this screen hierarchy.
  - Fix: replaced implicit keyboard avoidance for the CTA with the keyboard event's actual `endCoordinates.height`; the footer is positioned directly above that height while the keyboard is visible.

### Iteration 2 — passed

- Evidence: `profile-setup-keyboard.png` shows the input and complete `사원증 요청` button above the Korean keyboard.
- Post-fix result: no actionable P0, P1, or P2 mismatch remains.

## Required Fidelity Surfaces

- Fonts and typography: system Korean sans-serif, weights, hierarchy, wrapping, and centered alignment closely match the mock; copy remains readable at the smaller iPhone viewport.
- Spacing and layout rhythm: key vertical anchors align closely after normalization. Keyboard focus state prioritizes hero compression, then input visibility, then CTA visibility.
- Colors and visual tokens: white background, near-black text, muted gray support copy, orange focus/CTA, and warm branch surface use the existing `nd` tokens.
- Image quality and asset fidelity: hero and default avatar are real raster assets with alpha, not code-drawn placeholders. The hero is sharp at its rendered size and shows no material magenta fringe.
- Copy and content: `대한냥냥공사에 오신 걸 환영해요`, onboarding help text, `닉네임`, `소속 지부`, location consent copy, and `사원증 요청` are implemented as specified.

## Findings

- No actionable P0, P1, or P2 findings remain.

## Open Questions

- None blocking. The automated keyboard capture includes an iOS text-selection popover in one evidence frame; this is simulator interaction chrome and is not rendered by the app.

## Implementation Checklist

- [x] Preserve required nickname input on this screen.
- [x] Keep CTA visible above the keyboard.
- [x] Collapse nonessential content while typing.
- [x] Connect location consent to existing neighborhood detection and branch derivation.
- [x] Preserve immediate profile completion through the existing Supabase update flow.
- [x] Pass TypeScript and iOS simulator build checks.

## Follow-up Polish

- [P3] If a custom Korean font is adopted app-wide later, re-check title weight and letter spacing on smaller devices.

final result: passed
