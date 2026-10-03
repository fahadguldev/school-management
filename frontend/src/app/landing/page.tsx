"use client";

import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import LogoWall from "@/components/landing/LogoWall";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import SocialProof from "@/components/landing/SocialProof";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-[#080c14] text-white overflow-x-hidden w-full">
      <Nav />
      <Hero />
      <LogoWall />
      <FeaturesGrid />
      <SocialProof />
      <HowItWorks />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
