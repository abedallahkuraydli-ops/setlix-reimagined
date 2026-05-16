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
  icon: typeof Briefcase;
  title: string;
  code?: string;
  description: string;
};

// Sourced from the Portuguese Ministry of Foreign Affairs (vistos.mne.gov.pt),
// AIMA (aima.gov.pt) and Law 23/2007 as amended (incl. Law 61/2025, Oct 22, 2025).
const visas: VisaCategory[] = [
  {
    icon: Briefcase,
    title: "Work Visa (Subordinate Activity)",
    code: "D1",
    description:
      "The D1 covers people moving to Portugal to take up paid employment under a Portuguese contract. It is the standard route for hires by companies based in Portugal, including intra-company transfers.",
  },
  {
    icon: Sparkles,
    title: "Entrepreneur & Independent Worker Visa",
    code: "D2",
    description:
      "The D2 is designed for people who want to start a business in Portugal or work independently as service providers. It supports founders setting up a company and freelancers with a viable professional activity.",
  },
  {
    icon: GraduationCap,
    title: "Highly Qualified Activity Visa",
    code: "D3",
    description:
      "The D3 is granted for specialised roles that require advanced technical skills or higher education. It is the visa typically used for senior professionals, researchers and EU Blue Card pathways.",
  },
  {
    icon: GraduationCap,
    title: "Study, Internship & Volunteering Visa",
    code: "D4",
    description:
      "The D4 is issued for study at recognised institutions, unpaid internships and volunteering programmes in Portugal. It covers full degree programmes as well as shorter educational activities.",
  },
  {
    icon: GraduationCap,
    title: "Higher Education Student Mobility Visa",
    code: "D5",
    description:
      "The D5 is for students taking part in mobility programmes between higher-education institutions. It applies to exchanges, joint degrees and bilateral cooperation agreements.",
  },
  {
    icon: Users,
    title: "Family Reunification Visa",
    code: "D6",
    description:
      "The D6 allows family members of a legal resident in Portugal to join them in the country. It is the dedicated route for keeping families together under the same legal status.",
  },
  {
    icon: Wallet,
    title: "Passive Income & Retirement Visa",
    code: "D7",
    description:
      "The D7 is granted to people who rely on stable, recurring passive income such as pensions, rentals or dividends. It is widely used by retirees and individuals living off non-employment income.",
  },
  {
    icon: Laptop,
    title: "Digital Nomad Visa",
    code: "D8",
    description:
      "The D8 is the visa for remote workers and freelancers earning from clients or employers based outside Portugal. It supports location-independent professional activity carried out from Portuguese soil.",
  },
  {
    icon: Sparkles,
    title: "Golden Visa (ARI)",
    description:
      "The Golden Visa is Portugal's residence-by-investment programme. It grants residency in exchange for qualifying contributions such as investment funds, scientific research, cultural heritage support or job creation.",
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
                  Residency visas are generally issued for 4 months and 2 entries; within that
                  period the holder must apply for a residence permit with AIMA (Agência para a
                  Integração, Migraçãoes e Asilo).
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
                  and Law 23/2007 as amended by Law 61/2025 (22 October 2025).
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
