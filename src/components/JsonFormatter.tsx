import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";
import { CopyButton } from "./CopyButton";

type Result =
  | { ok: true; pretty: string; minified: string }
  | { ok: false; error: string };

function tryFormat(raw: string, indent: number | string): Result {
  if (!raw.trim()) return { ok: true, pretty: "", minified: "" };
  try {
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      pretty: JSON.stringify(parsed, null, indent),
      minified: JSON.stringify(parsed),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const INDENT_OPTIONS: { label: string; value: number | string }[] = [
  { label: "2", value: 2 },
  { label: "4", value: 4 },
  { label: "Tabs", value: "\t" },
];

export function JsonFormatter() {
  const [input, setInput] = React.useState("");
  const [indent, setIndent] = React.useState<number | string>(2);
  const result = React.useMemo(() => tryFormat(input, indent), [input, indent]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>JSON Formatter</CardTitle>
        <CardDescription>
          Paste JSON anywhere in the input — it formats automatically. Indent is configurable; minified output is also available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Indent:</span>
          {INDENT_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              variant={indent === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setIndent(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          <div className="flex-1" />
          {input && (
            <Button variant="ghost" size="sm" onClick={() => setInput("")}>
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Input
              </label>
              <span className="text-xs text-muted-foreground">
                Just paste — no button needed
              </span>
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text) {
                  e.preventDefault();
                  setInput(text);
                }
              }}
              placeholder='{"hello":"world"}'
              rows={16}
              className="h-72 resize-y"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                {result.ok ? "Formatted" : "Error"}
              </label>
              {result.ok && result.pretty && (
                <div className="flex gap-2">
                  <CopyButton value={result.pretty} label="Copy pretty" />
                  <CopyButton value={result.minified} label="Copy minified" />
                </div>
              )}
            </div>
            {result.ok ? (
              <Textarea
                readOnly
                value={result.pretty}
                placeholder="Formatted JSON appears here"
                rows={16}
                className="h-72 resize-y"
                spellCheck={false}
              />
            ) : (
              <div className="h-72 overflow-auto rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive font-mono">
                {result.error}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
