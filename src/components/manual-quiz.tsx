import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/manual-quiz";

export function ManualQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const [checked, setChecked] = useState(false);
  const score = picked.filter((p, i) => p === questions[i]?.answer).length;

  return (
    <section aria-labelledby="quiz-title" className="mt-12 rounded-xl border border-border bg-card p-5">
      <h2 id="quiz-title" className="font-display text-2xl">Comprobá lo que aprendiste</h2>
      <p className="mt-1 text-sm text-muted-foreground">3 preguntas para repasar este manual.</p>
      <ol className="mt-5 space-y-6">
        {questions.map((item, qi) => (
          <li key={item.q}>
            <p className="font-semibold">{qi + 1}. {item.q}</p>
            <div role="radiogroup" aria-label={item.q} className="mt-2 grid gap-2">
              {item.options.map((opt, oi) => {
                const selected = picked[qi] === oi;
                const correct = checked && oi === item.answer;
                const wrong = checked && selected && oi !== item.answer;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={checked}
                    onClick={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected && !checked && "border-primary bg-primary/10",
                      correct && "border-primary bg-primary/10",
                      wrong && "border-destructive bg-destructive/10",
                    )}
                  >
                    {correct && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
                    {wrong && <XCircle className="size-4 text-destructive" aria-hidden />}
                    {opt}
                  </button>
                );
              })}
            </div>
            {checked && <p className="mt-2 text-sm text-muted-foreground">{item.why}</p>}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {checked ? (
          <>
            <p className="font-semibold" role="status">Acertaste {score} de {questions.length}.</p>
            <Button variant="outline" onClick={() => { setPicked(questions.map(() => null)); setChecked(false); }}>
              Intentar de nuevo
            </Button>
          </>
        ) : (
          <Button onClick={() => setChecked(true)} disabled={picked.some((p) => p === null)}>
            Ver resultado
          </Button>
        )}
      </div>
    </section>
  );
}
