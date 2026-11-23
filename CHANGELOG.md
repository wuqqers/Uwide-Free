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
