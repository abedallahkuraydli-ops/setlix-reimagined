import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Features from "@/components/Features";
import Services from "@/components/Services";
import Stats from "@/components/Stats";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

const Index = () => {
  return (
    <div className="min-h-screen">
      <BackToTop />
      <Navbar />
      <Hero />
      <About />
      <Features />
      <Stats />
      <Services />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
