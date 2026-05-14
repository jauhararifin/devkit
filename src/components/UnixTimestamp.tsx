import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { CopyButton } from "./CopyButton";

function formatLocal(d: Date) {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const tzMin = -d.getTimezoneOffset();
  const sign = tzMin >= 0 ? "+" : "-";
  const tzH = pad(Math.floor(Math.abs(tzMin) / 60));
  const tzM = pad(Math.abs(tzMin) % 60);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ` +
    `UTC${sign}${tzH}:${tzM}`
  );
}

function formatUTC(d: Date) {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ` +
    `UTC+00:00`
  );
}

function formatISO(d: Date) {
  return d.toISOString();
}

function parseTimestamp(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    // Heuristic: <= 1e11 → seconds, otherwise ms (also handles micro/nano roughly)
    let ms: number;
    if (Math.abs(n) < 1e11) ms = n * 1000;
    else if (Math.abs(n) < 1e14) ms = n;
    else if (Math.abs(n) < 1e17) ms = n / 1000; // microseconds
    else ms = n / 1_000_000; // nanoseconds
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export function UnixTimestamp() {
  const [now, setNow] = React.useState(() => new Date());
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-parse on paste handled via onChange below
  const parsed = parseTimestamp(input);

  const nowSec = Math.floor(now.getTime() / 1000);
  const nowMs = now.getTime();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unix Timestamp</CardTitle>
        <CardDescription>
          Live clock plus parser. Paste a unix value (s/ms/µs/ns) or an ISO string — it converts automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <RowField label="Now (seconds)" value={String(nowSec)} mono />
          <RowField label="Now (milliseconds)" value={String(nowMs)} mono />
          <RowField label="Local time" value={formatLocal(now)} mono />
          <RowField label="UTC time" value={formatUTC(now)} mono />
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Convert timestamp</label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInput(String(nowSec))}
              >
                Use now (s)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInput(String(nowMs))}
              >
                Use now (ms)
              </Button>
              {input && (
                <Button variant="ghost" size="sm" onClick={() => setInput("")}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          <Input
            ref={inputRef}
            value={input}
            placeholder="Paste timestamp (1717171717, 1717171717000) or ISO date"
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (text) {
                e.preventDefault();
                setInput(text.trim());
              }
            }}
            className="font-mono"
          />
          {input && !parsed && (
            <p className="text-xs text-destructive">Could not parse value.</p>
          )}
          {parsed && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 pt-2">
              <RowField label="Seconds" value={String(Math.floor(parsed.getTime() / 1000))} mono />
              <RowField label="Milliseconds" value={String(parsed.getTime())} mono />
              <RowField label="Local" value={formatLocal(parsed)} mono />
              <RowField label="UTC" value={formatUTC(parsed)} mono />
              <RowField label="ISO 8601" value={formatISO(parsed)} mono />
              <RowField label="Relative" value={relativeFromNow(parsed, now)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RowField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`truncate ${mono ? "font-mono text-sm" : "text-sm"}`}>
          {value}
        </div>
      </div>
      <CopyButton value={value} />
    </div>
  );
}

function relativeFromNow(d: Date, now: Date) {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const future = diff > 0;
  const units: [number, string][] = [
    [1000, "second"],
    [60 * 1000, "minute"],
    [60 * 60 * 1000, "hour"],
    [24 * 60 * 60 * 1000, "day"],
    [30 * 24 * 60 * 60 * 1000, "month"],
    [365 * 24 * 60 * 60 * 1000, "year"],
  ];
  let chosen = units[0];
  for (let i = units.length - 1; i >= 0; i--) {
    if (abs >= units[i][0]) {
      chosen = units[i];
      break;
    }
  }
  const v = Math.round(abs / chosen[0]);
  const u = v === 1 ? chosen[1] : chosen[1] + "s";
  return future ? `in ${v} ${u}` : `${v} ${u} ago`;
}
