import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Search, Copy, BookmarkCheck, MessageSquareText, MapPin } from "lucide-react";
import { GUIDE_ITEMS } from "@/lib/portal-guide";
import { Button } from "@/components/ui/button";

const ICONS = [CalendarDays, Search, Copy, BookmarkCheck, MessageSquareText];

export function PortalGuideSteps({ compact = false }: { compact?: boolean }) {
  return (
    <ol className="divide-y divide-border" aria-label="Pasos de la guía de uso">
      {GUIDE_ITEMS.map((item, index) => {
        const Icon = ICONS[index] ?? MapPin;
        return (
          <li key={item.title} className="py-4 first:pt-0">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-secondary-foreground" aria-label={`Paso ${index + 1}`}>{index + 1}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                <div className="mt-3 border-l-2 border-primary pl-3 text-sm">
                  <p className="flex items-start gap-2 font-medium"><Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{item.location}</p>
                  {!compact && <p className="mt-1 text-muted-foreground">{item.cue}</p>}
                </div>
                <Button asChild variant="link" size="sm" className="mt-2 h-auto whitespace-normal px-0 text-left">
                  <Link to={item.to}>{item.action}<ArrowRight aria-hidden /></Link>
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}