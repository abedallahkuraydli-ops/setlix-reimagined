

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-primary overflow-hidden">
      {/* Animated wave lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <path
              id="hero-wave"
              d="M0,450 C240,350 480,550 720,450 C960,350 1200,550 1440,450"
              fill="none"
            />
          </defs>
          {Array.from({ length: 7 }).map((_, i) => (
            <g key={i} transform={`translate(0 ${(i - 3) * 55})`}>
              <use
                href="#hero-wave"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth={1.5}
                strokeOpacity={0.18 + i * 0.05}
                style={{
                  animation: `hero-wave-shift ${10 + i * 1.5}s ease-in-out ${i * -0.6}s infinite alternate`,
                  transformOrigin: "center",
                }}
              />
            </g>
          ))}
        </svg>
        <style>{`
          @keyframes hero-wave-shift {
            0%   { transform: translateY(var(--ty, 0)) translateX(0) scaleY(1); }
            50%  { transform: translateY(var(--ty, 0)) translateX(-40px) scaleY(1.15); }
            100% { transform: translateY(var(--ty, 0)) translateX(40px) scaleY(0.9); }
          }
        `}</style>
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
