# devkit

Single-page, fully offline web app of everyday software-engineering utilities. No backend. Static bundle deployable as plain files.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS **v3** (not v4 — keep `tailwind.config.js` + `postcss.config.js`, classic `@tailwind base/components/utilities` in `src/index.css`)
- `diff` for text/JSON diffing, `clsx` + `tailwind-merge` via `cn()` in `src/lib/utils.ts`
- No shadcn CLI. UI primitives in `src/components/ui/` are hand-written in the shadcn aesthetic. Colors come from the token list in `tailwind.config.js` (`background`, `foreground`, `muted`, `border`, `primary`, `accent`, `destructive`, `card`, ...). Use those tokens, not raw `gray-500` etc.

## Build / run

- `npm run dev` — Vite dev server on 5173
- `npm run build` — typechecks (`tsc -b`) and emits `dist/`. Output is the offline artifact. Treat a green build as the bar before declaring a task done.

## Layout

```
src/
  App.tsx                       # registers tools in `sections` array
  components/
    ui/{button,card,input,tabs}.tsx
    CopyButton.tsx
    UnixTimestamp.tsx
    JsonFormatter.tsx
    TextDiff.tsx
    JsonDiff.tsx
    Base64Tool.tsx
  lib/utils.ts                  # cn()
  index.css
```

`input.tsx` exports both `Input` and `Textarea` — that's intentional, don't split unless there's a real reason.

## Adding a new tool

1. Create `src/components/<Name>.tsx`. Export a single component.
2. Wrap UI in `<Card>` → `<CardHeader>` (`<CardTitle>` + `<CardDescription>`) → `<CardContent className="space-y-3">`. This is the shared shell — match the existing tools so spacing/typography stays consistent.
3. Register it in `sections` at the top of `src/App.tsx`:
   ```tsx
   { id: "kebab-id", label: "Short Label", node: <NewTool /> }
   ```
   The "All" tab and the per-tool tab fall out of that array automatically. Order in the array = render order.
4. For the title bar in `<CardHeader>`, write a one-line description that says what the tool does AND how to use it (auto-run hint, paste behavior, etc.).

## Project conventions (the things that aren't obvious from reading code)

- **Paste auto-runs.** For any input the user is likely to paste into (JSON, timestamps, base64, diff sides), attach an `onPaste` that calls `e.preventDefault()` and sets state to the pasted text. The user explicitly asked for this — don't make them click a "Format" button. Computation goes in a `useMemo` over the input, so updating state is enough.
- **No submit buttons for parsing.** Reactively re-derive the output via `useMemo`. Show errors inline beside the relevant textarea (small `text-destructive`), not in a modal/toast.
- **Copy everything that looks copyable.** Use `<CopyButton value={...} />`. Each "result field" gets its own copy button. For per-row layouts, use the `RowField` pattern from `UnixTimestamp.tsx` (label + value + copy on the right).
- **Two-column input/output.** Tools with an input and a derived output use `grid grid-cols-1 gap-3 md:grid-cols-2`. Textareas are `h-44` to `h-72` with `resize-y` — keep them generous; this is a power-user tool.
- **Diff rendering.** Both `TextDiff` and `JsonDiff` use the same +/- gutter style (emerald for added, rose for removed, `bg-{color}/15`). If you add another diff view, reuse that visual language — don't invent a new color scheme.
- **No external network calls, ever.** Everything must work with the tab in airplane mode. No CDN fonts, no remote APIs. Bundle anything you need.
- **Don't add a router.** It's deliberately one page with tabs + anchor links. If a tool grows large, split its internals into sub-components inside the same file before reaching for routes.
- **No comments unless the why is non-obvious.** Existing tools have almost none — match that. Self-explanatory code, descriptive names.

## Gotchas

- Tailwind config `content` globs only `./index.html` and `./src/**/*.{ts,tsx}`. New files outside `src/` won't get their classes picked up.
- `JSON.stringify`'s `space` arg accepts a number OR a string (used for tabs in `JsonFormatter.tsx`). Type the indent state as `number | string` if you copy that pattern.
- `btoa`/`atob` only handle Latin-1. For UTF-8, encode through `TextEncoder` first — see `utf8ToB64` in `Base64Tool.tsx`. Don't regress this when adding more encoders.
- The unix timestamp parser uses magnitude heuristics for s/ms/µs/ns. If you add another numeric input that needs the same logic, factor `parseTimestamp` out rather than re-implementing the thresholds.
- `Tabs` is a custom mini-impl in `components/ui/tabs.tsx` — no Radix. It supports both controlled (`value` + `onValueChange`) and uncontrolled (`defaultValue`). If you need more from it (keyboard nav, indicators), extend it in place rather than swapping libraries.
