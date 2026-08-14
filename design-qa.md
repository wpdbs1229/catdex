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
