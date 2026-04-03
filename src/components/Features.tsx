import { Zap, Shield, Users, Headphones, Heart, Eye } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Fast Company Setup",
    description: "Start operating in weeks",
  },
  {
    icon: Shield,
    title: "Full Compliance",
    description: "Ensuring every legal aspect meets Portuguese financial and regulatory requirements",
  },
  {
    icon: Users,
    title: "Expert Team",
    description: "A dedicated hand picked team of specialists handles all your administrative and relocation needs",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Support whenever you need it, wherever you are",
  },
  {
    icon: Heart,
    title: "Lifestyle Support",
    description: "As a team of well connected locals we help you settle into your new home and connect with a welcoming community",
  },
  {
    icon: Eye,
    title: "No Hidden Fees",
    description: "Clear, upfront fees always. No hidden surprises",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-section-alt">
      <div className="container mx-auto px-4">
        <p className="text-center text-primary font-semibold mb-2 tracking-wide uppercase text-sm">
          Why Setlix?
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
          Perfect for startups and<br />
          <span className="text-primary">Digital Nomads</span>
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mb-14 rounded-full" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-xl p-8 border border-border hover:shadow-lg transition-shadow duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
