import type { ReactNode } from "react";

export function AuthShell({ side, children }: { side: ReactNode; children: ReactNode }) {
  return (
    <main className="page-grain min-h-[calc(100dvh-104px)] bg-[#f0f5f0]">
      <div className="mx-auto grid max-w-[1240px] lg:min-h-[calc(100dvh-118px)] lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative overflow-hidden bg-[#2a0006] px-6 py-10 text-[#f6fbf5] sm:px-12 lg:px-14 lg:py-20">
          <span className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-[#f6fbf5]/15" />
          <span className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full border border-[#f6fbf5]/10" />
          <div className="relative reveal">{side}</div>
        </aside>
        <section className="flex items-start justify-center px-5 py-12 sm:px-12 lg:items-center lg:py-20">
          <div className="reveal reveal-delay-1 w-full max-w-[430px]">{children}</div>
        </section>
      </div>
    </main>
  );
}

export const fieldClass =
  "mt-2 w-full border-0 border-b border-[#2a0006]/25 bg-transparent px-0 py-3 text-[15px] text-[#2a0006] outline-none transition-colors placeholder:text-[#796d68]/60 focus:border-[#456553] disabled:text-[#796d68]";
export const labelClass = "eyebrow text-[#456553]";
export const buttonClass =
  "inline-flex w-full items-center justify-center gap-3 bg-[#2a0006] px-5 py-4 text-[11px] font-semibold tracking-[.12em] text-[#f6fbf5] transition-colors hover:bg-[#456553] disabled:cursor-wait disabled:opacity-60";
