import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";
import { CopyButton } from "./CopyButton";

type Mode = "encode" | "decode";

function utf8ToB64(s: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const out = btoa(bin);
  return urlSafe ? out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : out;
}

function b64ToUtf8(s: string, urlSafe: boolean): string {
  let input = s.trim().replace(/\s+/g, "");
  if (urlSafe) {
    input = input.replace(/-/g, "+").replace(/_/g, "/");
    while (input.length % 4) input += "=";
  }
  const bin = atob(input);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function Base64Tool() {
  const [mode, setMode] = React.useState<Mode>("encode");
  const [urlSafe, setUrlSafe] = React.useState(false);
  const [input, setInput] = React.useState("");

  const output = React.useMemo(() => {
    if (!input) return { ok: true as const, text: "" };
    try {
      const text =
        mode === "encode" ? utf8ToB64(input, urlSafe) : b64ToUtf8(input, urlSafe);
      return { ok: true as const, text };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [input, mode, urlSafe]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base64 Encoder / Decoder</CardTitle>
        <CardDescription>
          UTF-8 safe. Toggle URL-safe variant (replaces +/= and trims padding).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={mode === "encode" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("encode")}
          >
            Encode
          </Button>
          <Button
            variant={mode === "decode" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("decode")}
          >
            Decode
          </Button>
          <Button
            variant={urlSafe ? "default" : "outline"}
            size="sm"
            onClick={() => setUrlSafe((v) => !v)}
          >
            URL-safe: {urlSafe ? "on" : "off"}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (output.ok) {
                setInput(output.text);
                setMode((m) => (m === "encode" ? "decode" : "encode"));
              }
            }}
            disabled={!output.ok || !output.text}
          >
            Swap ↺
          </Button>
          {input && (
            <Button variant="ghost" size="sm" onClick={() => setInput("")}>
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {mode === "encode" ? "Plain text" : "Base64"}
            </label>
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
              rows={8}
              className="h-44 resize-y"
              spellCheck={false}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                {mode === "encode" ? "Base64" : "Plain text"}
              </label>
              {output.ok && output.text && (
                <CopyButton value={output.text} />
              )}
            </div>
            {output.ok ? (
              <Textarea
                readOnly
                value={output.text}
                rows={8}
                className="h-44 resize-y"
                spellCheck={false}
              />
            ) : (
              <div className="h-44 overflow-auto rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive font-mono">
                {output.error}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
