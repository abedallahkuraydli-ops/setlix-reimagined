import {
  Briefcase,
  GraduationCap,
  Laptop,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import VisaCard from "./VisaCard";

type VisaCategory = {
  group: string;
  icon: typeof Briefcase;
  title: string;
  code?: string;
  duration: string;
  description: string;
  whoFor: string[];
};

// Sourced from the Portuguese Ministry of Foreign Affairs (vistos.mne.gov.pt),
// AIMA (aima.gov.pt) and Law 23/2007 as amended (incl. Law 61/2025, Oct 22, 2025).
const visas: VisaCategory[] = [
  {
    group: "Residency",
    icon: Briefcase,
    title: "Work Visa (Subordinate Activity)",
    code: "D1",
    duration: "4-month entry visa → 2-year residence permit",
    description:
      "For third-country nationals with a signed employment contract or binding job offer from a Portuguese employer.",
    whoFor: ["Employees with a Portuguese contract", "Sponsored hires", "Inter-company transfers"],
  },
  {
    group: "Residency",
    icon: Sparkles,
    title: "Entrepreneur & Independent Worker Visa",
    code: "D2",
    duration: "4-month entry visa → 2-year residence permit",
    description:
      "For entrepreneurs setting up a company in Portugal or independent service providers with proof of viable activity.",
    whoFor: ["Founders & business owners", "Freelancers with PT clients", "Startup operators"],
  },
  {
    group: "Residency",
    icon: GraduationCap,
    title: "Highly Qualified Activity Visa",
    code: "D3",
    duration: "4-month entry visa → EU Blue Card eligible",
    description:
      "For specialised roles requiring advanced technical skills or higher education, including EU Blue Card pathway.",
    whoFor: ["Senior engineers & researchers", "Specialist medical staff", "EU Blue Card applicants"],
  },
  {
    group: "Residency",
    icon: GraduationCap,
    title: "Study, Internship & Volunteering Visa",
    code: "D4",
    duration: "Duration of the programme",
    description:
      "For higher-education students, exchange pupils, unpaid trainees and volunteers enrolled with a recognised host institution.",
    whoFor: ["University students", "Erasmus & exchange", "Research interns"],
  },
  {
    group: "Residency",
    icon: GraduationCap,
    title: "Higher Education Student Mobility Visa",
    code: "D5",
    duration: "Duration of the mobility programme",
    description:
      "For students moving to Portugal under a mobility programme between higher-education institutions, including EU and bilateral agreements.",
    whoFor: ["Mobility-programme students", "Exchange scholars", "Joint-degree candidates"],
  },
  {
    group: "Residency",
    icon: Users,
    title: "Family Reunification Visa",
    code: "D6",
    duration: "Matches sponsor's permit",
    description:
      "Allows spouses, partners, minor children and dependent relatives to join a legal resident in Portugal.",
    whoFor: ["Spouses & partners", "Dependent children", "Dependent parents"],
  },
  {
    group: "Residency",
    icon: Wallet,
    title: "Passive Income & Retirement Visa",
    code: "D7",
    duration: "4-month entry visa → 2-year residence permit",
    description:
      "For applicants with stable, recurring passive income (pensions, rentals, dividends) sufficient to live in Portugal.",
    whoFor: ["Retirees", "Pensioners", "Investors with rental income"],
  },
  {
    group: "Residency",
    icon: Laptop,
    title: "Digital Nomad Visa",
    code: "D8",
    duration: "Temporary stay (1 yr) or residency (2 yrs renewable)",
    description:
      "For remote workers and freelancers earning from non-Portuguese sources at least 4× the national minimum wage.",
    whoFor: ["Remote employees", "Independent consultants", "Location-independent founders"],
  },
  {
    group: "Investment",
    icon: Sparkles,
    title: "Golden Visa (ARI)",
    duration: "2-year residence permit, renewable",
    description:
      "Residence-by-investment programme. Since 2023 real-estate routes are closed; eligible options include qualifying investment funds, scientific research, cultural heritage and job creation.",
    whoFor: ["Investors in PT funds", "Cultural & R&D donors", "Job creators"],
  },
];

const VisaTypes = () => {
  return (
    <section id="visas" className="py-24 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Portuguese Visa Types
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded-full" />
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12 text-sm md:text-base">
          A guide to the long-stay visas currently issued by the Portuguese authorities, based on
          official information from the Ministry of Foreign Affairs (MNE) and AIMA, including the
          updates introduced by Law 61/2025.
        </p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {visas.map((v) => (
            <VisaCard key={v.title} {...v} />
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-12">
          <Accordion type="single" collapsible className="bg-card border border-border rounded-xl px-4">
            <AccordionItem value="notes" className="border-b-0">
              <AccordionTrigger className="text-sm font-medium">
                Important notes & sources
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  EU/EEA and Swiss citizens do not require a visa to enter, live or work in Portugal.
                  Third-country nationals generally need a long-stay (national) visa for stays
                  exceeding 90 days.
                </p>
                <p>
                  Residency visas are issued for 4 months and two entries; within that period the
                  holder must apply for a residence permit with AIMA — Agência para a Integração,
                  Migrações e Asilo.
                </p>
                <p>
                  Information compiled from{" "}
                  <a
                    href="https://vistos.mne.gov.pt/en/national-visas/general-information/type-of-visa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    vistos.mne.gov.pt
                  </a>
                  ,{" "}
                  <a
                    href="https://aima.gov.pt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    aima.gov.pt
                  </a>{" "}
                  and Law 23/2007 as amended by Law 61/2025 (22 October 2025). Eligibility, fees and
                  documentation may change — always confirm with the competent authority or your
                  advisor.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default VisaTypes;
