

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-primary overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] border-[80px] border-primary-foreground/20 rotate-45 translate-x-1/3" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] border-[60px] border-primary-foreground/15 rotate-45 translate-x-1/4" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-primary-foreground tracking-tight mb-4">
          SETLIX
        </h1>

        <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground tracking-tight leading-tight mb-6">
          LAUNCH & THRIVE IN<br />PORTUGAL
        </h2>

        <p className="text-primary-foreground/70 text-lg md:text-xl font-light italic mb-10 max-w-2xl mx-auto">
          Portugal without a Hassle
        </p>

        <a
          href="#contact"
          className="inline-block border-2 border-primary-foreground text-primary-foreground px-10 py-4 rounded-full text-lg font-semibold hover:bg-primary-foreground hover:text-primary transition-all duration-300"
        >
          Start Your Journey
        </a>
      </div>
    </section>
  );
};

export default Hero;
