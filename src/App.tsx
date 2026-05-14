import { UnixTimestamp } from "./components/UnixTimestamp";
import { JsonFormatter } from "./components/JsonFormatter";
import { TextDiff } from "./components/TextDiff";
import { JsonDiff } from "./components/JsonDiff";
import { Base64Tool } from "./components/Base64Tool";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";

const sections = [
  { id: "timestamp", label: "Timestamp", node: <UnixTimestamp /> },
  { id: "json-format", label: "JSON Format", node: <JsonFormatter /> },
  { id: "text-diff", label: "Text Diff", node: <TextDiff /> },
  { id: "json-diff", label: "JSON Diff", node: <JsonDiff /> },
  { id: "base64", label: "Base64", node: <Base64Tool /> },
];

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">devkit</h1>
            <p className="text-sm text-muted-foreground">
              Everyday software-engineering utilities. Offline. No backend.
            </p>
          </div>
          <nav className="hidden md:flex flex-wrap gap-2 text-xs text-muted-foreground">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md border border-border bg-background px-2 py-1 hover:bg-accent"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </header>

        <Tabs defaultValue="all" className="mb-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            {sections.map((s) => (
              <TabsTrigger key={s.id} value={s.id}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-4">
                {s.node}
              </section>
            ))}
          </TabsContent>

          {sections.map((s) => (
            <TabsContent key={s.id} value={s.id}>
              {s.node}
            </TabsContent>
          ))}
        </Tabs>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Tip: paste directly into the JSON formatter or timestamp converter — they auto-run.
        </footer>
      </div>
    </div>
  );
}
