import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";
import { CopyButton } from "./CopyButton";

type Result =
  | { ok: true; pretty: string; minified: string }
  | { ok: false; error: string };

// We format directly from the source text instead of round-tripping through
// JSON.parse/JSON.stringify so integers beyond Number.MAX_SAFE_INTEGER (e.g.
// 64-bit IDs) keep their exact digits — JS numbers would silently lose them.
function tryFormat(raw: string, indent: number | string): Result {
  if (!raw.trim()) return { ok: true, pretty: "", minified: "" };

  const indentStr = typeof indent === "number" ? " ".repeat(indent) : indent;
  const src = raw;
  const n = src.length;
  let i = 0;
  let pretty = "";
  let minified = "";
  let depth = 0;

  const isDigit = (c: string) => c >= "0" && c <= "9";

  function fail(msg: string): never {
    throw new Error(`${msg} at position ${i}`);
  }

  function skipWs() {
    while (i < n) {
      const c = src[i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") i++;
      else break;
    }
  }

  function emitIndent() {
    pretty += "\n" + indentStr.repeat(depth);
  }

  function readString(): string {
    const start = i;
    i++; // opening quote
    while (i < n) {
      const c = src[i];
      if (c === '"') {
        i++;
        return src.slice(start, i);
      }
      if (c === "\\") {
        if (i + 1 >= n) fail("Unterminated escape");
        i += 2;
        continue;
      }
      if (c === "\n" || c === "\r") fail("Unterminated string");
      i++;
    }
    return fail("Unterminated string");
  }

  function readNumber(): string {
    const start = i;
    if (src[i] === "-") i++;
    if (i >= n) fail("Invalid number");
    if (src[i] === "0") {
      i++;
    } else if (src[i] >= "1" && src[i] <= "9") {
      while (i < n && isDigit(src[i])) i++;
    } else {
      fail("Invalid number");
    }
    if (i < n && src[i] === ".") {
      i++;
      if (!(i < n && isDigit(src[i]))) fail("Invalid number");
      while (i < n && isDigit(src[i])) i++;
    }
    if (i < n && (src[i] === "e" || src[i] === "E")) {
      i++;
      if (i < n && (src[i] === "+" || src[i] === "-")) i++;
      if (!(i < n && isDigit(src[i]))) fail("Invalid number");
      while (i < n && isDigit(src[i])) i++;
    }
    return src.slice(start, i);
  }

  function parseValue() {
    skipWs();
    if (i >= n) fail("Unexpected end of input");
    const c = src[i];
    if (c === "{") {
      i++;
      pretty += "{";
      minified += "{";
      depth++;
      skipWs();
      let first = true;
      while (i < n && src[i] !== "}") {
        if (!first) {
          if (src[i] !== ",") fail("Expected ',' or '}'");
          i++;
          pretty += ",";
          minified += ",";
          skipWs();
        }
        first = false;
        emitIndent();
        if (src[i] !== '"') fail("Expected string key");
        const key = readString();
        pretty += key;
        minified += key;
        skipWs();
        if (src[i] !== ":") fail("Expected ':'");
        i++;
        pretty += ": ";
        minified += ":";
        parseValue();
        skipWs();
      }
      if (i >= n) fail("Expected '}'");
      i++;
      depth--;
      if (!first) emitIndent();
      pretty += "}";
      minified += "}";
    } else if (c === "[") {
      i++;
      pretty += "[";
      minified += "[";
      depth++;
      skipWs();
      let first = true;
      while (i < n && src[i] !== "]") {
        if (!first) {
          if (src[i] !== ",") fail("Expected ',' or ']'");
          i++;
          pretty += ",";
          minified += ",";
          skipWs();
        }
        first = false;
        emitIndent();
        parseValue();
        skipWs();
      }
      if (i >= n) fail("Expected ']'");
      i++;
      depth--;
      if (!first) emitIndent();
      pretty += "]";
      minified += "]";
    } else if (c === '"') {
      const s = readString();
      pretty += s;
      minified += s;
    } else if (c === "-" || isDigit(c)) {
      const num = readNumber();
      pretty += num;
      minified += num;
    } else if (src.startsWith("true", i)) {
      pretty += "true";
      minified += "true";
      i += 4;
    } else if (src.startsWith("false", i)) {
      pretty += "false";
      minified += "false";
      i += 5;
    } else if (src.startsWith("null", i)) {
      pretty += "null";
      minified += "null";
      i += 4;
    } else {
      fail(`Unexpected character '${c}'`);
    }
  }

  try {
    parseValue();
    skipWs();
    if (i < n) fail("Unexpected trailing characters");
    return { ok: true, pretty, minified };
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
