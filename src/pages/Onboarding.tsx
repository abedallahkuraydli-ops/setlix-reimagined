import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown, Search, Check } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { NATIONALITIES } from "@/lib/nationalities";
import { Badge } from "@/components/ui/badge";

interface CatalogueItem {
  id: string;
  name: string;
  category: string;
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState<Date | undefined>();
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState<string | undefined>();
  const [nif, setNif] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Service selection
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    supabase
      .from("service_catalogue")
      .select("id, name, category")
      .eq("active", true)
      .order("category")
      .order("name")
      .then(({ data }) => {
        if (data) setCatalogue(data);
      });
  }, []);

  const filteredNationalities = NATIONALITIES.filter((n) =>
    n.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  const filteredCatalogue = catalogue.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const groupedCatalogue = filteredCatalogue.reduce<Record<string, CatalogueItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectedNames = catalogue
    .filter((s) => selectedServiceIds.includes(s.id))
    .map((s) => s.name);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!lastName.trim()) errs.lastName = "Last name is required";
    if (!dob) {
      errs.dob = "Date of birth is required";
    } else if (differenceInYears(new Date(), dob) < 18) {
      errs.dob = "You must be at least 18 years old";
    }
    if (!nationality) errs.nationality = "Nationality is required";
    const cleanNif = nif.replace(/\s/g, "");
    const isPortuguese = nationality === "Portuguese" || nationality === "Portugal";
    if (isPortuguese && !cleanNif) {
      errs.nif = "NIF is required for Portuguese nationals";
    } else if (cleanNif && !/^\d{9}$/.test(cleanNif)) {
      errs.nif = "NIF must be exactly 9 digits";
    }
    if (!phone) errs.phone = "Phone number is required";
    if (selectedServiceIds.length === 0) errs.services = "Please select at least one service";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob!.toISOString().split("T")[0],
        nationality,
        nif: nif.replace(/\s/g, "") || null,
        phone_number: phone,
        onboarding_completed: true,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const inserts = selectedServiceIds.map((scId) => ({
        client_id: profile.id,
        service_catalogue_id: scId,
        status: "requested" as const,
        progress_percentage: 0,
      }));
      await supabase.from("client_services").insert(inserts);
    }

    setLoading(false);
    navigate("/portal/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary relative overflow-hidden px-4 py-12">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] border-[80px] border-primary-foreground/20 rotate-45 translate-x-1/3" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] border-[60px] border-primary-foreground/15 rotate-45 -translate-x-1/4" />
      </div>

      <div className="relative z-10 w-full max-w-[540px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <a href="/" className="flex items-center justify-center gap-2 mb-6">
          <span className="text-primary-foreground font-black text-4xl leading-none">✳</span>
          <span className="text-primary-foreground font-bold text-2xl tracking-wider">SETLIX</span>
        </a>

        <div className="bg-background rounded-xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Step 1 of 1
            </span>
            <div className="flex-1 mx-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-full bg-primary rounded-full" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-foreground mb-1">
            Welcome to Setlix — let's get to know you
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            This takes less than a minute. We use this information to personalise your experience and get started on your services.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={100}
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Date of Birth</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dob && "text-muted-foreground",
                      errors.dob && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dob ? format(dob, "dd/MM/yyyy") : "DD/MM/YYYY"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dob}
                    onSelect={(d) => { setDob(d); setCalendarOpen(false); }}
                    disabled={(date) => date > new Date()}
                    defaultMonth={new Date(2000, 0)}
                    captionLayout="dropdown"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.dob && <p className="text-xs text-destructive">{errors.dob}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Nationality</Label>
              <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between font-normal",
                      !nationality && "text-muted-foreground",
                      errors.nationality && "border-destructive"
                    )}
                  >
                    {nationality || "Select nationality"}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <div className="flex items-center border-b px-3">
                    <Search className="h-4 w-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Search nationality..."
                      value={nationalitySearch}
                      onChange={(e) => setNationalitySearch(e.target.value)}
                      className="flex h-10 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {filteredNationalities.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No results</p>
                    ) : (
                      filteredNationalities.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => { setNationality(n); setNationalityOpen(false); setNationalitySearch(""); }}
                          className={cn(
                            "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            nationality === n && "bg-accent text-accent-foreground"
                          )}
                        >
                          {n}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {errors.nationality && <p className="text-xs text-destructive">{errors.nationality}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nif" className="text-foreground">
                NIF (Número de Identificação Fiscal)
                {(nationality === "Portuguese" || nationality === "Portugal") ? (
                  <span className="text-destructive ml-1">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                )}
              </Label>
              <Input
                id="nif"
                inputMode="numeric"
                placeholder="123456789"
                value={nif}
                onChange={(e) => setNif(e.target.value.replace(/\D/g, "").slice(0, 9))}
                maxLength={9}
                className={errors.nif ? "border-destructive" : ""}
              />
              {errors.nif && <p className="text-xs text-destructive">{errors.nif}</p>}
              <p className="text-xs text-muted-foreground">
                {(nationality === "Portuguese" || nationality === "Portugal")
                  ? "Required for Portuguese tax invoicing."
                  : "Add this if you already have a Portuguese tax number."}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Phone Number</Label>
              <PhoneInput
                international
                defaultCountry="GB"
                value={phone}
                onChange={setPhone}
                className={cn(
                  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background [&>input]:bg-transparent [&>input]:outline-none [&>input]:flex-1",
                  errors.phone ? "border-destructive" : "border-input"
                )}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">My Main Service</Label>
              <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between font-normal h-auto min-h-10",
                      selectedServiceIds.length === 0 && "text-muted-foreground",
                      errors.services && "border-destructive"
                    )}
                  >
                    {selectedServiceIds.length === 0 ? (
                      "Select one or more services"
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {selectedNames.slice(0, 3).map((name) => (
                          <Badge key={name} variant="secondary" className="text-xs font-normal">
                            {name}
                          </Badge>
                        ))}
                        {selectedNames.length > 3 && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            +{selectedNames.length - 3} more
                          </Badge>
                        )}
                      </span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <div className="flex items-center border-b px-3">
                    <Search className="h-4 w-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="flex h-10 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {Object.keys(groupedCatalogue).length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No services found</p>
                    ) : (
                      Object.entries(groupedCatalogue).map(([category, items]) => (
                        <div key={category}>
                          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {category}
                          </p>
                          {items.map((s) => {
                            const selected = selectedServiceIds.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleService(s.id)}
                                className={cn(
                                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2",
                                  selected && "bg-accent/50"
                                )}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                  selected ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span className="text-left">{s.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {errors.services && <p className="text-xs text-destructive">{errors.services}</p>}
              <p className="text-xs text-muted-foreground">Select all services you're interested in.</p>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                "Continue to my portal →"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
