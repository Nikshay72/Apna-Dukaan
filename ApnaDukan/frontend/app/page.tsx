import {
  Navbar, Hero, VoiceBuilder, TemplateGallery, DashboardPreview, Features,
  BeforeAfter, Testimonials, Pricing, CTAFooter,
} from "@/components";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <VoiceBuilder />
      <TemplateGallery />
      <DashboardPreview />
      <Features />
      <BeforeAfter />
      <Testimonials />
      <Pricing />
      <CTAFooter />
    </main>
  );
}
