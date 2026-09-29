import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Mic, Languages, Sparkles, MessageCircle, Zap, ShieldCheck, type LucideIcon,
} from "lucide-react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Scoped GSAP context; animations only run when reduced-motion is off and are reverted on unmount. */
export function useGsap<T extends HTMLElement>(cb: (root: T) => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => cb(el), el);
      return () => ctx.revert();
    });
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

export const NAV_LINKS = [
  { label: "Product", href: "#builder" },
  { label: "Templates", href: "#templates" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
];

export const VOICE_STEPS = [
  { title: "Bolo apni dukaan ke baare mein", text: "Hindi, English ya Marwari — 7 simple sawaal, koi typing nahi." },
  { title: "AI samajhta hai", text: "Naam, saaman, timing, address — sab kuch apne aap alag ho jaata hai." },
  { title: "Website banti dikhti hai", text: "Live preview mein har jawab ke saath aapka page bharta jaata hai." },
  { title: "Ek tap mein live", text: "shopname.apnadukan.in — WhatsApp par share karne ke liye taiyar." },
];

export const TEMPLATES = [
  { name: "Kirana", tag: "Grocery & daily needs", from: "#1f6f3d", to: "#0a2415" },
  { name: "Boutique", tag: "Clothing & tailoring", from: "#8a2b6f", to: "#260a1e" },
  { name: "Mithai", tag: "Sweets & bakery", from: "#c2691f", to: "#2b1505" },
  { name: "Electronics", tag: "Mobiles & repair", from: "#2f4bd1", to: "#0a1030" },
  { name: "Salon", tag: "Beauty & grooming", from: "#7a3cff", to: "#160a30" },
];

export const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Mic, title: "Voice-first builder", text: "Bolo, aur hum likh lete hain. Har jawab ke baad read-back confirmation." },
  { icon: Languages, title: "Hindi, English, Marwari", text: "Aapki boli mein baat, website aapki zaroorat ki bhasha mein." },
  { icon: Sparkles, title: "AI photo polish", text: "Product photo ka background hataye aur unhe clean, catalog-ready banaye." },
  { icon: MessageCircle, title: "WhatsApp updates", text: "Rate ya stock badalna ho to bas ek voice note bhejein." },
  { icon: Zap, title: "Built for 2G/3G", text: "Halka HTML + CSS, chhote shehron ke slow network par bhi tez khulta hai." },
  { icon: ShieldCheck, title: "Free subdomain + SSL", text: "shopname.apnadukan.in har dukaan ko, secure aur bina kisi setup ke." },
];

export const TESTIMONIALS = [
  { name: "Ramesh Sharma", shop: "Kirana Store, Jodhpur", quote: "Maine kabhi website nahi banayi thi. Bas bola, aur meri dukaan online ho gayi." },
  { name: "Priya Joshi", shop: "Boutique, Pali", quote: "Customers ab WhatsApp par link dekh kar seedha saree ke rate poochte hain." },
  { name: "Imran Khan", shop: "Mobile Repair, Barmer", quote: "Teen minute mein site live. Bhaiya ne pucha kisne banwayi, maine kaha — awaaz ne." },
];

export const PLANS = [
  { name: "Shuruaat", price: "₹0", per: "pehle 2 mahine", feat: ["1 website", "Voice interview", "apnadukan.in subdomain", "WhatsApp share link"], hot: false },
  { name: "Dukaan", price: "₹149", per: "/ mahina", feat: ["Sab kuch Shuruaat mein", "Product photo enhance", "WhatsApp voice updates", "Analytics dashboard"], hot: true },
  { name: "Brand", price: "₹399", per: "/ mahina", feat: ["Custom domain", "5 templates", "Priority support", "Multi-location dukaan"], hot: false },
];

/** Web Speech API wrapper (Chrome). Keeps the accumulated transcript across start/stop like the old voice.js. */
export function useVoice(lang = "hi-IN") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const full = useRef("");
  const session = useRef("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.lang = lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onstart = () => { session.current = ""; setListening(true); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) session.current += t + " "; else interim += t;
      }
      setTranscript(`${full.current} ${session.current}${interim}`.trim());
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      setListening(false);
      setError(
        e.error === "not-allowed" ? "Microphone ki permission nahi mili. Browser settings mein mic allow karein."
        : e.error === "no-speech" ? "Koi awaaz nahi aayi. Phir se bolein."
        : "Kuch technical problem aayi. Dobara try karein.",
      );
    };
    rec.onend = () => {
      setListening(false);
      if (session.current.trim()) full.current = `${full.current} ${session.current.trim()}`.trim();
      setTranscript(full.current);
    };
    recRef.current = rec;
    return () => { rec.onend = null; try { rec.abort(); } catch {} };
  }, [lang]);

  const start = useCallback(() => {
    setError("");
    try { recRef.current?.start(); } catch { /* already started */ }
  }, []);
  const stop = useCallback(() => { try { recRef.current?.stop(); } catch {} }, []);
  const resetAll = useCallback(() => { full.current = ""; session.current = ""; setTranscript(""); try { recRef.current?.abort(); } catch {} setListening(false); }, []);
  const getTranscript = useCallback(() => full.current || transcript, [transcript]);

  return { listening, transcript, error, supported, start, stop, resetAll, getTranscript };
}

export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "hi-IN"; u.rate = 0.9;
  window.speechSynthesis.speak(u);
}
