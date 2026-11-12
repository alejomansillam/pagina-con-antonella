import { useState, type ReactNode } from "react";
import { ZoomIn } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";


function inline(text: string, keyBase: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g)
    .map((chunk, i) => {
      const key = `${keyBase}-${i}`;
      if (chunk.startsWith("**") && chunk.endsWith("**")) {
        return <strong key={key}>{chunk.slice(2, -2)}</strong>;
      }
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(chunk);
      if (link) {
        return (
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium underline decoration-accent/60 underline-offset-2 hover:decoration-accent"
          >
            {link[1]}
          </a>
        );
      }
      return <span key={key}>{chunk}</span>;
    });
}

/** Renders the light markdown used by knowledge base articles. */
export function ArticleBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={`${key}-li-${i}`}>{inline(item, `${key}-${i}`)}</li>);
    blocks.push(
      list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>,
    );
    list = null;
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    const key = `b-${index}`;

    if (!line) {
      flushList(`${key}-list`);
      return;
    }
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line);
    if (image) {
      flushList(`${key}-list`);
      blocks.push(<ZoomableImage key={key} src={image[2]!} alt={image[1] ?? ""} />);

      return;
    }
    if (line.startsWith("### ")) {
      flushList(`${key}-list`);
      blocks.push(<h3 key={key}>{inline(line.slice(4), key)}</h3>);
      return;
    }
    if (line.startsWith("## ")) {
      flushList(`${key}-list`);
      blocks.push(<h2 key={key}>{inline(line.slice(3), key)}</h2>);
      return;
    }
    const ordered = /^\d+\.\s/.test(line);
    const bulleted = line.startsWith("- ");
    if (ordered || bulleted) {
      const content = ordered ? line.replace(/^\d+\.\s/, "") : line.slice(2);
      if (!list || list.ordered !== ordered) {
        flushList(`${key}-list`);
        list = { ordered, items: [] };
      }
      list.items.push(content);
      return;
    }
    flushList(`${key}-list`);
    blocks.push(<p key={key}>{inline(line, key)}</p>);
  });
  flushList("tail-list");

  return <div className="prose-article text-[0.975rem] text-foreground/90">{blocks}</div>;
}

/** Captura de manual ampliable en un visor modal. */
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <figure className="my-6 not-prose">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `Ampliar captura: ${alt}` : "Ampliar captura"}
        className="group relative block w-full overflow-hidden rounded-lg border border-border bg-card"
      >
        <img src={src} alt={alt} loading="lazy" className="w-full" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-ink/80 px-2 py-1 text-xs font-medium text-ink-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn className="size-3.5" aria-hidden /> Ampliar
        </span>
      </button>
      {alt && <figcaption className="mt-2 text-xs text-muted-foreground">{alt}</figcaption>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-3">
          <DialogTitle className="px-1 text-sm font-medium">
            {alt || "Captura del manual"}
          </DialogTitle>
          <div className="max-h-[80vh] overflow-auto rounded border border-border bg-card">
            <img src={src} alt={alt} className="w-full" />
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}
