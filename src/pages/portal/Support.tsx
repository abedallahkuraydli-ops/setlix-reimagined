import { HelpCircle, Mail, Phone, Clock } from "lucide-react";

const Support = () => (
  <div className="p-6 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">Support</h1>
      <p className="text-muted-foreground text-sm mt-1">Get help from our team.</p>
    </div>

    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      {/* Phone */}
      <a
        href="tel:+351931926855"
        className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
      >
        <div className="rounded-full bg-muted p-3 w-fit mb-4 group-hover:bg-primary/10 transition-colors">
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-sm mb-1">Phone</h3>
        <p className="text-sm text-muted-foreground">+351 931 926 855</p>
      </a>

      {/* General email */}
      <a
        href="mailto:info@setlix.pt"
        className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
      >
        <div className="rounded-full bg-muted p-3 w-fit mb-4 group-hover:bg-primary/10 transition-colors">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-sm mb-1">General Enquiries</h3>
        <p className="text-sm text-muted-foreground">info@setlix.pt</p>
      </a>

      {/* Legal email */}
      <a
        href="mailto:legal@setlix.pt"
        className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
      >
        <div className="rounded-full bg-muted p-3 w-fit mb-4 group-hover:bg-primary/10 transition-colors">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-sm mb-1">Legal</h3>
        <p className="text-sm text-muted-foreground">legal@setlix.pt</p>
      </a>
    </div>

    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-foreground">Need further assistance?</h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Our team is available Monday to Friday, 9:00–18:00 (Lisbon time). Reach out by phone or email and we'll get back to you as soon as possible.
      </p>
    </div>
  </div>
);

export default Support;
