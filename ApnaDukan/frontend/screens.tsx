"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Globe, Loader2, MessageCircle, Mic, RefreshCw, Send, Square, Zap } from "lucide-react";
import { cn, gsap, prefersReducedMotion, speak, useVoice } from "./lib";

const INTRO = "Namaste! Main aapki dukaan ki website banana chahta hoon. Mic dabaakar batayein — kya bechte hain, kahaan hai, kab khulti hai.";
type Phase = "initial" | "followup" | "complete";

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-16 pt-6 md:px-8">
      <div className="pointer-events-none absolute left-1/2 top-[-15%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-glow/30 blur-[150px]" />
      <header className="relative mx-auto mb-8 flex max-w-6xl items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"><ArrowLeft size={16} />Back</a>
        <a href="/" className="text-base font-semibold tracking-tight">Apna<span className="text-accent">Dukan</span></a>
        <span className="text-xs text-zinc-500">{right}</span>
      </header>
      {children}
    </div>
  );
}

/* ─────────── /onboard ─────────── */

export function OnboardScreen() {
  const voice = useVoice();
  const [phase, setPhase] = useState<Phase>("initial");
  const [question, setQuestion] = useState(INTRO);
  const [thinking, setThinking] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = useCallback((m: string) => { setError(m); setTimeout(() => setError(""), 4500); }, []);
  useEffect(() => { if (voice.error) flash(voice.error); }, [voice.error, flash]);
  useEffect(() => { if (!voice.supported) flash("Aapka browser voice support nahi karta. Please Chrome use karein."); }, [voice.supported, flash]);

  const refreshPreview = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const r = await fetch("/api/generate/preview", { credentials: "include" });
        if (r.ok) setPreviewHtml(await r.text());
      } catch { /* keep last preview */ } finally { setPreviewLoading(false); }
    }, 800);
  }, []);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const toggleMic = () => (voice.listening ? voice.stop() : voice.start());
  const hasText = !voice.listening && voice.transcript.trim().length > 0;

  const sendToAI = async () => {
    const text = voice.getTranscript();
    if (!text.trim()) return flash("Pehle kuch bolein, phir bhejein!");
    setSending(true); setThinking(true);
    try {
      const { ok, data } = phase === "initial"
        ? await post("/api/interview/start", { transcript: text })
        : await post("/api/interview/answer", { answer: text, field: "general" });
      if (!ok) return flash(data.error || "Kuch gadbad hui. Dobara try karein.");
      setProgress(data.progress ?? 0);
      refreshPreview();
      if (data.is_complete) {
        setPhase("complete");
        setQuestion("Sab jankari mil gayi! Ab website banao.");
      } else {
        setPhase("followup");
        setQuestion(data.next_question);
        speak(data.next_question);
        voice.resetAll();
        setTimeout(voice.start, 1200); // auto-listen for the follow-up answer
      }
    } catch {
      flash("Network error. Internet connection check karein.");
    } finally { setSending(false); setThinking(false); }
  };

  const generateSite = async () => {
    setGenerating(true);
    try {
      const gen = await post("/api/generate", {});
      if (!gen.ok) throw new Error(gen.data.error || "Generation fail hui. Dobara try karein.");
      const pub = await post("/api/publish", { shop_id: gen.data.shop_id });
      if (!pub.ok) throw new Error(pub.data.error || "Publishing fail hui.");
      sessionStorage.setItem("live_url", pub.data.url);
      sessionStorage.setItem("shop_name", gen.data.shop_name);
      sessionStorage.setItem("live_local", pub.data.local ? "1" : "");
      window.location.href = "/success";
    } catch (e) {
      flash(e instanceof Error ? e.message : "Network error. Internet check karein.");
      setGenerating(false);
    }
  };

  const barColor = progress < 40 ? "bg-red-400" : progress < 75 ? "bg-amber-400" : "bg-accent";

  return (
    <Shell right="Interview mode">
      <main className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="glass flex items-start gap-3 rounded-3xl p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-glow/30 text-glow"><Mic size={18} className="text-white" /></span>
            <p className={cn("text-[15px] leading-relaxed", thinking && "italic text-zinc-500")}>{thinking ? "Soch raha hoon…" : question}</p>
          </div>

          {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

          <div className="glass rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between text-xs"><span className="text-zinc-400">Profile complete</span><span className="font-semibold text-accent tabular-nums">{progress}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${progress}%` }} /></div>
          </div>

          <div className="glass flex flex-col items-center rounded-3xl px-5 py-8">
            <div className="mb-5 flex h-10 items-center gap-1" aria-hidden>
              {Array.from({ length: 22 }).map((_, i) => (
                <span key={i} className={cn("w-1 rounded-full", voice.listening ? "wave-bar bg-accent" : "bg-white/15")} style={{ height: voice.listening ? `${14 + ((i * 29) % 24)}px` : "6px", animationDelay: `${i * 55}ms` }} />
              ))}
            </div>
            <button onClick={toggleMic} disabled={phase === "complete" || !voice.supported} aria-label={voice.listening ? "Recording rokein" : "Recording shuru karein"}
              className={cn("grid h-20 w-20 place-items-center rounded-full text-black transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-40",
                voice.listening ? "bg-red-400 shadow-[0_0_50px_rgba(248,113,113,.5)]" : "bg-accent shadow-[0_0_50px_rgba(124,255,138,.35)]")}>
              {voice.listening ? <Square size={26} fill="currentColor" /> : <Mic size={28} />}
            </button>
            <p className="mt-4 text-sm text-zinc-400">{voice.listening ? "Recording ho rahi hai… rokne ke liye dabaayein" : "Baat karne ke liye button dabaayein"}</p>
          </div>

          <div className="glass rounded-3xl p-5">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">Aap bol rahe hain</p>
            <p className={cn("min-h-[64px] whitespace-pre-wrap break-words text-sm leading-relaxed", voice.transcript ? "text-zinc-100" : "italic text-zinc-600")}>{voice.transcript || "Aapki awaaz yahan dikhegi…"}</p>
          </div>

          {hasText && phase !== "complete" && (
            <div className="flex gap-3">
              <button onClick={voice.start} className="glass flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium transition-colors hover:bg-white/10"><RefreshCw size={15} />Aur bolein</button>
              <button onClick={sendToAI} disabled={sending} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-black transition-colors hover:bg-white disabled:opacity-50">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}{sending ? "AI soch rahi hai…" : "AI ko bhejein"}
              </button>
            </div>
          )}

          {phase === "complete" && (
            <div className="rounded-3xl border border-accent/40 bg-accent/[.06] p-6 text-center">
              <Check className="mx-auto text-accent" size={28} />
              <h3 className="mt-3 text-lg font-semibold">Sab jankari mil gayi!</h3>
              <p className="mt-1 text-sm text-zinc-400">Aapki website banne ke liye taiyar hai.</p>
              <button onClick={generateSite} disabled={generating} className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-white disabled:opacity-60">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}{generating ? "Website ban rahi hai…" : "Website banao"}
              </button>
            </div>
          )}
        </section>

        <aside className="glass h-fit overflow-hidden rounded-3xl lg:sticky lg:top-6">
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
            <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-accent/80" /></div>
            <span className="flex-1 text-center text-xs text-zinc-500">Live preview</span>
          </div>
          <div className="relative h-[560px] bg-[#0b0b0b] lg:h-[640px]">
            {previewHtml
              ? <iframe title="Website preview" srcDoc={previewHtml} className="h-full w-full border-0 bg-white" />
              : <div className="grid h-full place-items-center px-8 text-center text-sm text-zinc-500">Bolna shuru karein — aapki website yahin banti dikhegi.</div>}
            {previewLoading && <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm"><Loader2 className="animate-spin text-accent" /></div>}
          </div>
        </aside>
      </main>
    </Shell>
  );
}

/* ─────────── /success ─────────── */

export function SuccessScreen() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("Aapki Dukaan");
  const [copied, setCopied] = useState(false);
  const [local, setLocal] = useState(false);

  useEffect(() => {
    setUrl(sessionStorage.getItem("live_url") || "");
    setLocal(sessionStorage.getItem("live_local") === "1");
    setName(sessionStorage.getItem("shop_name") || "Aapki Dukaan");
    if (prefersReducedMotion()) return;
    const colors = ["#7CFF8A", "#7A3CFF", "#F4F4F5", "#FFD93D"];
    const pieces = Array.from({ length: 70 }, () => {
      const el = document.createElement("div");
      Object.assign(el.style, { position: "fixed", top: "-20px", left: `${Math.random() * 100}vw`, width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`, background: colors[Math.floor(Math.random() * colors.length)], borderRadius: Math.random() > 0.5 ? "50%" : "2px", zIndex: "90", pointerEvents: "none" });
      document.body.appendChild(el);
      gsap.to(el, { y: window.innerHeight + 60, rotation: 720, duration: 2 + Math.random() * 2, delay: Math.random() * 0.6, ease: "power1.in", onComplete: () => el.remove() });
      return el;
    });
    return () => pieces.forEach((p) => p.remove());
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { /* clipboard blocked */ }
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`*${name}* ki website dekho!\n\n${url}\n\nApnaDukan se banai gayi`)}`, "_blank");

  return (
    <Shell right="Website live">
      <main className="relative mx-auto max-w-lg text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent"><Check size={30} /></span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">Mubarak ho!</h1>
        <p className="mt-3 text-zinc-400">{name} ki website ab internet par live hai. Link apne customers ko bhejein aur orders paana shuru karein.</p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[[Zap, "3 min", "Mein bani"], [Globe, "Live", "Abhi se"], [Check, "₹0", "Cost"]].map(([Icon, v, l]) => {
            const I = Icon as typeof Zap;
            return (<div key={l as string} className="glass rounded-2xl px-3 py-4"><I size={16} className="mx-auto text-accent" /><p className="mt-2 text-lg font-semibold">{v as string}</p><p className="text-[11px] text-zinc-500">{l as string}</p></div>);
          })}
        </div>

        <div className="glass mt-4 rounded-3xl p-5 text-left">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">Aapki website ka link</p>
          <p className="break-all rounded-xl bg-white/[.05] px-4 py-3 text-sm font-medium text-accent">{url || "Link nahi mila — pehle website banayein."}</p>
          {local && <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">Ye link abhi sirf aapke computer par khulta hai. Internet par live karne ke liye backend/.env mein VERCEL_TOKEN add karein.</p>}
          <button onClick={copy} disabled={!url} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full glass py-3 text-sm font-medium transition-colors hover:bg-white/10 disabled:opacity-40">
            {copied ? <Check size={15} className="text-accent" /> : <Copy size={15} />}{copied ? "Copy ho gaya!" : "Link copy karein"}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <a href={url || "#"} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-black transition-colors hover:bg-white"><ExternalLink size={15} />Apni website dekhein</a>
          <button onClick={whatsapp} disabled={!url} className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"><MessageCircle size={15} />WhatsApp par share karein</button>
          <a href="/onboard" className="flex items-center justify-center gap-2 rounded-full glass py-3.5 text-sm font-medium transition-colors hover:bg-white/10">Nayi dukaan banayein</a>
        </div>
      </main>
    </Shell>
  );
}
