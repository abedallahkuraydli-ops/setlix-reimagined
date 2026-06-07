import { Building2, FileText, Landmark, Home, Users, Award, Check, Package, Briefcase, Megaphone, Plane } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import ServiceCard from "@/components/ServiceCard";
import Contact from "@/components/Contact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const services = [
  {
    icon: Building2,
    title: "Company Registration",
    description: "Establish your company in Portugal with a complete registration process handled end-to-end.",
    items: [
      "Virtual Address",
      "Certificate of Admissibility",
      "Company Incorporation",
      "Special License Registration (if required)",
    ],
  },
  {
    icon: FileText,
    title: "Administrative",
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
    title: "Financial",
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
    icon: Award,
    title: "Golden Visa",
    description: "Simplified golden visa process to ensure your residency in Portugal with clarity, security, and confidence.",
    items: [
      "Initial Eligibility Assessment & Strategy",
      "Investment Advisory & Opportunity Sourcing",
      "Legal Structuring & Immigration Support",
      "Tax Advisory & Compliance",
      "Banking & Financial Setup",
      "End-to-End Application Management",
    ],
  },
  {
    icon: Home,
    title: "Relocation",
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
    description: "Because it isn't just about where you live but also who you meet, where you go, and the connections you make.",
    items: [
      "Access to networking events",
      "Tour-guided sightseeing",
      "Monthly trips to discover Portugal",
    ],
  },
];

const packages = [
  {
    icon: Plane,
    name: "Relocation Package",
    price: "Starting €1,200",
    description: "Everything you need to land softly in Portugal.",
    items: [
      "Confirming visa documents",
      "Obtaining a tax number",
      "House scouting (up to 5 houses)",
      "Bank account setup",
      "Airport pickup",
    ],
    highlighted: false,
  },
  {
    icon: Briefcase,
    name: "Setup Package",
    price: "Starting €2,200",
    description: "Get your Portuguese business fully operational.",
    items: [
      "Obtaining a tax number",
      "Virtual address",
      "Certificate of Admissibility",
      "Corporate bank account setup",
      "Tax Authority activity registration",
      "Accounting setup",
    ],
    highlighted: true,
  },
  {
    icon: Package,
    name: "Admin Package",
    price: "Starting €1,250",
    description: "For people already in Portugal who need the essentials sorted.",
    items: [
      "Obtaining a tax number",
      "Obtaining a social security number",
      "Personal bank account setup",
      "House scouting (up to 5 houses)",
      "AIMA / residency assistance",
    ],
    highlighted: false,
    note: "Available for people already in Portugal",
  },
  {
    icon: Megaphone,
    name: "Marketing Package",
    price: "Price upon request",
    description: "Launch your brand with a complete digital presence.",
    items: [
      "Minimum of 16 posts and reels",
      "Social media content calendar",
      "Branding guidelines",
      "Website development",
    ],
    highlighted: false,
  },
];

const ServicesPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <BackToTop />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Services & Packages</h1>
          <div className="w-16 h-1 bg-primary-foreground/40 mx-auto mb-6 rounded-full" />
          <p className="max-w-2xl mx-auto text-primary-foreground/80 text-base md:text-lg">
            Choose individual services tailored to your needs, or save time and money by opting for one of our curated packages.
          </p>
        </div>
      </section>

      {/* Individual services */}
      <section id="services" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">Our Services</h2>
          <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded-full" />
          <p className="text-center text-muted-foreground text-sm mb-12 max-w-2xl mx-auto">
            Hover or tap each card to explore what's included.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {services.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>
          <p className="text-center text-muted-foreground text-xs mt-8 italic">
            *We do not guarantee visa approval
          </p>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">Our Packages</h2>
          <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded-full" />
          <p className="text-center text-muted-foreground text-sm mb-12 max-w-2xl mx-auto">
            Bundle multiple services together and benefit from a streamlined onboarding at a better price.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {packages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <Card
                  key={pkg.name}
                  className={`flex flex-col transition-shadow hover:shadow-lg ${
                    pkg.highlighted ? "border-primary border-2 shadow-md relative" : ""
                  }`}
                >
                  {pkg.highlighted && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most popular
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                    <p className="text-2xl font-bold text-foreground pt-2">{pkg.price}</p>
                    {pkg.note && (
                      <p className="text-xs text-muted-foreground italic">{pkg.note}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {pkg.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" variant={pkg.highlighted ? "default" : "outline"}>
                      <a href="#contact">Opt for this package</a>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-muted-foreground text-xs mt-10 max-w-2xl mx-auto">
            All package prices are starting points and may vary based on your specific situation. Contact us for a tailored quote.
          </p>
        </div>
      </section>

      <Contact />
              );
            })}
          </div>

          <p className="text-center text-muted-foreground text-xs mt-10 max-w-2xl mx-auto">
            All package prices are starting points and may vary based on your specific situation. Contact us for a tailored quote.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
