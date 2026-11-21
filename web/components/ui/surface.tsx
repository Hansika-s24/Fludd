import type { ReactNode } from "react";

/**
 * The one structural surface: a sidebar on desktop, a bottom sheet on phones.
 * ponytail: the sheet is a fixed peek height for now; drag, flick and snap come in D6.
 */
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <aside
      className={`material-thick fixed z-10 flex flex-col overflow-y-auto [scrollbar-width:none] ${className}
        inset-x-0 bottom-0 max-h-[46dvh] rounded-t-[var(--radius-surface)]
        pb-[max(1rem,env(safe-area-inset-bottom))]
        md:inset-x-auto md:bottom-auto md:left-4 md:top-4 md:max-h-[calc(100dvh-2rem)] md:w-[380px] md:rounded-[var(--radius-surface)] md:pb-4`}
    >
      <div className="mx-auto mt-2 mb-1 h-[5px] w-9 shrink-0 rounded-full bg-label-3/50 md:hidden" aria-hidden />
      {children}
    </aside>
  );
}

/** A grouped list section: near-solid on the material, never another translucent layer. */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="px-4 pt-4">
      {title && <h2 className="px-3 pb-1.5 text-footnote font-medium uppercase text-label-2">{title}</h2>}
      <div className="rounded-[var(--radius-group)] bg-group">{children}</div>
    </section>
  );
}
