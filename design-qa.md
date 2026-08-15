# Community detail and composer design QA

## Evidence

- Reference: `/var/folders/j2/4lr7cczj16j5pgvm_xyfwrv80000gn/T/orca-paste-1786774225919-0825e736-d94d-43e2-909c-89bea1a8cbd2.png`
- Detail implementation: `/tmp/catdex-detail-final.png`
- Composer implementation: `/tmp/catdex-composer-final.png`
- Detail side-by-side comparison: `/tmp/catdex-detail-comparison.png`
- Composer side-by-side comparison: `/tmp/catdex-composer-comparison.png`
- Simulator: iPhone 17, iOS 26.5, 402 x 874 pt app viewport (1206 x 2622 px capture)
- Reference dimensions: 1724 x 912 px; detail crop 655 x 912 px; composer crop 693 x 912 px
- Comparison normalization: both simulator captures were proportionally resized to the 912 px reference height and placed beside their corresponding source crop. The implementation preserves the native iPhone aspect ratio and safe-area chrome.

## State coverage

- Detail: production-backed post with author, region/time, body, one image, metrics, bookmark, empty comments, and persistent comment composer.
- Composer: question segment selected, valid body entered, a real cat selected, active neighborhood shown, observed time changed to 30 minutes ago, no images selected, and both submit controls enabled.
- Additional interaction checks: cat selection sheet opened and selected; observed-time action sheet opened and applied; unsaved-draft close confirmation opened and dismissed the draft; detail navigation opened from the feed; post-management action sheet opened and dismissed.
- No post, comment, report, like, or bookmark mutation was submitted during QA.

## Full-screen comparison findings

- Navigation hierarchy, titles, orange accents, segmented control, author/context hierarchy, image treatment, social metrics, form rows, privacy notice, and fixed bottom actions match the supplied visual direction.
- The write action uses orange (`#FF6A00` / theme accent) in the composer and the community floating action button; no pink write action remains.
- Native safe-area/status-bar space and the narrower iPhone viewport explain the expected scale and line-wrap differences from the wide reference mockup.
- Production post text, author, image, counters, topic, neighborhood, and dates intentionally differ from the static reference content.
- The reference composer shows three selected photos and a filled observation note, while the verified implementation is in the valid no-photo/no-note state. The empty-photo state is intentional and retains the same layout; selected-photo previews and removal controls are implemented.

## Focused-region findings

- Header controls meet the 44 pt target area and preserve the reference left/center/right alignment.
- Composer submit button is 56 pt high with the intended orange fill, white label, pill radius, enabled/disabled states, and fixed footer placement.
- Detail like, bookmark, comment-like, and send actions have explicit button roles and accessible labels; composer primary, media, picker, and segment actions do as well.
- iOS action sheets and Android alert fallbacks cover time selection and post management.

## Iteration history

1. Implemented the production-backed detail and composer routes and matched the supplied layout.
2. Verified both screens in iOS Simulator and exercised composer selections without writing production data.
3. Added Android post-menu fallback and explicit accessibility roles after simulator inspection.
4. Re-ran TypeScript validation and captured final side-by-side visual evidence.

## Result

No P0, P1, or P2 visual or interaction discrepancies remain for the verified states.

final result: passed

---

# 고객 도감 투명 케이스 Design QA

## Evidence

- Source visual truth: `/var/folders/j2/4lr7cczj16j5pgvm_xyfwrv80000gn/T/codex-clipboard-8ccaf6d0-8650-4a38-b977-13e1a5e56d7a.png`
- Selected clear-case asset: `/Users/persimmontree/Documents/냥도감 3/assets/extracted-case/nyangdogam-clear-case.png`
- Seal detail truth: `/var/folders/j2/4lr7cczj16j5pgvm_xyfwrv80000gn/T/codex-clipboard-c2b8e85f-cae8-4f3c-8637-2ae7a2c0ca94.png`
- Source overrides: use the app's real cat cutout on the existing crumpled-white-paper texture; keep the source's transparent case and exact orange corner banners.
- Implementation screenshot: `/Users/persimmontree/Documents/냥도감 3/design-qa/final-implementation-clear-case.jpg`
- Full component comparison: `/Users/persimmontree/Documents/냥도감 3/design-qa/comparison-reference-case-pass-2.png`
- Focused top/corner comparison: `/Users/persimmontree/Documents/냥도감 3/design-qa/focused-case-banners-comparison-final.png`
- Focused seal comparison: `/Users/persimmontree/Documents/냥도감 3/design-qa/focused-seal-comparison-pass-3.png`
- Clear-case normalized comparison: `/Users/persimmontree/Documents/냥도감 3/design-qa/comparison-clear-case-pass-4.png`

## Viewport and normalization

- Device/state: iPhone 17 simulator, light mode, 길냥이 고객 `감자` detail.
- Simulator viewport: 402 × 874 pt, @3x device configuration; optimized screenshot evidence is 368 × 800 px.
- Source evidence: 500 × 828 px.
- The visible implementation case was cropped at `(52, 131)–(316, 577)`, resized with Lanczos, and padded to 500 × 828 px before side-by-side evaluation. The comparison isolates the case rather than the status bar and surrounding detail content.

## State and interactions tested

- Home → 내 고객 → 감자 고객 detail navigation.
- Real cutout loading from `cat.imageUrl`, with original-photo fallback only when a cutout is unavailable.
- Adjacent customer case rendering remains visible and functional.
- Vertical record-list scrolling and the fixed record input remain intact.
- XcodeBuildMCP build/run succeeded in this implementation chain; Metro rendered the final React Native layout in the booted simulator.

## Required fidelity surfaces

- Case proportion: the primary dossier now uses the selected asset's tall portrait ratio (`1647 / 955`, approximately `1.725`) instead of the earlier wide-looking case.
- Case construction: the prior front/back case pair was replaced with the selected 955 × 1647 transparent PNG. Its natural `1647 / 955` ratio preserves the rounded slot and layered white/clear rim without nine-slice distortion.
- Card placement: the orange-bordered paper card fills the case at source-measured side, top, and bottom insets; the bottom orange rule is continuous.
- Corner banners: `대한냥냥공사` and `길냥이 고객 파일` are exact transparent PNG extractions from the supplied reference. Their size and position follow measured source ratios and they render above the front case layer so neither tab is clipped.
- Official seal: the previous redrawn seal was removed. The implementation now uses the supplied seal's exact double ring, compact curved `대한냥냥공사` lettering, diamond marks, and dimensional paw impression, isolated as a transparent PNG.
- Paper/photo override: the source illustration is intentionally replaced with the app's real cat cutout over `assets/textures/crumpled-paper.jpg` per the user's instruction.
- Data and typography: customer number, name, habitat, activity area, breed, encounters, records, affinity, and dates remain live app data with the existing product typography.
- Copy: the `처음 등록한 순서` chip and its supporting styles were removed completely; the customer number now stands alone as requested.
- Theme/accessibility: orange tokens and the existing labeled header actions remain consistent with the product UI.

## Comparison history

### Pass 0 — blocked

- [P2] The prior implementation's case read too wide/short and the corner labels were generic rebuilt badges rather than the supplied reference shapes.
- Fix: measured the new 500 × 828 reference, changed the dossier aspect ratio, and extracted both source banners as transparent PNG assets.

### Pass 1 — blocked

- [P2] Enlarging the extracted banners without matching their layer order caused the top/front case edge to cover portions of the labels, especially the right file tab.
- Fix: source-measured widths/offsets were applied and the two hanging banners were moved above the transparent front-case layer.

### Pass 2 — passed

- Full evidence: `/Users/persimmontree/Documents/냥도감 3/design-qa/comparison-reference-case-pass-2.png`
- Focused evidence: `/Users/persimmontree/Documents/냥도감 3/design-qa/focused-case-banners-comparison-final.png`
- No actionable P0/P1/P2 fidelity issues remain for the case ratio, slot, layered rim, orange border continuity, or top-banner visibility.

### Pass 3 — passed

- [P2] User review identified that the codebase's earlier redrawn seal had widely spaced letters and a flat oversized paw, which visibly differed from the supplied seal detail.
- Fix: replaced the redrawn seal with an exact raster extraction from the source and removed the surrounding card/background with a circular alpha mask.
- Implementation evidence: `/Users/persimmontree/Documents/냥도감 3/design-qa/final-implementation-reference-seal.jpg`
- Focused post-fix evidence: `/Users/persimmontree/Documents/냥도감 3/design-qa/focused-seal-comparison-pass-3.png`
- No actionable P0/P1/P2 differences remain in the seal structure, lettering arrangement, paw shape, or placement.

### Pass 4 — passed

- User-selected change: replace the earlier case layers with the newly extracted transparent case and remove `처음 등록한 순서`.
- Fix: both the selected and adjacent dossier cards now use `nyangdogam-clear-case.png`; case/card/banner insets were remeasured against the new asset and the phrase/chip styles were deleted.
- Implementation evidence: `/Users/persimmontree/Documents/냥도감 3/design-qa/final-implementation-clear-case.jpg`
- Normalized asset/implementation evidence: `/Users/persimmontree/Documents/냥도감 3/design-qa/comparison-clear-case-pass-4.png`
- Runtime accessibility snapshot contains `고객번호 #001` followed by the customer name and no `처음 등록한 순서` entry.
- No actionable P0/P1/P2 issues remain in case ratio, slot geometry, transparent rim placement, card containment, or requested copy removal.

## Follow-up polish

- [P3] The real cutout is intentionally smaller than the reference illustration so its ears and paws remain fully visible and reusable across customer photos with different silhouettes.
- [P3] The extracted seal inherits the source screenshot's mild antialiasing softness; this is preferable to redrawing and preserves the exact supplied artwork.

final result: passed
