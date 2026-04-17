import { Building2, FileText, Landmark, Home, Users, Award } from "lucide-react";
import ServiceCard from "./ServiceCard";

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
            <ServiceCard key={service.title} {...service} />
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
