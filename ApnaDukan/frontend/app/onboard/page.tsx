import type { Metadata } from "next";
import { OnboardScreen } from "@/screens";

export const metadata: Metadata = { title: "ApnaDukan — Apni dukaan banayein" };

export default function Page() {
  return <OnboardScreen />;
}
