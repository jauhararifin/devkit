import * as React from "react";
import { diffLines, diffWordsWithSpace } from "diff";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";

type Mode = "line" | "word";

export function TextDiff({
  title = "Text Diff",
  description = "Compare two blocks of text. Switch between line and word diff.",
  leftDefault = "",
  rightDefault = "",
}: {
  title?: string;
  description?: string;
  leftDefault?: string;
  rightDefault?: string;
}) {
  const [left, setLeft] = React.useState(leftDefault);
  const [right, setRight] = React.useState(rightDefault);
  const [mode, setMode] = React.useState<Mode>("line");

  const parts = React.useMemo(() => {
    if (mode === "line") return diffLines(left, right);
    return diffWordsWithSpace(left, right);
  }, [left, right, mode]);

  const stats = React.useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const p of parts) {
      const count = mode === "line" ? (p.count ?? 0) : p.value.length;
      if (p.added) added += count;
      else if (p.removed) removed += count;
    }
    return { added, removed };
  }, [parts, mode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Mode:</span>
          <Button
            variant={mode === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("line")}
          >
            Line
          </Button>
          <Button
            variant={mode === "word" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("word")}
          >
            Word
          </Button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400">+{stats.added}</span>{" "}
            <span className="text-rose-600 dark:text-rose-400">-{stats.removed}</span>{" "}
            {mode === "line" ? "lines" : "chars"}
          </span>
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Original</label>
            <Textarea
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              rows={10}
              className="h-56 resize-y"
              spellCheck={false}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Changed</label>
            <Textarea
              value={right}
              onChange={(e) => setRight(e.target.value)}
              rows={10}
              className="h-56 resize-y"
              spellCheck={false}
            />
          </div>
        </div>
        <DiffPreview parts={parts} mode={mode} />
      </CardContent>
    </Card>
  );
}

function DiffPreview({
  parts,
  mode,
}: {
  parts: { value: string; added?: boolean; removed?: boolean }[];
  mode: Mode;
}) {
  if (parts.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        Enter text on both sides to see a diff.
      </div>
    );
  }
  if (mode === "word") {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-sm whitespace-pre-wrap break-words">
        {parts.map((p, i) => (
          <span
            key={i}
            className={
              p.added
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : p.removed
                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 line-through"
                  : ""
            }
          >
            {p.value}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-muted/30 font-mono text-xs overflow-auto max-h-[400px]">
      {parts.map((p, i) => {
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
            {ln || " "}
          </div>
        ));
      })}
    </div>
  );
}
