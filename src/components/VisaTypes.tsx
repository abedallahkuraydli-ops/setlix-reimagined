import {
  Briefcase,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Search,
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
  {
    group: "Job Search",
    icon: Search,
    title: "Skilled Job Seeker Visa",
    duration: "120 days, extendable by 60 (Law 61/2025)",
    description:
      "Updated in October 2025, this visa lets holders of specialised technical skills enter Portugal to look for and start qualified work before the residence permit is issued.",
    whoFor: ["Highly qualified professionals", "Tech & STEM talent", "Specialised technicians"],
  },
  {
    group: "Temporary",
    icon: HeartPulse,
    title: "Medical Treatment & Seasonal Stay",
    duration: "Up to 1 year",
    description:
      "Short, purpose-bound stays for medical treatment, seasonal employment, transfer of athletes, or accompanying family members under treatment.",
    whoFor: ["Patients & carers", "Seasonal workers", "Professional athletes"],
  },
  {
    group: "Mobility",
    icon: Home,
    title: "CPLP Mobility Agreement",
    duration: "1-year residence permit, renewable",
    description:
      "Simplified residency for nationals of Portuguese-speaking countries (Brazil, Angola, Cape Verde, Mozambique and others) under the CPLP Mobility Agreement.",
    whoFor: ["CPLP-country nationals", "Lusophone professionals", "Students from CPLP states"],
  },
  {
    group: "Mobility",
    icon: Users,
    title: "Youth Mobility Visa",
    duration: "Up to 12 months",
    description:
      "Bilateral programmes allowing young people (typically 18–30) from partner countries to live and work in Portugal for cultural exchange.",
    whoFor: ["Working-holiday applicants", "Eligible nationalities only", "Cultural exchange participants"],
  },
];

const VisaTypes = () => {
  return (
    <section id="visas" className="py-24 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Portuguese Visa Types — 2026
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded-full" />
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12 text-sm md:text-base">
          A guide to the long-stay visas currently issued by the Portuguese authorities, based on
          official information from the Ministry of Foreign Affairs (MNE) and AIMA, including the
          updates introduced by Law 61/2025.
        </p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {visas.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="bg-card border border-border rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="rounded-lg bg-primary/10 text-primary p-2 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground leading-tight">{v.title}</h3>
                      {v.code && (
                        <span className="text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary rounded px-1.5 py-0.5">
                          {v.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.group} · {v.duration}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{v.description}</p>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {v.whoFor.map((w) => (
                    <span
                      key={w}
                      className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
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
