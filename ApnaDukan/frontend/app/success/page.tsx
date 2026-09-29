import type { Metadata } from "next";
import { SuccessScreen } from "@/screens";

export const metadata: Metadata = { title: "ApnaDukan — Aapki website live ho gayi!" };

export default function Page() {
  return <SuccessScreen />;
}
