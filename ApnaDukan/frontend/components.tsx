"use client";

import { createElement, useEffect, useRef, useState, type ElementType, type ReactNode, type MouseEvent } from "react";
import Lenis from "lenis";
import SplitType from "split-type";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Menu, Mic, Star, X } from "lucide-react";
import {
  cn, gsap, ScrollTrigger, prefersReducedMotion, useGsap,
  NAV_LINKS, VOICE_STEPS, TEMPLATES, FEATURES, TESTIMONIALS, PLANS,
} from "./lib";

/* ───────────── global behaviours ───────────── */

export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReducedMotion()) return;
    document.documentElement.classList.add("has-cursor");
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.1 });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.1 });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3.out" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3.out" });
    const move = (e: globalThis.MouseEvent) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); };
    const over = (e: globalThis.MouseEvent) =>
      ring.current?.classList.toggle("is-hover", !!(e.target as Element).closest("a,button,input,[data-cursor]"));
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, []);
  return (<><div ref={ring} className="cursor-ring" aria-hidden /><div ref={dot} className="cursor-dot" aria-hidden /></>);
}

export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const xt = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yt = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const mv = (e: globalThis.MouseEvent) => {
      const r = el.getBoundingClientRect();
      xt((e.clientX - r.left - r.width / 2) * strength);
      yt((e.clientY - r.top - r.height / 2) * strength);
    };
    const lv = () => { xt(0); yt(0); };
    el.addEventListener("mousemove", mv);
    el.addEventListener("mouseleave", lv);
    return () => { el.removeEventListener("mousemove", mv); el.removeEventListener("mouseleave", lv); };
  }, [strength]);
  return <span ref={ref} className="inline-block">{children}</span>;
}

export function Button({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "ghost" }) {
  return (
    <Magnetic>
      <a
        href={href}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors duration-200",
          variant === "primary" ? "bg-accent text-black hover:bg-white" : "glass text-ink hover:bg-white/10",
        )}
      >
        {children}
      </a>
    </Magnetic>
  );
}

export function SplitHeading({ text, as = "h2", className, delay = 0 }: { text: string; as?: ElementType; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const split = new SplitType(el, { types: "words" });
    const tween = gsap.from(split.words ?? [], {
      y: 40, opacity: 0, filter: "blur(8px)", duration: 0.9, ease: "power4.out", stagger: 0.06, delay,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); split.revert(); };
  }, [delay]);
  return createElement(as, { ref, className }, text);
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-zinc-300"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{children}</p>;
}

/* ───────────── 1. navbar ───────────── */

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="glass mx-auto flex max-w-5xl items-center justify-between rounded-full py-2 pl-5 pr-2">
        <a href="#top" className="text-base font-semibold tracking-tight">Apna<span className="text-accent">Dukan</span></a>
        <ul className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
          {NAV_LINKS.map((l) => (<li key={l.href}><a href={l.href} className="transition-colors hover:text-white">{l.label}</a></li>))}
        </ul>
        <div className="flex items-center gap-2">
          <div className="hidden md:block"><Button href="/onboard">Start free</Button></div>
          <button aria-label="Menu" onClick={() => setOpen((o) => !o)} className="glass rounded-full p-2.5 md:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass mx-auto mt-2 max-w-5xl rounded-3xl p-5 md:hidden">
            {NAV_LINKS.map((l) => (<a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-zinc-200">{l.label}</a>))}
            <a href="/onboard" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-accent py-3 text-center font-medium text-black">Start free</a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ───────────── 2+3. hero with floating phone ───────────── */

function Phone() {
  const rows = [["Aata 5kg", "₹210"], ["Basmati 1kg", "₹95"], ["Desi Ghee 1L", "₹640"], ["Chai Patti", "₹130"]];
  return (
    <div className="relative h-[540px] w-[270px] rounded-[42px] border border-white/15 bg-[#0b0b0b] p-3 shadow-[0_0_140px_-20px_rgba(122,60,255,.7)]">
      <div className="h-full overflow-hidden rounded-[32px] bg-gradient-to-b from-[#1c1236] to-[#0a0a0a]">
        <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-black" />
        <div className="p-5">
          <p className="text-[10px] text-accent">sharmakirana.apnadukan.in</p>
          <h4 className="mt-2 text-xl font-semibold">Sharma Kirana Store</h4>
          <p className="text-xs text-zinc-400">Jodhpur · 7 AM – 10 PM</p>
          <div className="mt-5 space-y-2">
            {rows.map(([n, p]) => (
              <div key={n} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[.04] px-3 py-2.5 text-xs">
                <span>{n}</span><span className="text-accent">{p}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-full bg-accent py-2.5 text-center text-xs font-medium text-black">WhatsApp par order karein</div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const tilt = useRef<HTMLDivElement>(null);
  const ref = useGsap<HTMLElement>((root) => {
    gsap.from(".hero-fade", { y: 24, opacity: 0, stagger: 0.12, delay: 0.6, duration: 1, ease: "power3.out" });
    gsap.from(".hero-visual", { y: 80, opacity: 0, delay: 0.5, duration: 1.4, ease: "power3.out" });
    gsap.to(".hero-glow", { yPercent: 35, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-parallax", { yPercent: -14, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".float-card", { y: -14, duration: 2.6, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.5 });
  });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(tilt.current, { rotateY: px * 14, rotateX: -py * 14, transformPerspective: 1000, duration: 0.6, ease: "power3.out" });
  };
  const onLeave = () => gsap.to(tilt.current, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "power3.out" });

  return (
    <section id="top" ref={ref} className="relative flex min-h-screen items-center overflow-hidden px-6 pb-20 pt-32">
      <div className="hero-glow pointer-events-none absolute left-1/2 top-[-10%] h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-glow/40 blur-[160px]" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="hero-fade"><Eyebrow>Hindi · English · Marwari</Eyebrow></div>
          <SplitHeading as="h1" delay={0.2} text="Bolo. Aapki dukaan online ho jaayegi." className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl" />
          <p className="hero-fade mt-6 max-w-lg text-lg text-zinc-400">ApnaDukan aapki awaaz sunkar teen minute mein ek poori website banata hai. Koi typing nahi, koi design nahi.</p>
          <div className="hero-fade mt-9 flex flex-wrap gap-3">
            <Button href="/onboard">Free mein shuru karein <ArrowUpRight size={16} /></Button>
            <Button href="#builder" variant="ghost">Dekhein kaise kaam karta hai</Button>
          </div>
        </div>
        <div className="hero-parallax">
          <div className="hero-visual flex justify-center" onMouseMove={onMove} onMouseLeave={onLeave}>
            <div ref={tilt} className="relative [transform-style:preserve-3d]">
              <Phone />
              <div className="float-card glass absolute -left-10 top-16 flex items-center gap-3 rounded-2xl p-3 pr-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-glow/30"><Mic size={16} /></span>
                <div><p className="text-xs font-medium">Sun raha hoon…</p><p className="text-[10px] text-zinc-400">&quot;Meri kirana dukaan hai&quot;</p></div>
              </div>
              <div className="float-card glass absolute -right-8 bottom-24 flex items-center gap-3 rounded-2xl p-3 pr-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/20 text-accent"><Check size={16} /></span>
                <div><p className="text-xs font-medium">Website live</p><p className="text-[10px] text-zinc-400">2 min 47 sec mein</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── 4. pinned AI voice builder ───────────── */

export function VoiceBuilder() {
  const ref = useGsap<HTMLElement>((root) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: "top top", end: "+=2400", pin: true, scrub: 1 } });
    tl.fromTo(".vb-progress", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: VOICE_STEPS.length }, 0);
    VOICE_STEPS.forEach((_, i) => {
      tl.to(`.vb-step-${i}`, { opacity: 1, x: 10, duration: 0.6 }, i)
        .fromTo(`.vb-block-${i}`, { opacity: 0, y: 24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7 }, i + 0.1);
    });
  });
  const blocks = ["Sharma Kirana Store", "Aata · Chawal · Ghee · Chai", "Jodhpur, Rajasthan · 7 AM – 10 PM", "sharmakirana.apnadukan.in"];
  return (
    <section id="builder" ref={ref} className="relative flex min-h-screen items-center overflow-hidden px-6">
      <div className="pointer-events-none absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-glow/25 blur-[140px]" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow>AI Voice Builder</Eyebrow>
          <SplitHeading text="Awaaz se website tak, chaar kadam mein." className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl" />
          <ol className="mt-10 space-y-6">
            {VOICE_STEPS.map((s, i) => (
              <li key={s.title} className={cn("opacity-30", `vb-step-${i}`)}>
                <p className="text-lg font-medium">{s.title}</p>
                <p className="text-sm text-zinc-400">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 h-px w-full bg-white/10"><div className="vb-progress h-px origin-left bg-accent" /></div>
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="mb-6 flex h-12 items-center justify-center gap-1.5">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} className="wave-bar w-1 rounded-full bg-accent" style={{ height: `${20 + ((i * 37) % 28)}px`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
          <div className="space-y-3">
            {blocks.map((b, i) => (
              <div key={b} className={cn("rounded-2xl border border-white/10 bg-white/[.04] px-4 py-4 text-sm opacity-0", `vb-block-${i}`)}>{b}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── 5. horizontal template gallery ───────────── */

export function TemplateGallery() {
  const ref = useGsap<HTMLElement>((root) => {
    const track = root.querySelector<HTMLElement>(".hg-track")!;
    gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth + 48),
      ease: "none",
      scrollTrigger: { trigger: root, start: "top top", end: () => "+=" + track.scrollWidth, pin: true, scrub: 1, invalidateOnRefresh: true },
    });
  });
  return (
    <section id="templates" ref={ref} className="relative flex h-screen flex-col justify-center overflow-hidden">
      <div className="mx-auto mb-10 w-full max-w-6xl px-6">
        <Eyebrow>Templates</Eyebrow>
        <SplitHeading text="Har dukaan ke liye ek khoobsurat shuruaat." className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl" />
      </div>
      <div className="hg-track flex w-max gap-6 px-6">
        {TEMPLATES.map((t) => (
          <article key={t.name} className="relative h-[52vh] w-[300px] shrink-0 overflow-hidden rounded-3xl border border-white/10 p-5 md:w-[380px]" style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})` }}>
            <div className="rounded-2xl bg-black/30 p-4 backdrop-blur">
              <div className="h-2 w-16 rounded-full bg-white/60" />
              <div className="mt-4 h-24 rounded-xl bg-white/15" />
              <div className="mt-3 grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => (<div key={i} className="h-14 rounded-lg bg-white/10" />))}</div>
            </div>
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between">
              <div><h3 className="text-2xl font-semibold">{t.name}</h3><p className="text-sm text-white/70">{t.tag}</p></div>
              <span className="glass grid h-10 w-10 place-items-center rounded-full"><ArrowUpRight size={16} /></span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ───────────── 6. AI dashboard preview (expanding frame + counters) ───────────── */

export function DashboardPreview() {
  const ref = useGsap<HTMLElement>((root) => {
    gsap.fromTo(".db-frame", { scale: 0.78, borderRadius: 56, opacity: 0.5 }, {
      scale: 1, borderRadius: 24, opacity: 1, ease: "none",
      scrollTrigger: { trigger: ".db-frame", start: "top 95%", end: "top 25%", scrub: true },
    });
    root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      const o = { v: 0 };
      gsap.to(o, {
        v: Number(el.dataset.count), duration: 2, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("en-IN"); },
      });
    });
    gsap.from(".db-bar", { scaleY: 0, transformOrigin: "bottom", stagger: 0.05, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".db-bars", start: "top 85%", once: true } });
  });
  const stats = [["Visitors", 12480], ["WhatsApp clicks", 842], ["Orders", 236], ["Repeat customers", 71]];
  const bars = [30, 45, 38, 62, 55, 78, 66, 90, 72, 84, 60, 96];
  return (
    <section id="dashboard" ref={ref} className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <Eyebrow>Dashboard</Eyebrow>
          <SplitHeading text="Dekhein aapki dukaan kaise badh rahi hai." className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl" />
        </div>
        <div className="db-frame glass overflow-hidden p-5 shadow-[0_0_160px_-30px_rgba(122,60,255,.6)] md:p-8">
          <div className="grid gap-4 md:grid-cols-4">
            {stats.map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-white/8 bg-surface p-5">
                <p className="text-xs text-zinc-400">{l}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums" data-count={v}>0</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-white/8 bg-surface p-5">
              <p className="text-xs text-zinc-400">Is saal ke visitors</p>
              <div className="db-bars mt-6 flex h-44 items-end gap-2">
                {bars.map((h, i) => (<div key={i} className="db-bar flex-1 rounded-t-md bg-gradient-to-t from-glow to-accent" style={{ height: `${h}%` }} />))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-surface p-5">
              <p className="text-xs text-zinc-400">Naye enquiries</p>
              <ul className="mt-4 space-y-3 text-sm">
                {["Ghee 1L — 2 ka order", "Aata 10kg ka rate?", "Kal delivery hogi?"].map((q) => (
                  <li key={q} className="flex items-center gap-2 text-zinc-200"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{q}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── 7. features ───────────── */

export function Features() {
  const ref = useGsap<HTMLElement>(() => {
    gsap.from(".feat", { y: 40, opacity: 0, stagger: 0.08, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".feat-grid", start: "top 80%", once: true } });
  });
  const spot = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <section ref={ref} className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Eyebrow>Features</Eyebrow>
        <SplitHeading text="Chhote shehron ke liye, poori tarah banaya gaya." className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl" />
        <div className="feat-grid mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} onMouseMove={spot} className="feat spot glass rounded-3xl p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/[.06] text-accent"><Icon size={20} /></span>
              <h3 className="mt-6 text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── 8. before / after ───────────── */

export function BeforeAfter() {
  const [pct, setPct] = useState(50);
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <Eyebrow>Before / After</Eyebrow>
          <SplitHeading text="Register se website tak." className="text-4xl font-semibold tracking-tight md:text-5xl" />
        </div>
        <div className="glass relative h-[420px] overflow-hidden rounded-3xl select-none">
          <div className="absolute inset-0 grid place-items-center bg-[#0d0d0d] p-8">
            <div className="max-w-xs text-zinc-500">
              <p className="text-xs uppercase tracking-widest">Pehle</p>
              <p className="mt-3 text-2xl font-medium text-zinc-300">Sirf gali ke log jaante hain.</p>
              <p className="mt-3 text-sm">Kaagaz ka register, phone par rate poochna, aur sirf muh-zubaani.</p>
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#1c1236] to-[#08130a] p-8" style={{ clipPath: `inset(0 0 0 ${pct}%)` }}>
            <div className="ml-auto max-w-xs pl-6 text-right">
              <p className="text-xs uppercase tracking-widest text-accent">Baad mein</p>
              <p className="mt-3 text-2xl font-medium">Poore shehar ne dekha.</p>
              <p className="mt-3 text-sm text-zinc-300">Live catalog, WhatsApp order, aur ek link jo kahin bhi share ho sakta hai.</p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 w-px bg-accent" style={{ left: `${pct}%` }}>
            <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-xs font-bold text-black">⇄</span>
          </div>
          <input aria-label="Before and after slider" type="range" min={5} max={95} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
        </div>
      </div>
    </section>
  );
}

/* ───────────── 9. testimonials ───────────── */

export function Testimonials() {
  const ref = useGsap<HTMLElement>(() => {
    gsap.from(".tm", { y: 40, opacity: 0, stagger: 0.12, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".tm-grid", start: "top 82%", once: true } });
    gsap.to(".tm-grid", { yPercent: -4, ease: "none", scrollTrigger: { trigger: ".tm-grid", start: "top bottom", end: "bottom top", scrub: true } });
  });
  return (
    <section ref={ref} className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Eyebrow>Testimonials</Eyebrow>
        <SplitHeading text="Dukaandaaron ki zubaani." className="text-4xl font-semibold tracking-tight md:text-5xl" />
        <div className="tm-grid mt-14 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="tm glass rounded-3xl p-7">
              <div className="flex gap-0.5 text-accent">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={14} fill="currentColor" />))}</div>
              <blockquote className="mt-5 text-lg leading-snug">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-6 text-sm"><span className="font-medium">{t.name}</span><span className="block text-zinc-400">{t.shop}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── 10. pricing ───────────── */

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <Eyebrow>Pricing</Eyebrow>
          <SplitHeading text="Chhoti dukaan, chhota kharcha." className="text-4xl font-semibold tracking-tight md:text-5xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <motion.div key={p.name} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className={cn("relative rounded-3xl p-8", p.hot ? "border border-accent/50 bg-surface shadow-[0_0_80px_-20px_rgba(124,255,138,.35)]" : "glass")}>
              {p.hot && <span className="absolute right-6 top-6 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold text-black">Popular</span>}
              <h3 className="text-lg font-medium">{p.name}</h3>
              <p className="mt-5 text-5xl font-semibold tracking-tight">{p.price}<span className="ml-2 text-sm font-normal text-zinc-400">{p.per}</span></p>
              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                {p.feat.map((f) => (<li key={f} className="flex items-center gap-2"><Check size={15} className="text-accent" />{f}</li>))}
              </ul>
              <div className="mt-8"><Button href="/onboard" variant={p.hot ? "primary" : "ghost"}>Chunein</Button></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── 11. fullscreen CTA footer ───────────── */

export function CTAFooter() {
  const ref = useGsap<HTMLElement>((root) => {
    gsap.to(".cta-glow", { scale: 1.3, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom bottom", scrub: true } });
  });
  return (
    <footer id="cta" ref={ref} className="relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pt-32">
      <div className="cta-glow pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/40 blur-[150px]" />
      <div className="relative mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center text-center">
        <SplitHeading as="h2" text="Aapki dukaan. Ab online." className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-8xl" />
        <p className="mt-6 max-w-md text-zinc-400">Teen minute, ek awaaz, aur aapki website live. Pehle do mahine bilkul free.</p>
        <div className="mt-10"><Button href="/onboard">Free mein shuru karein <ArrowUpRight size={16} /></Button></div>
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/8 py-8 text-sm text-zinc-500">
        <span>© {new Date().getFullYear()} ApnaDukan · Tier-2 India ke liye</span>
        <div className="flex gap-6">{NAV_LINKS.map((l) => (<a key={l.href} href={l.href} className="hover:text-white">{l.label}</a>))}</div>
      </div>
    </footer>
  );
}
