"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

const copy = {
  en: {
    announcement: "A quieter kind of shine · Hand-finished in sterling silver",
    nav: ["Our story", "The collections", "A note from us"],
    discover: "Discover the atelier",
    heroKicker: "BAREEQ ATELIER · EST. WITH INTENTION",
    heroTitle: <>Silver,<br />shaped by <i>light.</i></>,
    heroText: "Pieces to keep close. Made slowly, with a feeling for form, and a little room for the unexpected.",
    viewCollections: "Explore the collections",
    storyLink: "The story of Bareeq",
    imageCaption: "A study in silver & stillness",
    seal: ["MADE TO", "BE KEPT"],
    chapter: "01 — THE ATELIER",
    storyTitle: <>A little <i>light,</i><br />to carry with you.</>,
    storyText: "Bareeq means brilliance. For us, it is not a flash, but the soft glow of something well made — the curve of a familiar ring, the weight of silver resting in your palm.",
    storyTextTwo: "We take our time with every line and finish. The result is jewelry that feels considered, personal, and entirely your own.",
    storyCta: "Read our story",
    collectionEyebrow: "02 — FIND YOUR FEELING",
    collectionTitle: <>Three ways<br />to catch the light.</>,
    collectionNote: "Each collection begins with a different kind of quiet.",
    explore: "Discover the collection",
    footerEyebrow: "A note from the atelier",
    footerTitle: <>Good things take<br /><i>their own time.</i></>,
    footerText: "Thoughtful silver, made to find its way into your everyday. Begin with the collections, and find the piece that feels like you.",
    footerFine: "BAREEQ ATELIER · MADE WITH MEANING",
    langButton: "العربية",
    menu: "Open menu",
    close: "Close menu",
    languageDirection: "ltr",
  },
  ar: {
    announcement: "بريق هادئ · فضة إسترلينية تُصاغ بعناية",
    nav: ["حكايتنا", "المجموعات", "رسالة منّا"],
    discover: "اكتشفي الأتيليه",
    heroKicker: "أتيليه بريق · صُنع بنيّة",
    heroTitle: <>فضةٌ<br />يوقظها <i>الضوء.</i></>,
    heroText: "قطعٌ تبقى قريبة. صيغت على مهل، بإحساسٍ بالشكل، ومساحة صغيرة لما هو غير متوقع.",
    viewCollections: "اكتشفي المجموعات",
    storyLink: "حكاية بريق",
    imageCaption: "تأمل في الفضة والسكون",
    seal: ["صُنعت", "لتبقى"],
    chapter: "٠١ — الأتيليه",
    storyTitle: <>شيءٌ من <i>الضوء،</i><br />تحملينه معكِ.</>,
    storyText: "بريق هو الضوء الهادئ لشيء صُنع بإتقان. انحناءة خاتم مألوف، ووزن الفضة وهي تستقر في راحة يدك.",
    storyTextTwo: "نمنح كل خط ولمسة وقتهما. لتكون القطعة شخصية، مدروسة، وتشبهكِ تماماً.",
    storyCta: "اقرئي حكايتنا",
    collectionEyebrow: "٠٢ — اختاري إحساسكِ",
    collectionTitle: <>ثلاث حكايات<br />من الضوء.</>,
    collectionNote: "تبدأ كل مجموعة بنوع مختلف من السكون.",
    explore: "اكتشفي المجموعة",
    footerEyebrow: "رسالة من الأتيليه",
    footerTitle: <>الأشياء الجميلة<br /><i>تأخذ وقتها.</i></>,
    footerText: "فضة مدروسة لترافق تفاصيل يومكِ. ابدئي من المجموعات، واكتشفي القطعة الأقرب إلى إحساسكِ.",
    footerFine: "أتيليه بريق · صُنع بمعنى",
    langButton: "English",
    menu: "افتحي القائمة",
    close: "أغلقي القائمة",
    languageDirection: "rtl",
  },
};

const collections = [
  {
    id: "lujain",
    number: "01",
    name: "Lujain",
    arabic: "لُجين",
    meaning: { en: "Silver, in its most luminous form.", ar: "الفضة، في أكثر صورها إشراقاً." },
    image: "lujain",
  },
  {
    id: "rawnaq",
    number: "02",
    name: "Rawnaq",
    arabic: "رَوْنَق",
    meaning: { en: "A little radiance in the everyday.", ar: "شيءٌ من الإشراق في كل يوم." },
    image: "rawnaq",
  },
  {
    id: "wahaj",
    number: "03",
    name: "Wahaj",
    arabic: "وَهَج",
    meaning: { en: "For the moments that stay with you.", ar: "للحظات التي تبقى معكِ." },
    image: "wahaj",
  },
];

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      {diagonal ? (
        <path d="M4 12 12 4M5 4h7v7" stroke="currentColor" strokeWidth="1.2" />
      ) : (
        <path d="M2.5 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
      )}
    </svg>
  );
}

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const text = copy[language];
  const isArabic = language === "ar";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = text.languageDirection;
  }, [language, text.languageDirection]);

  return (
    <main className={`page-grain overflow-hidden ${isArabic ? "arabic-page" : ""}`} dir={text.languageDirection}>
      <div className="flex min-h-[30px] items-center justify-center bg-[#2a0006] px-4 py-2 text-center text-[9px] font-semibold tracking-[.14em] text-[#f6fbf5] sm:text-[10px]">
        {text.announcement}
      </div>
      <header className="relative z-30 border-b border-[#2a0006]/10 bg-[#f6fbf5]">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-9 lg:h-[88px] lg:px-[7.1%]">
          <button
            aria-label={menuOpen ? text.close : text.menu}
            className="flex h-10 w-10 items-center justify-center text-[#2a0006] lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.3" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.3" /></svg>
            )}
          </button>
          <nav aria-label="Main navigation" className="hidden items-center gap-9 lg:flex">
            <a className="eyebrow transition-colors hover:text-[#456553]" href="#story">{text.nav[0]}</a>
            <a className="eyebrow transition-colors hover:text-[#456553]" href="#collections">{text.nav[1]}</a>
          </nav>
          <a href="#" aria-label="Bareeq Atelier home" className="absolute left-1/2 -translate-x-1/2 text-center text-[#2a0006]">
            <span className="block font-display text-[27px] font-medium leading-none tracking-[.08em] sm:text-[31px]">BAREEQ</span>
            <span className="mt-[5px] block text-[8px] font-semibold tracking-[.34em]">ATELIER</span>
          </a>
          <div className="flex items-center gap-3 sm:gap-7">
            <nav aria-label="More navigation" className="hidden lg:block">
              <a className="eyebrow transition-colors hover:text-[#456553]" href="#letter">{text.nav[2]}</a>
            </nav>
            <button
              className="rounded-full border border-[#2a0006]/20 px-3.5 py-2 text-[10px] font-semibold tracking-[.08em] text-[#2a0006] transition-colors hover:bg-[#2a0006] hover:text-[#f6fbf5] sm:px-4"
              onClick={() => setLanguage(isArabic ? "en" : "ar")}
              aria-label={isArabic ? "Switch language to English" : "التبديل إلى العربية"}
            >
              {text.langButton}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-t border-[#2a0006]/10 bg-[#f6fbf5] px-6 py-5 shadow-lg shadow-[#2a0006]/5 lg:hidden">
            {[...text.nav.slice(0, 2), text.nav[2]].map((label, index) => (
              <a
                key={label}
                href={["#story", "#collections", "#letter"][index]}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-[#2a0006]/10 py-4 font-display text-xl text-[#2a0006]"
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-[74px] pt-12 sm:px-9 sm:pb-24 sm:pt-16 lg:min-h-[650px] lg:grid-cols-[.93fr_1.07fr] lg:gap-12 lg:px-[10%] lg:pb-[90px] lg:pt-[74px]">
        <div className={`relative z-10 max-w-[510px] ${isArabic ? "lg:order-2" : ""}`}>
          <p className="eyebrow reveal text-[#456553]">{text.heroKicker}</p>
          <h1 className={`reveal reveal-delay-1 mt-6 font-display text-[clamp(3.7rem,8.1vw,7.35rem)] leading-[.98] tracking-[-.055em] text-[#2a0006] ${isArabic ? "font-arabic !leading-[1.16] tracking-normal" : ""}`}>
            {text.heroTitle}
          </h1>
          <p className={`reveal reveal-delay-2 mt-6 max-w-[360px] text-[13px] leading-[1.95] text-[#796d68] sm:text-[14px] ${isArabic ? "font-arabic text-[18px] leading-[1.8]" : ""}`}>
            {text.heroText}
          </p>
          <div className="reveal reveal-delay-2 mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a className="group inline-flex items-center gap-3 bg-[#2a0006] px-5 py-4 text-[10px] font-semibold tracking-[.11em] text-[#f6fbf5] transition-colors hover:bg-[#456553]" href="#collections">
              {text.viewCollections}<ArrowIcon />
            </a>
            <a className="inline-flex items-center gap-2 border-b border-[#2a0006]/30 pb-1.5 text-[10px] font-semibold tracking-[.06em] text-[#2a0006] transition-colors hover:border-[#456553] hover:text-[#456553]" href="#story">
              {text.storyLink}<ArrowIcon diagonal />
            </a>
          </div>
          <div className="mt-12 flex items-center gap-3 text-[#456553]">
            <span className="h-px w-9 bg-[#456553]/50" />
            <span className="eyebrow !text-[8px] !tracking-[.2em]">925 STERLING · MADE TO LAST</span>
          </div>
        </div>
        <div className={`relative mx-auto w-full max-w-[550px] lg:mx-0 lg:max-w-none ${isArabic ? "lg:order-1" : ""}`}>
          <div className="relative aspect-[.92] overflow-hidden bg-[#e6ede5] sm:aspect-[1.02] lg:aspect-[.91]">
            <Image
              src="/bareeq-editorial.jpg"
              alt="Sculptural sterling silver jewelry arranged in soft atelier light"
              fill
              priority
              sizes="(max-width: 768px) 92vw, 44vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2a0006]/25 to-transparent" />
            <span className="absolute bottom-5 left-5 text-[9px] font-medium tracking-[.13em] text-white">{text.imageCaption}</span>
          </div>
          <div className="absolute -bottom-5 -left-4 flex h-[88px] w-[88px] rotate-[-8deg] items-center justify-center rounded-full border border-[#456553]/50 bg-[#f6fbf5]/90 text-center text-[8px] font-semibold leading-[1.6] tracking-[.18em] text-[#456553] backdrop-blur-sm sm:-left-7 sm:h-[108px] sm:w-[108px]">
            <span>{text.seal[0]}<br />{text.seal[1]}</span>
          </div>
          <span className="absolute -right-2 top-5 hidden h-[72px] w-[72px] rounded-full border border-[#f6fbf5]/60 sm:block" />
        </div>
      </section>

      <section id="story" className="scroll-mt-8 bg-[#f0f5f0]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-[76px] sm:px-12 sm:py-24 lg:grid-cols-[.75fr_1.25fr] lg:gap-24 lg:px-[15%] lg:py-[132px]">
          <div className="flex items-start gap-4">
            <span className="mt-[7px] h-px w-8 shrink-0 bg-[#456553]" />
            <p className="eyebrow text-[#456553]">{text.chapter}</p>
          </div>
          <div className="max-w-[620px]">
            <h2 className={`font-display text-[clamp(2.65rem,5vw,4.7rem)] leading-[1.06] tracking-[-.045em] text-[#2a0006] ${isArabic ? "font-arabic !leading-[1.3] tracking-normal" : ""}`}>{text.storyTitle}</h2>
            <p className={`mt-7 max-w-[490px] text-[13px] leading-[2] text-[#675d59] sm:text-[14px] ${isArabic ? "font-arabic text-[18px]" : ""}`}>{text.storyText}</p>
            <p className={`mt-3 max-w-[490px] text-[13px] leading-[2] text-[#675d59] sm:text-[14px] ${isArabic ? "font-arabic text-[18px]" : ""}`}>{text.storyTextTwo}</p>
            <a href="#letter" className="mt-8 inline-flex items-center gap-3 border-b border-[#456553]/60 pb-2 text-[10px] font-semibold tracking-[.12em] text-[#456553] transition-colors hover:border-[#2a0006] hover:text-[#2a0006]">{text.storyCta}<ArrowIcon diagonal /></a>
          </div>
        </div>
      </section>

      <section id="collections" className="scroll-mt-8 px-5 py-[78px] sm:px-9 sm:py-24 lg:px-[10%] lg:py-[130px]">
        <div className="mx-auto max-w-[1160px]">
          <div className="mb-11 flex flex-col justify-between gap-5 sm:mb-14 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow text-[#456553]">{text.collectionEyebrow}</p>
              <h2 className={`mt-4 font-display text-[clamp(2.5rem,5vw,4.3rem)] leading-[1.04] tracking-[-.045em] text-[#2a0006] ${isArabic ? "font-arabic !leading-[1.3] tracking-normal" : ""}`}>{text.collectionTitle}</h2>
            </div>
            <p className={`max-w-[220px] pb-1 text-[12px] leading-[1.8] text-[#796d68] ${isArabic ? "font-arabic text-[17px]" : ""}`}>{text.collectionNote}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-4 lg:gap-6">
            {collections.map((collection, index) => (
              <a id={collection.id} href={`#${collection.id}`} key={collection.id} className="group block">
                <div className={`collection-art collection-art-${collection.image} relative aspect-[.86] overflow-hidden transition-transform duration-500 group-hover:-translate-y-1`}>
                  <span className="absolute left-5 top-5 font-display text-[12px] text-[#456553]/80">{collection.number} / 03</span>
                  <span className={`collection-orb collection-orb-${index}`} />
                  <span className={`collection-line collection-line-${index}`} />
                  <span className="absolute bottom-4 left-5 font-display text-[10px] italic tracking-[.08em] text-[#456553]/70">A BAREEQ STUDY</span>
                  <span className="absolute bottom-4 right-5 text-[10px] tracking-[.12em] text-[#456553]/60">925</span>
                </div>
                <div className="flex items-start justify-between gap-3 pt-5">
                  <div>
                    <h3 className="font-display text-[27px] leading-none text-[#2a0006]">{collection.name}</h3>
                    <p className="font-arabic mt-1 text-[17px] text-[#456553]">{collection.arabic}</p>
                  </div>
                  <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#2a0006]/20 text-[#2a0006] transition-all duration-300 group-hover:border-[#2a0006] group-hover:bg-[#2a0006] group-hover:text-[#f6fbf5]"><ArrowIcon diagonal /></span>
                </div>
                <p className={`mt-2 text-[11px] leading-[1.7] text-[#796d68] ${isArabic ? "font-arabic text-[15px]" : ""}`}>{collection.meaning[language]}</p>
                <span className="mt-4 inline-block text-[9px] font-semibold tracking-[.12em] text-[#456553]">{text.explore}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="letter" className="scroll-mt-8 bg-[#2a0006] text-[#f6fbf5]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-[72px] sm:px-12 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-[15%] lg:py-[112px]">
          <div>
            <p className="eyebrow text-[#b7c6b6]">{text.footerEyebrow}</p>
            <h2 className={`mt-5 font-display text-[clamp(2.7rem,5.4vw,5rem)] leading-[1.02] tracking-[-.045em] ${isArabic ? "font-arabic !leading-[1.3] tracking-normal" : ""}`}>{text.footerTitle}</h2>
          </div>
          <div>
            <p className={`max-w-[390px] text-[13px] leading-[1.9] text-[#f6fbf5]/70 ${isArabic ? "font-arabic text-[18px]" : ""}`}>{text.footerText}</p>
            <a href="#collections" className="mt-7 inline-flex items-center gap-2 border-b border-[#f6fbf5]/40 pb-3 text-[10px] font-semibold tracking-[.09em] text-[#f6fbf5] transition-colors hover:border-[#b7c6b6] hover:text-[#b7c6b6]">
              {text.viewCollections}<ArrowIcon />
            </a>
          </div>
          <div className="border-t border-[#f6fbf5]/15 pt-5 text-[8px] font-semibold tracking-[.19em] text-[#f6fbf5]/55 lg:col-span-2">{text.footerFine}</div>
        </div>
      </section>
      <style jsx global>{`
        .arabic-page { font-family: var(--font-arabic); }
        .arabic-page .eyebrow { font-family: var(--font-body); }
        .collection-art { background-color: #e9efe8; }
        .collection-art-lujain { background: radial-gradient(ellipse at 53% 49%, #f6fbf5 0 3%, transparent 3.5%), linear-gradient(145deg, #e9efe8, #dce7dd 55%, #e8eee7); }
        .collection-art-rawnaq { background: linear-gradient(145deg, #e8ece4, #dfe8de 55%, #e9eee7); }
        .collection-art-wahaj { background: linear-gradient(145deg, #e7ebe3, #e3e9e1 52%, #d8e2d9); }
        .collection-orb { position: absolute; left: 50%; top: 49%; width: 48%; aspect-ratio: 1; transform: translate(-50%,-50%); border: 1px solid rgba(112,129,113,.8); border-radius: 50%; box-shadow: inset 0 0 0 4px rgba(246,251,245,.34), 8px 16px 25px rgba(49,65,52,.12); }
        .collection-orb-0 { width: 42%; border-width: 2px; transform: translate(-50%,-50%) rotate(-22deg) scaleX(.72); box-shadow: inset 0 0 0 3px rgba(246,251,245,.55), 9px 18px 22px rgba(49,65,52,.17); }
        .collection-orb-1 { width: 55%; transform: translate(-50%,-50%) rotate(29deg) scaleX(.62); }
        .collection-orb-2 { width: 50%; border-width: 2px; transform: translate(-50%,-50%) rotate(8deg) scaleX(.8); }
        .collection-line { position: absolute; left: 50%; top: 49%; width: 61%; height: 1px; transform: translate(-50%,-50%) rotate(-48deg); background: linear-gradient(90deg, transparent, rgba(104,126,106,.65), transparent); }
        .collection-line-1 { width: 75%; transform: translate(-50%,-50%) rotate(37deg); }
        .collection-line-2 { width: 56%; transform: translate(-50%,-50%) rotate(-71deg); }
        @media (min-width: 768px) { .arabic-page .collection-orb { top: 48%; } }
      `}</style>
    </main>
  );
}
