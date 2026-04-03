import { FileText, Landmark, Home, Users, Award } from "lucide-react";

const services = [
  {
    icon: FileText,
    title: "Administrative Services",
    description: "Complete your legal setup from confirming your visa documents and appointment to your regulatory operations in Portugal.",
    items: [
      "Confirming your visa document",
      "Assisting in obtaining a visa appointment*",
      "Tax and social security registration",
      "Legal and Contractual Documentation",
      "On demand legal Assistance",
    ],
  },
  {
    icon: Landmark,
    title: "Financial Services",
    description: "Bank Account, financial planning, and all the financial services to ensure your new life in Portugal is as smooth as possible.",
    items: [
      "Bank Account Opening",
      "Tax Planning and Yearly IRS Filing",
      "Bookkeeping",
      "Financial Consulting",
      "Private Monthly Accountant",
    ],
  },
  {
    icon: Home,
    title: "Relocation Services",
    description: "Comprehensive support to settle smoothly into life in Portugal.",
    items: [
      "House and/or Office Scouting",
      "Access to Portuguese Lessons",
      "Access to Healthcare Support",
      "Airport Pickups",
      "Residence Permit Application Support",
    ],
  },
  {
    icon: Users,
    title: "Community & Networking",
    description: "Because it isn't just about where you live — but also who you meet, where you go, and the connections you make.",
    items: [
      "Access to networking events",
      "Discounted wine tours",
      "Tour-guided sightseeing",
      "Monthly trips to discover Portugal",
    ],
  },
  {
    icon: Award,
    title: "Golden Visa",
    description: "Simplified Golden Visa process by handling every legal, administrative, and investment step so you can secure residency in Portugal with clarity, speed, and confidence.",
    items: [
      "Initial Eligibility Assessment & Strategy",
      "Investment Advisory & Opportunity Sourcing",
      "Legal Structuring & Immigration Support",
      "Tax Advisory & Compliance",
      "Banking & Financial Setup",
      "End-to-End Application Management",
      "Family Inclusion & Planning",
      "AIMA Appointment & Residency Support",
      "Renewals & Ongoing Compliance",
      "Citizenship Pathway Support",
      "Post-Relocation & Lifestyle Services",
    ],
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Our Services
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mb-14 rounded-full" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-card rounded-xl p-8 border border-border hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <service.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{service.title}</h3>
              <p className="text-muted-foreground text-sm mb-5 leading-relaxed">{service.description}</p>
              <ul className="space-y-2">
                {service.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary mt-1 text-xs">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-muted-foreground text-xs mt-8 italic">
          *We do not guarantee visa approval
        </p>
      </div>
    </section>
  );
};

export default Services;
