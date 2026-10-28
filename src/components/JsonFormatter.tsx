import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";
import { CopyButton } from "./CopyButton";

type JsonNode =
  | { type: "object"; entries: JsonEntry[] }
  | { type: "array"; items: JsonNode[] }
  | { type: "string"; raw: string; value: string }
  | { type: "number"; raw: string }
  | { type: "boolean"; value: boolean }
  | { type: "null" };

type JsonEntry = {
  key: string;
  rawKey: string;
  value: JsonNode;
};

type ParseResult =
  | { ok: true; node: JsonNode }
  | { ok: false; error: string };

type Result =
  | {
      ok: true;
      pretty: string;
      minified: string;
      node: JsonNode | null;
      convertedCount: number;
    }
  | { ok: false; error: string };

// Number tokens stay as text so 64-bit IDs and other large integers keep their exact digits.
function parseJson(src: string): ParseResult {
  const n = src.length;
  let i = 0;

  const isDigit = (c: string) => c >= "0" && c <= "9";

  function fail(message: string): never {
    throw new Error(`${message} at position ${i}`);
  }

  function skipWhitespace() {
    while (i < n) {
      const c = src[i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") i++;
      else break;
    }
  }

  function readString(): { raw: string; value: string } {
    const start = i;
    i++;

    while (i < n) {
      const c = src[i];
      if (c === '"') {
        i++;
        const raw = src.slice(start, i);
        try {
          return { raw, value: JSON.parse(raw) as string };
        } catch {
          return fail("Invalid string");
        }
      }
      if (c === "\\") {
        if (i + 1 >= n) fail("Unterminated escape");
        i += 2;
      } else {
        i++;
      }
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

  function parseObject(): JsonNode {
    i++;
    const entries: JsonEntry[] = [];
    skipWhitespace();

    if (src[i] === "}") {
      i++;
      return { type: "object", entries };
    }

    while (i < n) {
      if (src[i] !== '"') fail("Expected string key");
      const key = readString();
      skipWhitespace();
      if (src[i] !== ":") fail("Expected ':'");
      i++;

      const value = parseValue();
      entries.push({ key: key.value, rawKey: key.raw, value });
      skipWhitespace();

      if (src[i] === "}") {
        i++;
        return { type: "object", entries };
      }
      if (src[i] !== ",") fail("Expected ',' or '}'");
      i++;
      skipWhitespace();
      if (src[i] === "}") fail("Expected string key");
    }

    return fail("Expected '}'");
  }

  function parseArray(): JsonNode {
    i++;
    const items: JsonNode[] = [];
    skipWhitespace();

    if (src[i] === "]") {
      i++;
      return { type: "array", items };
    }

    while (i < n) {
      items.push(parseValue());
      skipWhitespace();

      if (src[i] === "]") {
        i++;
        return { type: "array", items };
      }
      if (src[i] !== ",") fail("Expected ',' or ']'");
      i++;
      skipWhitespace();
      if (src[i] === "]") fail("Unexpected trailing comma");
    }

    return fail("Expected ']'");
  }

  function parseValue(): JsonNode {
    skipWhitespace();
    if (i >= n) fail("Unexpected end of input");

    const c = src[i];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') {
      const value = readString();
      return { type: "string", raw: value.raw, value: value.value };
    }
    if (c === "-" || isDigit(c)) {
      return { type: "number", raw: readNumber() };
    }
    if (src.startsWith("true", i)) {
      i += 4;
      return { type: "boolean", value: true };
    }
    if (src.startsWith("false", i)) {
      i += 5;
      return { type: "boolean", value: false };
    }
    if (src.startsWith("null", i)) {
      i += 4;
      return { type: "null" };
    }

    return fail(`Unexpected character '${c}'`);
  }

  try {
    const node = parseValue();
    skipWhitespace();
    if (i < n) fail("Unexpected trailing characters");
    return { ok: true, node };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

function decodeJsonStrings(node: JsonNode): { node: JsonNode; count: number } {
  if (node.type === "string") {
    const parsed = parseJson(node.value);
    if (parsed.ok && (parsed.node.type === "object" || parsed.node.type === "array")) {
      const decoded = decodeJsonStrings(parsed.node);
      return { node: decoded.node, count: decoded.count + 1 };
    }
    return { node, count: 0 };
  }

  if (node.type === "array") {
    let count = 0;
    const items = node.items.map((item) => {
      const decoded = decodeJsonStrings(item);
      count += decoded.count;
      return decoded.node;
    });
    return { node: { type: "array", items }, count };
  }

  if (node.type === "object") {
    let count = 0;
    const entries = node.entries.map((entry) => {
      const decoded = decodeJsonStrings(entry.value);
      count += decoded.count;
      return { ...entry, value: decoded.node };
    });
    return { node: { type: "object", entries }, count };
  }

  return { node, count: 0 };
}

function stringifyNode(
  node: JsonNode,
  indent: number | string,
  pretty: boolean,
): string {
  const indentString = typeof indent === "number" ? " ".repeat(indent) : indent;

  function render(value: JsonNode, depth: number): string {
    if (value.type === "string" || value.type === "number") return value.raw;
    if (value.type === "boolean") return String(value.value);
    if (value.type === "null") return "null";

    const open = value.type === "object" ? "{" : "[";
    const close = value.type === "object" ? "}" : "]";
    const children =
      value.type === "object"
        ? value.entries.map(
            (entry) =>
              `${entry.rawKey}${pretty ? ": " : ":"}${render(entry.value, depth + 1)}`,
          )
        : value.items.map((item) => render(item, depth + 1));

    if (children.length === 0) return open + close;
    if (!pretty) return `${open}${children.join(",")}${close}`;

    const childIndent = indentString.repeat(depth + 1);
    const closingIndent = indentString.repeat(depth);
    return `${open}\n${children
      .map((child) => childIndent + child)
      .join(",\n")}\n${closingIndent}${close}`;
  }

  return render(node, 0);
}

function tryFormat(
  raw: string,
  indent: number | string,
  parseJsonStrings: boolean,
): Result {
  if (!raw.trim()) {
    return {
      ok: true,
      pretty: "",
      minified: "",
      node: null,
      convertedCount: 0,
    };
  }

  const parsed = parseJson(raw);
  if (!parsed.ok) return parsed;

  const decoded = parseJsonStrings
    ? decodeJsonStrings(parsed.node)
    : { node: parsed.node, count: 0 };

  return {
    ok: true,
    pretty: stringifyNode(decoded.node, indent, true),
    minified: stringifyNode(decoded.node, indent, false),
    node: decoded.node,
    convertedCount: decoded.count,
  };
}

const INDENT_OPTIONS: { label: string; value: number | string }[] = [
  { label: "2", value: 2 },
  { label: "4", value: 4 },
  { label: "Tabs", value: "\t" },
];

export function JsonFormatter() {
  const [input, setInput] = React.useState("");
  const [indent, setIndent] = React.useState<number | string>(2);
  const [parseJsonStrings, setParseJsonStrings] = React.useState(false);
  const result = React.useMemo(
    () => tryFormat(input, indent, parseJsonStrings),
    [input, indent, parseJsonStrings],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>JSON Formatter</CardTitle>
        <CardDescription>
          Paste JSON to format it and browse collapsible objects and arrays. Optionally decode JSON stored inside strings recursively.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Indent:</span>
          {INDENT_OPTIONS.map((option) => (
            <Button
              key={option.label}
              variant={indent === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setIndent(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Button
            variant={parseJsonStrings ? "default" : "outline"}
            size="sm"
            aria-pressed={parseJsonStrings}
            title="Convert string values containing JSON objects or arrays into navigable JSON"
            onClick={() => setParseJsonStrings((value) => !value)}
          >
            Decode JSON strings: {parseJsonStrings ? "on" : "off"}
          </Button>
          <div className="flex-1" />
          {input && (
            <Button variant="ghost" size="sm" onClick={() => setInput("")}>
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex min-h-8 items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Input
              </label>
              <span className="text-xs text-muted-foreground">
                Just paste — no button needed
              </span>
            </div>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text");
                if (text) {
                  event.preventDefault();
                  const textarea = event.currentTarget;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const cursor = start + text.length;

                  setInput((value) =>
                    `${value.slice(0, start)}${text}${value.slice(end)}`,
                  );
                  requestAnimationFrame(() => {
                    textarea.setSelectionRange(cursor, cursor);
                  });
                }
              }}
              placeholder='{"hello":"world"}'
              rows={16}
              className="h-[32rem] resize-y"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {result.ok ? "Interactive result" : "Error"}
                </span>
                {result.ok && result.convertedCount > 0 && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {result.convertedCount} JSON {result.convertedCount === 1 ? "string" : "strings"} decoded
                  </span>
                )}
              </div>
              {result.ok && result.pretty && (
                <div className="flex gap-2">
                  <CopyButton value={result.pretty} label="Copy pretty" />
                  <CopyButton value={result.minified} label="Copy minified" />
                </div>
              )}
            </div>
            {result.ok ? (
              result.node ? (
                <JsonTree
                  key={`${parseJsonStrings}:${result.minified}`}
                  node={result.node}
                />
              ) : (
                <div className="flex h-[32rem] items-start rounded-md border border-input bg-background p-3 font-mono text-sm text-muted-foreground shadow-sm">
                  Formatted JSON appears here
                </div>
              )
            ) : (
              <div className="h-[32rem] overflow-auto rounded-md border border-destructive bg-destructive/5 p-3 font-mono text-sm text-destructive">
                {result.error}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JsonTree({ node }: { node: JsonNode }) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const containerPaths = React.useMemo(() => {
    const paths: string[] = [];
    collectContainerPaths(node, "$", paths);
    return paths;
  }, [node]);

  const toggle = React.useCallback((path: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <div className="h-[32rem] min-h-40 resize-y overflow-auto rounded-md border border-input bg-background font-mono text-xs shadow-sm">
      <div className="sticky left-0 top-0 z-10 flex min-w-full items-center justify-between gap-2 border-b border-border bg-background px-2 py-1">
        <span className="text-[10px] text-muted-foreground">
          Use the arrows to fold individual values
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={containerPaths.length === 0}
            onClick={() => setCollapsed(new Set())}
          >
            Expand all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={containerPaths.length === 0}
            onClick={() => setCollapsed(new Set(containerPaths))}
          >
            Collapse all
          </Button>
        </div>
      </div>
      <div className="min-w-max p-3 pt-2 leading-5">
        <JsonTreeNode
          node={node}
          path="$"
          depth={0}
          trailingComma={false}
          collapsed={collapsed}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}

function JsonTreeNode({
  node,
  path,
  label,
  depth,
  trailingComma,
  collapsed,
  onToggle,
}: {
  node: JsonNode;
  path: string;
  label?: string;
  depth: number;
  trailingComma: boolean;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
}) {
  const containerSize =
    node.type === "object"
      ? node.entries.length
      : node.type === "array"
        ? node.items.length
        : 0;
  const isContainer = node.type === "object" || node.type === "array";
  const canCollapse = isContainer && containerSize > 0;
  const isCollapsed = canCollapse && collapsed.has(path);
  const open = node.type === "object" ? "{" : "[";
  const close = node.type === "object" ? "}" : "]";
  const comma = trailingComma ? "," : "";
  const padding = { paddingLeft: `${depth * 1.25}rem` };
  const targetName = label ?? (path === "$" ? "root value" : "array item");
  const labelNode = label ? (
    <>
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground">: </span>
    </>
  ) : null;

  if (!canCollapse) {
    return (
      <div className="flex min-w-max items-start" style={padding}>
        <span className="inline-block h-5 w-4 shrink-0" />
        <span className="whitespace-pre">
          {labelNode}
          {isContainer ? (
            <span>{open + close}</span>
          ) : (
            <JsonPrimitive node={node} />
          )}
          {comma}
        </span>
      </div>
    );
  }

  if (isCollapsed) {
    const unit = node.type === "object" ? "key" : "item";
    return (
      <div className="flex min-w-max items-start" style={padding}>
        <TreeToggle
          expanded={false}
          label={`Expand ${targetName}`}
          onClick={() => onToggle(path)}
        />
        <span className="whitespace-pre">
          {labelNode}
          <span>{open}</span>
          <span className="text-muted-foreground">…</span>
          <span>{close}</span>
          {comma}
          <span className="ml-2 select-none text-[10px] text-muted-foreground">
            {containerSize} {unit}{containerSize === 1 ? "" : "s"}
          </span>
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-w-max items-start" style={padding}>
        <TreeToggle
          expanded
          label={`Collapse ${targetName}`}
          onClick={() => onToggle(path)}
        />
        <span className="whitespace-pre">
          {labelNode}
          {open}
        </span>
      </div>
      {node.type === "object"
        ? node.entries.map((entry, index) => (
            <JsonTreeNode
              key={`${path}.o${index}`}
              node={entry.value}
              path={`${path}.o${index}`}
              label={entry.rawKey}
              depth={depth + 1}
              trailingComma={index < node.entries.length - 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))
        : node.items.map((item, index) => (
            <JsonTreeNode
              key={`${path}.a${index}`}
              node={item}
              path={`${path}.a${index}`}
              depth={depth + 1}
              trailingComma={index < node.items.length - 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
      <div className="flex min-w-max items-start" style={padding}>
        <span className="inline-block h-5 w-4 shrink-0" />
        <span className="whitespace-pre">{close + comma}</span>
      </div>
    </>
  );
}

function JsonPrimitive({ node }: { node: JsonNode }) {
  if (node.type === "string") {
    return <span className="text-muted-foreground">{node.raw}</span>;
  }
  if (node.type === "number") return <span>{node.raw}</span>;
  if (node.type === "boolean") {
    return <span className="font-medium">{String(node.value)}</span>;
  }
  if (node.type === "null") {
    return <span className="font-medium text-muted-foreground">null</span>;
  }
  return null;
}

function TreeToggle({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-5 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
    </button>
  );
}

function collectContainerPaths(node: JsonNode, path: string, paths: string[]) {
  if (node.type === "object") {
    if (node.entries.length > 0) paths.push(path);
    node.entries.forEach((entry, index) =>
      collectContainerPaths(entry.value, `${path}.o${index}`, paths),
    );
  } else if (node.type === "array") {
    if (node.items.length > 0) paths.push(path);
    node.items.forEach((item, index) =>
      collectContainerPaths(item, `${path}.a${index}`, paths),
    );
  }
}
