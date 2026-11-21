# Uwide Free

## 0.4.69

YouTube Shorts pages are excluded from framing effects and player controls; any previous Uwide video styles are restored.

Automatic framing now recovers from delayed player style resets during fullscreen and layout transitions. Recovery is limited to two attempts within a three-second transition window; conflicts outside that window remain protected. A Chromium fixture passed three fullscreen enter/exit cycles with delayed style removal. Real streaming-site confirmation remains pending.

New compact three-section player panel and popup, with a sticky sidebar in options. The manifest action has been removed. Open settings from the player or the browser extension details page. Existing settings and video logic are preserved.

Fullscreen transitions now rebase player styles once after settling, preserving any locked content crop. Invalid intermediate measurements no longer permanently block automatic framing. Live player confirmation is still required.

The feature comparison now records the reference's HDR and sharpening examples: the extension's CSS brightness/contrast sliders do not provide HDR output or detail sharpening. It also documents that linear stretch and global saturation do not equal edge-weighted warping and selective vibrance. Source-video flashes are not analyzed or filtered.

An independent, free Chromium extension prototype based on the requested feature inventory. It does not reuse the bundled Zoom to Fill implementation.

## Developer

Wuqqers · https://www.omerkayaekici.com/tr/

## Load locally

1. Extract `Uwide-Free-Chromium-0.4.69.zip`.
2. Open chrome://extensions, enable Developer mode and choose Load unpacked.
3. Select the extracted folder and refresh the video tab.
4. Open Uwide beside the player's fullscreen control. The extension has no toolbar popup action.
5. Open full settings from Chrome Extensions → Uwide → Details → Extension options.

To update, replace files in the existing folder, reload the extension, then refresh video tabs.
Privacy information is included in PRIVACY.html.

## Light sensitivity and limits

Read [PHOTOSENSITIVITY.md](PHOTOSENSITIVITY.md) before use. It describes which effects are disabled and why this extension cannot promise epilepsy safety or zero flashing. [FEATURE-COMPARISON.md](FEATURE-COMPARISON.md) lists remaining paid-feature gaps and their status.

## Current implementation

Automatic mode offers cover and contain with one uniform scale based on the intrinsic video frame, preserving its aspect ratio. Cover can crop edges; contain keeps the full frame visible and may leave bars. Automatic mode does not apply manual zoom. Manual mode enables framing controls. Picture processing is independently opt-in in both modes; the off-by-default switch applies saved brightness, contrast, saturation and vibrance only when enabled. Embedded black bars can be detected where video pixels are readable. The extension cannot guarantee compatibility with every player; DRM, cross-origin playback and site-specific layouts can limit its behavior.

0.4.24 temporarily sets `transition: none` on a managed video so page-level CSS transitions do not animate between framing states. The original inline transition is restored when Uwide releases that video.

0.4.25 rounds automatic scale to four decimal places to avoid rewriting the video style for insignificant fractional measurement noise.

0.4.26 adds an allowlisted-sites scope for framing, black-bar detection and picture settings. Add a site to the list first; those settings are stored on this device and reused on each listed site.

0.4.51 shows the correct popup status when the active site is blocked by the allowlist. 0.4.50 adds the Tam kare · filtre kapalı preset to the popup without switching the master enable state. 0.4.49 makes panel and keyboard framing resets restore the custom aspect default. 0.4.48 includes custom aspect in the configurable framing-shortcut cycle. 0.4.47 includes the feature comparison and photosensitivity documents in the installation archive. 0.4.46 adds the manual horizontal stretch slider to the popup. 0.4.45 adds the same slider to the in-player controls. 0.4.44 applies the Chromatic Glass theme consistently in the popup, player panel and settings page. 0.4.43 adds the static theme; it uses no animation, video filter or backdrop blur. 0.4.42 adds an optional, user-assigned YouTube theater-mode shortcut with no default binding. 0.4.41 adds the “Tam kare · filtre kapalı” preset and includes auto black-bar, wheel-zoom and shortcut-scale values in custom profile snapshots. This preset is not a medical safety mode. 0.4.40 adds a validated custom crop aspect from 0.50 to 4.00, available in manual mode and included in scopes and profile import/export. 0.4.39 adds a player-panel button that switches manually between the original view and Uwide framing without changing saved settings or running an animation. 0.4.38 removes an unused SVG sharpening filter and empty audio-reactivity hooks from the content script; these paths could not produce effects and are no longer present. 0.4.37 saves the player-panel position per site on this device and clamps it to the viewport when restored. 0.4.36 adds six configurable framing shortcuts that are off until enabled, ignore held-key repeats, avoid common browser-reserved combinations, and do nothing while player controls or text fields are focused. 0.4.35 keeps the local profile copy intact if a synced profile index arrives before its profile records, and uses browser-neutral sync wording. 0.4.34 adds optional browser-sync storage for custom profiles. Existing local and synced profiles merge when enabled; profiles stay device-local when disabled. Sync quota failures leave the previous profile list intact. Settings and the in-player panel also disable UI animation when the operating system requests reduced motion. This does not remove flashes from video content. 0.4.33 adds the reference 18:9 manual crop preset alongside the existing square preset. 0.4.32 adds optional mouse-wheel zoom over the in-player settings icon; it is off by default, applies one fixed step without animation, and preserves the current sizing mode. 0.4.30 detects active animations and transitions on video framing properties, pauses Uwide writes while they are active, and reports the affected CSS properties in player diagnostics. This can prevent some page-effect conflicts but does not analyze pixels or certify playback safety. 0.4.29 adds a show/hide preference for the in-player settings button. 0.4.28 adds an automatic-mode contain option that keeps the complete source frame visible, and bases cover/contain scaling on the video intrinsic dimensions with object-fit contain to avoid stretching the image. 0.4.27 reapplies a saved allowlisted-sites group on every listed site. “Varsayılan kapsam” opts one tab back into the shared settings; “kapsamı kaldır” removes that group override and returns to the supported-sites default when one exists.

0.4.18 keeps picture processing off in manual mode unless its separate switch is enabled. With the switch off, Uwide does not add brightness, contrast or saturation filters; repeated promotion of filter layers was also removed from its sizing path. This reduces extension-generated image changes but does not filter source-video flashes or guarantee seizure safety.

0.4.19 adds separate storage scopes for framing and picture settings in the full settings page. Either group can use the shared scope or select global, device, site, tab or video storage independently. Existing shared settings remain the fallback until a group-specific scope is selected.

0.4.20 keeps category-specific writes separate from the shared scope's keys. Selecting the shared-scope option resumes the existing common settings without deleting category-specific saved data.

0.4.21 adds a third independent scope for embedded black-bar detection. The framing, black-bar and picture groups can each use the shared scope or choose their own storage scope.

0.4.22 also exposes these three scope selectors in the in-player settings panel. Unavailable site, tab and video scopes are disabled for the current player context.

The current automatic and manual modes have not yet been verified in live YouTube, Netflix or Max playback. The extension cannot guarantee freedom from visual glitches or flashing.

The site list lives in device-local storage. Enable list mode in full settings, then add the currently open site. Sites excluded by the list have Uwide's video styles removed. A maximum of 100 sites can be stored.

0.4.3 disables ambient/audio-reactive glow and SVG sharpening/highlight effects even with older saved settings. Identical inline styles are not rewritten. Invalid automatic sizing stops further framing for that video until it is released (disable the extension or reload the page). This is not a guarantee against flashing in source video or browser/GPU rendering.

0.4.4 adds local custom profiles with save/apply/delete/undo and redesigns the settings page. Profiles preserve the master enable switch, automatic picture switch and theme, and never enable dynamic light effects. Up to 30 profiles can be saved on this device.

0.4.5 redesigns the in-player panel with matching themes, native popover support, keyboard dismissal, a scrollable viewport-constrained layout and player diagnostics. Unsupported automatic-mode controls are hidden. Diagnostics report geometry and processing state; they do not inspect the video for flashes. Profile tests and isolated Chromium extension tests with a static synthetic video pass; real streaming platforms remain unverified.

## Settings scope (0.4.6)

- **General** uses browser sync storage.
- **This device** stays in this browser profile and is the default for sites without an override.
- **This site** stays local and follows the existing canonical site grouping.
- **Only this tab** lives in session storage and is removed when that tab closes. It follows the tab across navigation, not a specific video.

Choose a scope in the popup or full settings page. Open full settings from the target video's popup to select a site or tab scope. A direct settings-page opening without a valid target offers general/device scope.

Creating a device, site or tab scope copies the currently effective values so the image does not jump just because a new scope is created. Selecting an existing scope loads its saved values. Selecting General does not erase other scopes. An explicit scope choice applies to the target tab until it closes; other tabs keep their own selection. Without an explicit selection, precedence is tab → site → device → general.

“Remove this scope's custom settings” deletes the selected override and returns to the remaining defaults. “Reset selected scope” writes factory defaults only to the selected scope. Neither operation deletes custom profiles. In-player controls write to the same selected scope.

Storage writes are serialized in the service worker. Old site settings remain compatible. Input validation clamps supported numeric fields and keeps disabled dynamic effects off. Browser tests cover two tabs on one site, concurrent writes, close cleanup, and device settings remaining outside sync storage.

## Manual aspect presets (0.4.7)

Choose source, 16:9, 16:10, 18:9, 21:9, 32:9, 4:3 or square in manual mode. A numeric preset crops symmetrically from the actual source picture, excluding letterboxing inside the video element. Fit preserves the cropped frame inside the player; cover fills the player and may crop additional edges; stretch can distort proportions. Manual zoom, pan and trim still apply. Reset framing restores the source preset. Automatic mode ignores these manual crops and follows the separate cover/contain layout control; both use one uniform scale that preserves the source image ratio. Custom profiles retain the selected ratio.

All six ratios were checked in isolated Chromium using the actual clip-path and transform styles, including the return to automatic mode. Geometry tests additionally cover portrait sources and letterboxed elements. These tests do not certify source-video flash safety or real streaming-platform compatibility.

## Profile transfer (0.4.8)

Full settings → Profiles → Transfer profiles exports a JSON file containing profile names and supported framing/color values. It does not export site URLs, tab IDs, master enable, automatic color activation, or device settings. Import appends profiles without overwriting existing ones; colliding names receive numbered suffixes. Imported profiles are saved only, never applied automatically. Select a saved profile and choose Apply to use it.

Files must use the Uwide Free v1 profile format, be at most 128 KB, contain supported values, and keep the total count at 30 or fewer. Invalid bundles are rejected as a whole. Disabled dynamic effects remain disabled even if a file requests them. Actual download/upload, malformed JSON, duplicate names and unchanged active video settings are covered by browser tests.

## Fullscreen geometry correction (0.4.9)

The fullscreen target now uses the measured fullscreen element's width and height. It no longer substitutes a height derived from `screen.width/screen.height`, which could disagree with the actual surface (a 1600×1000 test case previously became 1600×900).

Browser tests check centered synthetic video bounds in normal, theater-sized and fullscreen player layouts, including exiting fullscreen. At a stable size, 120 consecutive animation frames with repeated resize events produce zero video style mutations. This verifies idempotent styling in that fixture; it is not pixel-level flash analysis or a guarantee about streaming services, GPU output or source content.

## Player panel positioning (0.4.10)

Drag the dedicated Move button in the panel header. With that button focused, arrow keys move the panel in 20 px steps; Shift reduces the step to 5 px. Clicking it reveals help and directional buttons for movement without dragging. Reset position returns the panel beside the player controls.

The panel is clamped to the visible viewport and re-clamped when the viewport or panel content changes. Position lasts for the current panel's lifetime; it is not saved across reloads. Only the handle captures drag gestures, so controls and text keep their usual behavior. Movement has no animation and does not change video settings. Pointer, keyboard, directional-button, small-viewport and reset paths are covered by isolated Chromium tests.

## Video-only scope (0.4.11)

“Only this video” is available when the target tab has a ready video. It starts with the current values, but returns to broader tab/site/device/general settings when the media is reloaded, its source changes or the page URL changes. It remains selected so new edits stay video-specific. A quality change that reloads media may also reset this scope; it does not infer a title or episode identity from DRM/player internals. Use tab scope when settings should survive these changes.

Media identity is tracked in memory and represented in session storage by an opaque token, not the source URL. Video overrides are removed with tab cleanup. Settings pages update when target media changes. Browser tests replace a static test media stream, wait for playback readiness, verify that the override is gone and the open settings page refreshes, then test a same-document URL change. Real service-specific quality/ad transitions remain to be verified.

## Style conflict handling (0.4.12)

Uwide records the actual inline value and priority after each owned video style write. If the page or another extension later changes or removes one of those values, Uwide stops processing that video instead of repeatedly overwriting it. The player panel identifies the changed property. After resolving the competing change, disable and re-enable Uwide to capture the new base state.

Disabling Uwide restores only properties that still match its own last values. Later external changes are preserved. This can also detect legitimate player layout changes; it deliberately does not guess which extension or page script made the change. The guard covers owned inline properties, not every computed CSS rule, CSS animation, browser rendering issue or source-video flash.

Browser tests simulate transform/filter changes and verify zero subsequent video style mutations over 90 resize-triggered frames, preservation on disable and explicit restart. Unit tests cover priority changes, removal, latched stopping and unrelated styles.

## Embedded black-bar detection (0.4.13)

The black-bar switch appears in the popup, full settings and player panel. The detector examines a 128×72 video frame at most once per 1.4 seconds. It requires a bright center, paired dark edges, four matching samples and at least 4.5 seconds before making one crop decision. That decision stays fixed for the current media identity so scene changes cannot make the frame pulse. Turning the switch off removes the crop.

Protected or cross-origin streams may reject pixel readback. In that case the detector stops for the current video; the normal player-size framing remains available. A video that changes its embedded aspect ratio after detection may need the switch turned off or the media reloaded. This feature does not detect flashing in source content and cannot certify seizure safety.

Isolated Chromium tests verify static horizontal and vertical bars, visible-area geometry, and zero repeated video style writes after detection. Screenshots are in `test-results/` outside the packaged extension. Live streaming sites remain unverified.
