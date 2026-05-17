const partners: { name: string; logo?: string }[] = [
  { name: "Partner One" },
  { name: "Partner Two" },
  { name: "Partner Three" },
  { name: "Partner Four" },
  { name: "Partner Five" },
  { name: "Partner Six" },
];

const Partners = () => {
  return (
    <section id="partners" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
            Our Trusted Partners
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We collaborate with leading organisations to deliver the best service to our clients.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center h-24 px-4 rounded-lg border border-border bg-card hover:shadow-md transition-all grayscale hover:grayscale-0"
            >
              {partner.logo ? (
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="max-h-12 max-w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-medium text-muted-foreground text-center">
                  {partner.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
