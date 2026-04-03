const About = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Who We Are
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mb-10 rounded-full" />
        <p className="text-muted-foreground text-lg leading-relaxed text-center">
          At Setlix, we make it easy to start, grow, and thrive in Portugal so you can focus on what really matters to you and leave Portuguese bureaucracy to us. Whether you're launching a startup or living the digital nomad dream, we are your one-stop partner for all your needs. We handle the paperwork so you can focus on your goals. Backed by local expertise and a passion for simplicity, we want to empower entrepreneurs and remote professionals to hit the ground running.
        </p>
      </div>
    </section>
  );
};

export default About;
