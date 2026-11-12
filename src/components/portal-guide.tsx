import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";

import {
  GUIDE_ARTICLE_SLUG,
  GUIDE_FOOTER,
  GUIDE_ITEMS,
  GUIDE_TITLE,
  guideSeen,
  markGuideSeen,
} from "@/lib/portal-guide";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PortalGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const item = GUIDE_ITEMS[step];

  useEffect(() => {
    if (!guideSeen()) setOpen(true);
  }, []);

  const close = (next: boolean) => {
    if (!next) markGuideSeen();
    setOpen(next);
  };

  return (
    <>
      <Button
        variant="ghost"
        type="button"
        onClick={() => { setStep(0); setOpen(true); }}
        aria-label="Ayuda: abrir la guía rápida"
        title="Ayuda"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
      >
        <HelpCircle className="size-4" aria-hidden />
        <span className="hidden sm:inline">Ayuda</span>
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{GUIDE_TITLE}</DialogTitle>
            <DialogDescription>Consultá cada paso y abrí la sección que necesitás.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2" aria-label="Seleccionar paso">
            {GUIDE_ITEMS.map((entry, index) => <Button key={entry.title} size="icon" variant={index === step ? "default" : "outline"} aria-label={`Paso ${index + 1}: ${entry.title}`} aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)}>{index + 1}</Button>)}
          </div>
          {item && <section className="space-y-3" aria-live="polite" aria-atomic="true">
            <p className="text-xs font-medium text-muted-foreground">Paso {step + 1} de {GUIDE_ITEMS.length}</p>
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="text-sm leading-relaxed">{item.text}</p>
            <aside className="border-l-2 border-primary pl-3 text-sm">
              <p className="font-semibold">Ubicación: {item.location}</p>
              <p className="mt-2 text-muted-foreground">{item.cue}</p>
            </aside>
            <Button asChild variant="outline" className="h-auto min-h-9 whitespace-normal text-left"><Link to={item.to} onClick={() => close(false)}>{item.action}<ArrowRight aria-hidden /></Link></Button>
          </section>}
          <p className="text-xs text-muted-foreground">{GUIDE_FOOTER}</p>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((n) => n - 1)}><ArrowLeft aria-hidden />Anterior</Button>
            {step < GUIDE_ITEMS.length - 1 ? <Button onClick={() => setStep((n) => n + 1)}>Siguiente<ArrowRight aria-hidden /></Button> : <Button onClick={() => close(false)}>Finalizar guía</Button>}
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Link
              to="/article/$slug"
              params={{ slug: GUIDE_ARTICLE_SLUG }}
              onClick={() => close(false)}
              className="self-center text-sm font-semibold hover:underline"
            >
              Ver la guía completa
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
