import * as React from "react";
import { diffLines } from "diff";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = sortKeys(obj[k]);
    return out;
  }
  return value;
}

type Norm =
  | { ok: true; text: string }
  | { ok: false; error: string };

function normalize(raw: string, sort: boolean): Norm {
  if (!raw.trim()) return { ok: true, text: "" };
  try {
    const parsed = JSON.parse(raw);
    const final = sort ? sortKeys(parsed) : parsed;
    return { ok: true, text: JSON.stringify(final, null, 2) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function JsonDiff() {
  const [left, setLeft] = React.useState("");
  const [right, setRight] = React.useState("");
  const [sortKeysOn, setSortKeysOn] = React.useState(true);

  const ln = React.useMemo(() => normalize(left, sortKeysOn), [left, sortKeysOn]);
  const rn = React.useMemo(() => normalize(right, sortKeysOn), [right, sortKeysOn]);

  const parts = React.useMemo(() => {
    if (!ln.ok || !rn.ok) return null;
    return diffLines(ln.text, rn.text);
  }, [ln, rn]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>JSON Diff</CardTitle>
        <CardDescription>
          Parses both inputs, optionally sorts keys, then shows a line diff of the canonical form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={sortKeysOn ? "default" : "outline"}
            size="sm"
            onClick={() => setSortKeysOn((v) => !v)}
          >
            Sort keys: {sortKeysOn ? "on" : "off"}
          </Button>
          <div className="flex-1" />
          {(left || right) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLeft("");
                setRight("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Side
            label="Original JSON"
            value={left}
            setValue={setLeft}
            error={ln.ok ? null : ln.error}
          />
          <Side
            label="Changed JSON"
            value={right}
            setValue={setRight}
            error={rn.ok ? null : rn.error}
          />
        </div>
        {parts && (
          <div className="rounded-md border border-border bg-muted/30 font-mono text-xs overflow-auto max-h-[480px]">
            {parts.length === 0 ||
            (parts.length === 1 && !parts[0].added && !parts[0].removed) ? (
              <div className="px-3 py-2 text-muted-foreground">
                {!left && !right ? "Enter JSON on both sides." : "No differences."}
              </div>
            ) : (
              parts.map((p, i) => {
                const lines = p.value.replace(/\n$/, "").split("\n");
                return lines.map((ln, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={
                      "px-3 py-0.5 whitespace-pre " +
                      (p.added
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : p.removed
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : "")
                    }
                  >
                    <span className="select-none mr-2 text-muted-foreground">
                      {p.added ? "+" : p.removed ? "-" : " "}
                    </span>
                    {ln || " "}
                  </div>
                ));
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Side({
  label,
  value,
  setValue,
  error,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {error && (
          <span className="text-xs text-destructive truncate ml-2">{error}</span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text) {
            e.preventDefault();
            setValue(text);
          }
        }}
        rows={10}
        className="h-56 resize-y"
        spellCheck={false}
        placeholder='{"hello":"world"}'
      />
    </div>
  );
}
