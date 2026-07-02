# Hooke v2 — Build Roadmap

Persistent spec. Phases ship sequentially; each phase ends with a working module.
Local-first by default (Zustand + IndexedDB). Lovable Cloud + AI Gateway used for
LLM/image/audio generation only.

---

## ✅ Phase 1 — Shell & Design System
- Hooke tokens, glass materials, cinematic palette
- Sidebar (collapsible on mobile), Topbar, root layout
- Dashboard with stat cards, hero, recent productions, activity, render status

## ✅ Phase 2 — Projects & Asset Library
- Project CRUD (create, duplicate, archive, favorite, delete) + persistence
- Asset Library: folders, drag/drop upload, kind filter, previews

## ✅ Phase 3 — miDirector Interview & Blueprint
- 6 strategy presets, 6-step interview chat
- Editable blueprint, scene CRUD, prompt templates, JSON export

## ✅ Phase 4 — miUniverse Spine
The persistent creative-OS layer every later module reads from.
- Universe CRUD (data model is the spine — built first by user direction)
- Characters · Locations · Props · Vehicles
- Lore entries · Timeline events
- Voice profiles · Music themes
- Brand kit (colors, fonts, logo, intro/outro, watermark, CTA)
- Cross-project reuse

## Phase 5 — miDirector AI Brain (real LLM)
- Wire chat to Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Project- and universe-aware system prompt
- Script generate / rewrite / expand / shorten
- Hooks, CTAs, SEO, platform-specific rewrites
- Script version history

## ✅ Phase 6 — Character Studio & Consistency Engine
- Persistent character sheets (face, hair, outfit, height, build, voice, personality)
- Character Library with search + style filter (cross-project)
- Reference-image pinning with primary selection + kind tagging
- Character color palette for costume/scene consistency
- Universe linking + tag system
- Duplicate, edit, delete CRUD
- 8 visual styles (cinematic, comic, anime, pixar, watercolor, noir, retro, realistic)

## ✅ Phase 7 — miStory (Flagship)
- Input modes: Script → Story · Image → Story · Idea → Story
- Story templates (Motivational, Kids, Horror, Doc, Sci-Fi, …)
- Story styles (Comic, Anime, Pixar-style, Watercolor, …)
- Scene generator (single/multi/regen/merge/split)
- Story Memory continuity tracking

## ✅ Phase 8 — Storyboard
- Visual storyboard from blueprint scenes
- Camera angle / movement / shot duration / notes
- Inline regenerate per panel

## ✅ Phase 9 — Motion & Voice & Music
- Motion generator (zoom, pan, parallax, push/pull, blur)
- Smart Narration (TTS via `openai/gpt-4o-mini-tts`) with emotion/speed/pitch
- AI Music selector
- Smart SFX suggestions

## ✅ Phase 10 — Timeline Editor
- Multi-track timeline (video, voice, music, SFX, captions)
- Clip CRUD: add, move, trim (drag handles), split at playhead, remove
- Transitions: cut, crossfade, dissolve, wipe (video track)
- Captions track with text editing + style presets (static, dynamic, karaoke, animated)
- Markers: add/rename/reposition/remove with color flags
- Track controls: mute, hide, lock per track
- Transport bar: play/pause, skip to start/end, timecode display
- Zoom control (pixels-per-second slider + buttons)
- Undo/redo with 50-step history stack
- Project selector + rename + delete
- Auto-persists to IndexedDB

## Phase 11 — Render Queue
- Queue UI: multi-render, pause/resume/retry, logs, notifications

## Phase 12 — Publish & Analytics
- Publish to YouTube / TikTok / Instagram / Facebook / LinkedIn / X
- Scheduling
- Analytics: views, watch time, engagement, render stats

## Phase 13 — Settings & Polish
- AI providers, themes, account, storage, plugins, shortcuts
- Onboarding, empty states, accessibility pass
