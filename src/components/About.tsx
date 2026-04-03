const About = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Who We Are
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mb-10 rounded-full" />
        <p className="text-muted-foreground text-lg leading-relaxed text-center">
          Setlix is your gateway to starting fresh in Portugal, without the stress, confusion, or wasted time. We are a full-service relocation and business support company built for modern movers: entrepreneurs, freelancers, startups, digital nomads, and investors seeking residency through the Golden Visa. From navigating complex bureaucracy and legal processes to setting up your finances, business structure, and everyday essentials, we handle everything behind the scenes so you can focus on building your life and your ambitions. At Setlix, we don't just help you move, we plug you into a thriving ecosystem, connecting you with opportunities, communities, and the tools you need to succeed from day one.
        </p>
      </div>
    </section>
  );
};

export default About;
