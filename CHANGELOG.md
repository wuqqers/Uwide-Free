## 0.4.100

- Open full settings for the current video tab from the player. Refresh open settings views after changes made elsewhere.
- Release shortcut capture on focus loss, allow Tab navigation, and show saved shadow lift values in the popup.

## 0.4.99

- Restore a cleared video scale before the next paint during fullscreen changes. Correct the blocked-site settings hint.

## 0.4.98

- Use a symmetric 480 ms ease-in-out for framing and returning to the original view. Show the motion preference or temporary framing lock in player diagnostics.

## 0.4.97

- Preview edge-weighted stretch as the player slider moves, including layouts that already fill the player.
- Keep framing transitions available for delayed layout changes while respecting reduced motion and focus and seek holds.

## 0.4.96

- Make stretch work in automatic and manual framing and keep the selected layout when switching modes. Size manual layouts against the player and the visible source picture.

## 0.4.95

- Toggle the saved color filter while keeping full-frame framing. The player, popup and options show the current filter state.

## 0.4.94

- Animate manual contain, cover and stretch through scale changes. Start the transition when a newly discovered video first receives its framing.

## 0.4.93

- Ease framing scale changes and the return to the original size over 240 ms. Honor reduced motion and suppress easing during seek/focus holds.

## 0.4.92

- Retry settings reads after a missing background receiver. Show a reload hint in the player panel if the connection stays unavailable.

## 0.4.91

- Fix Turkish frame-generation messages. Consent given while paused waits for playback of the same video. Skip an isolated irregular frame and stop on repeated timing failures.

## 0.4.90

Experimental frame blending can be enabled for the current video under Picture. It targets 60 presentations per second on steady 30 fps sources up to 1080p, using a blended midpoint only between similar frames. Motion can show double edges. Start requires explicit consent each time. Pause, seek, focus loss or sustained timing problems stop processing. Photosensitivity safety and sustained 60 fps on live platforms have not been established.

## 0.4.89

- Undo the last framing edit and remeasure black bars from the player panel.

## 0.4.88

- Rebuild the player panel and popup around a vertical navigation rail. The player header groups power, move and close controls above a compact inspector.

## 0.4.87

- Choose a color preset from the player picture tab. Theater and Natural skin tones join the existing presets. Color presets preserve framing.

## 0.4.86

- Refresh the in-player settings panel and popup with a widescreen mark, clearer selected tabs and grouped controls. Move panel-position help below the primary settings.

## 0.4.85

- Keep standard YouTube DOM caption windows inside the player with an 8px margin when they overflow its edges. Preserve caption text, timing and accessibility attributes; video framing is unchanged by subtitle cues.
- Recheck on caption/layout changes and restore owned positioning when protection is no longer needed or the extension is disabled.
- Applies to standard separate YouTube captions that fit within the player. Burned-in subtitles, oversized captions and captions with a player-owned CSS translate are not covered.
- Chromium fixture passed bounds, resize, restoration, disable cleanup and text/ARIA preservation checks. Live YouTube verification remains pending.

## 0.4.84

- Preserve the current framing during waiting/buffering even without a seek event; resume layout when playback returns.
- Detect page/source changes during normal updates, so reused video elements cannot retain the previous video's detected bars when no metadata event arrives.
- Distinguish replacement MediaStreams by object identity even when currentSrc is empty, including focus/seek holds and per-video storage identity.
- Synthetic Chromium checks passed for buffering, pause, SPA navigation, stream replacement, seeking and focus recovery. Live platform and quality-switch behavior still requires confirmation.

## 0.4.83

- Preserve locked framing during seeking and a short settling period after seeking ends.
- Keep detected bars through same-source emptied/loadedmetadata events; reset them when metadata confirms a changed source or page.
- Repair overwritten owned styles during the seek hold before the next paint, using the existing bounded repair guard.
- Synthetic Chromium regression covers seek/buffering events and style resets; live YouTube seeking still needs confirmation.

## 0.4.82

- Include the focus-frame hold from 0.4.81.
- Keep manual controls visible but disabled in automatic mode, with instructions for enabling manual sizing.
- Keep color controls visible while disabled and explain neutral defaults. Explicit panel edits release the focus hold immediately.
- Real extension fixture verified color toggle, brightness application/removal, manual control visibility and manual zoom. Native Windows Alt+Tab remains pending user verification.

## 0.4.81

- Hold the current video framing throughout window blur or page hiding, instead of expiring after 1.2 seconds.
- Focus return no longer starts a zoom transition. Preserve the frame during a three-second return settling period; actual fullscreen changes while focused still recalculate layout.
- Restore overwritten owned styles in the mutation observer before the next paint during this hold (bounded to eight repairs to avoid fighting a player indefinitely).
- Preserve locked crop through same-source metadata events during the hold. Disabling the extension, navigation and video replacement still release ownership.
- Chromium regression covers a 1.8-second hidden player and a pre-paint style reset. Native Windows Alt+Tab and live YouTube remain unverified.

## 0.4.80

Alt+Tab / focus recovery now retains the selected video and locked black-bar crop during temporary hiding. Delayed player style resets update only the changed style baselines, avoiding compounded zoom. Unrelated player class changes no longer restart recovery. Focus return does not request fullscreen.

Refreshed the compact player panel, popup and settings page. Existing control IDs and storage contracts are retained. Optional edge-weighted stretch can fill internal and external horizontal gaps, capped at 1.6 times the source width; it uses a static map and does not capture video frames. It remains off by default and may add GPU cost or distortion.

Validation: 21 unit tests, three fullscreen enter/exit cycles with delayed style resets, temporary hiding/focus regression, UI layout checks, and rendered edge-stretch pixel checks passed. Native Windows Alt+Tab and live streaming sites still require confirmation. No photosensitivity safety guarantee is made.

## 0.4.79

- Add zero-default edge-weighted stretch using a static SVG displacement map generated only when settings or geometry change; it never captures video frames.
- Limit the first implementation to internal side gaps in `contain` layouts; disclose external-gap, GPU-cost and live-site compatibility limits.

## 0.4.78

- Reapply framing after fullscreen, theater, window focus and page visibility changes; rebase only when the player actually replaced Uwide-owned inline styles.
- Ease the framing transform over 240 ms during presentation changes and honor the operating system reduced-motion preference.

## 0.4.77

- Reconcile player panel triggers from the DOM and the internal registry so stale controls are removed when fullscreen or theater mode replaces the player control rail.

## 0.4.76

- Add a zero-default static SDR highlight curve to the popup, options and player panel.
- Keep it separate from true HDR output and include the setting in profiles and storage.

## 0.4.75

- Add a zero-default static SVG chroma curve as an approximation of selective vibrance.
- Avoid JavaScript video-frame capture; document possible color shifts, clipping and GPU cost.

## 0.4.74

- Add a static SVG shadow-recovery curve with a zero default.
- Clamp the 340 px player panel correctly on narrow viewports.
- Keep multi-category settings writes from overwriting one another.
- Validate fullscreen and automatic fitting without changing source frame rate.

## 0.4.73

- Fix settings-page desktop layout so the sticky sidebar and wide content render as two columns.
- Add optional static SVG sharpening with a zero default and avoid rewriting unchanged filter parameters.
- Merge multi-category settings writes to prevent one category from overwriting another in the same save.

## 0.4.72

- Reconcile inline and floating player controls so only one Uwide settings button remains for the active video.

## 0.4.71

- Refresh visual design across the player panel, popup and options page; use responsive flex columns for the options sidebar.
- Clarify remaining paid feature gaps and decisions.

## 0.4.71

- Remove stale player buttons when the active video changes.

## 0.4.71

- YouTube Shorts excluded from video framing and player controls.

# Değişiklikler

## 0.4.68

- Wuqqers geliştirici bilgisi, simgeler ve gizlilik belgesi.
- GitHub dağıtım paketi ve satışa izin vermeyen özel lisans.
- Gereksiz activeTab izni kaldırıldı; mevcut video mantığı korundu.

## 0.4.67

- Tam ekran geçişinde gecikmiş stil değişikliklerinden sınırlı otomatik toparlanma.

## 0.4.66

- Sekmeli oynatıcı paneli ve popup; kenar menülü tam ayarlar.
