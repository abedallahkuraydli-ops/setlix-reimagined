import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const countryCodes = [
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" }, { code: "+355", country: "Albania", flag: "🇦🇱" }, { code: "+213", country: "Algeria", flag: "🇩🇿" },
  { code: "+376", country: "Andorra", flag: "🇦🇩" }, { code: "+244", country: "Angola", flag: "🇦🇴" }, { code: "+1-268", country: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" }, { code: "+374", country: "Armenia", flag: "🇦🇲" }, { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+43", country: "Austria", flag: "🇦🇹" }, { code: "+994", country: "Azerbaijan", flag: "🇦🇿" }, { code: "+1-242", country: "Bahamas", flag: "🇧🇸" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" }, { code: "+880", country: "Bangladesh", flag: "🇧🇩" }, { code: "+1-246", country: "Barbados", flag: "🇧🇧" },
  { code: "+375", country: "Belarus", flag: "🇧🇾" }, { code: "+32", country: "Belgium", flag: "🇧🇪" }, { code: "+501", country: "Belize", flag: "🇧🇿" },
  { code: "+229", country: "Benin", flag: "🇧🇯" }, { code: "+975", country: "Bhutan", flag: "🇧🇹" }, { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+387", country: "Bosnia and Herzegovina", flag: "🇧🇦" }, { code: "+267", country: "Botswana", flag: "🇧🇼" }, { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+673", country: "Brunei", flag: "🇧🇳" }, { code: "+359", country: "Bulgaria", flag: "🇧🇬" }, { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" }, { code: "+238", country: "Cabo Verde", flag: "🇨🇻" }, { code: "+855", country: "Cambodia", flag: "🇰🇭" },
  { code: "+237", country: "Cameroon", flag: "🇨🇲" }, { code: "+1", country: "Canada", flag: "🇨🇦" }, { code: "+236", country: "Central African Republic", flag: "🇨🇫" },
  { code: "+235", country: "Chad", flag: "🇹🇩" }, { code: "+56", country: "Chile", flag: "🇨🇱" }, { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" }, { code: "+269", country: "Comoros", flag: "🇰🇲" }, { code: "+242", country: "Congo", flag: "🇨🇬" },
  { code: "+243", country: "Congo (DRC)", flag: "🇨🇩" }, { code: "+506", country: "Costa Rica", flag: "🇨🇷" }, { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" }, { code: "+357", country: "Cyprus", flag: "🇨🇾" }, { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" }, { code: "+253", country: "Djibouti", flag: "🇩🇯" }, { code: "+1-767", country: "Dominica", flag: "🇩🇲" },
  { code: "+1-809", country: "Dominican Republic", flag: "🇩🇴" }, { code: "+670", country: "East Timor", flag: "🇹🇱" }, { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" }, { code: "+503", country: "El Salvador", flag: "🇸🇻" }, { code: "+240", country: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+291", country: "Eritrea", flag: "🇪🇷" }, { code: "+372", country: "Estonia", flag: "🇪🇪" }, { code: "+268", country: "Eswatini", flag: "🇸🇿" },
  { code: "+251", country: "Ethiopia", flag: "🇪🇹" }, { code: "+679", country: "Fiji", flag: "🇫🇯" }, { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+33", country: "France", flag: "🇫🇷" }, { code: "+241", country: "Gabon", flag: "🇬🇦" }, { code: "+220", country: "Gambia", flag: "🇬🇲" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" }, { code: "+49", country: "Germany", flag: "🇩🇪" }, { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+30", country: "Greece", flag: "🇬🇷" }, { code: "+1-473", country: "Grenada", flag: "🇬🇩" }, { code: "+502", country: "Guatemala", flag: "🇬🇹" },
  { code: "+224", country: "Guinea", flag: "🇬🇳" }, { code: "+245", country: "Guinea-Bissau", flag: "🇬🇼" }, { code: "+592", country: "Guyana", flag: "🇬🇾" },
  { code: "+509", country: "Haiti", flag: "🇭🇹" }, { code: "+504", country: "Honduras", flag: "🇭🇳" }, { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+354", country: "Iceland", flag: "🇮🇸" }, { code: "+91", country: "India", flag: "🇮🇳" }, { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+98", country: "Iran", flag: "🇮🇷" }, { code: "+964", country: "Iraq", flag: "🇮🇶" }, { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+972", country: "Israel", flag: "🇮🇱" }, { code: "+39", country: "Italy", flag: "🇮🇹" }, { code: "+225", country: "Ivory Coast", flag: "🇨🇮" },
  { code: "+1-876", country: "Jamaica", flag: "🇯🇲" }, { code: "+81", country: "Japan", flag: "🇯🇵" }, { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+7", country: "Kazakhstan", flag: "🇰🇿" }, { code: "+254", country: "Kenya", flag: "🇰🇪" }, { code: "+686", country: "Kiribati", flag: "🇰🇮" },
  { code: "+383", country: "Kosovo", flag: "🇽🇰" }, { code: "+965", country: "Kuwait", flag: "🇰🇼" }, { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+856", country: "Laos", flag: "🇱🇦" }, { code: "+371", country: "Latvia", flag: "🇱🇻" }, { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" }, { code: "+231", country: "Liberia", flag: "🇱🇷" }, { code: "+218", country: "Libya", flag: "🇱🇾" },
  { code: "+423", country: "Liechtenstein", flag: "🇱🇮" }, { code: "+370", country: "Lithuania", flag: "🇱🇹" }, { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
  { code: "+261", country: "Madagascar", flag: "🇲🇬" }, { code: "+265", country: "Malawi", flag: "🇲🇼" }, { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" }, { code: "+223", country: "Mali", flag: "🇲🇱" }, { code: "+356", country: "Malta", flag: "🇲🇹" },
  { code: "+692", country: "Marshall Islands", flag: "🇲🇭" }, { code: "+222", country: "Mauritania", flag: "🇲🇷" }, { code: "+230", country: "Mauritius", flag: "🇲🇺" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" }, { code: "+691", country: "Micronesia", flag: "🇫🇲" }, { code: "+373", country: "Moldova", flag: "🇲🇩" },
  { code: "+377", country: "Monaco", flag: "🇲🇨" }, { code: "+976", country: "Mongolia", flag: "🇲🇳" }, { code: "+382", country: "Montenegro", flag: "🇲🇪" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" }, { code: "+258", country: "Mozambique", flag: "🇲🇿" }, { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" }, { code: "+674", country: "Nauru", flag: "🇳🇷" }, { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" }, { code: "+64", country: "New Zealand", flag: "🇳🇿" }, { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+227", country: "Niger", flag: "🇳🇪" }, { code: "+234", country: "Nigeria", flag: "🇳🇬" }, { code: "+850", country: "North Korea", flag: "🇰🇵" },
  { code: "+389", country: "North Macedonia", flag: "🇲🇰" }, { code: "+47", country: "Norway", flag: "🇳🇴" }, { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" }, { code: "+680", country: "Palau", flag: "🇵🇼" }, { code: "+970", country: "Palestine", flag: "🇵🇸" },
  { code: "+507", country: "Panama", flag: "🇵🇦" }, { code: "+675", country: "Papua New Guinea", flag: "🇵🇬" }, { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+51", country: "Peru", flag: "🇵🇪" }, { code: "+63", country: "Philippines", flag: "🇵🇭" }, { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" }, { code: "+974", country: "Qatar", flag: "🇶🇦" }, { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+7", country: "Russia", flag: "🇷🇺" }, { code: "+250", country: "Rwanda", flag: "🇷🇼" }, { code: "+1-869", country: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "+1-758", country: "Saint Lucia", flag: "🇱🇨" }, { code: "+1-784", country: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "+685", country: "Samoa", flag: "🇼🇸" }, { code: "+378", country: "San Marino", flag: "🇸🇲" }, { code: "+239", country: "Sao Tome and Principe", flag: "🇸🇹" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" }, { code: "+221", country: "Senegal", flag: "🇸🇳" }, { code: "+381", country: "Serbia", flag: "🇷🇸" },
  { code: "+248", country: "Seychelles", flag: "🇸🇨" }, { code: "+232", country: "Sierra Leone", flag: "🇸🇱" }, { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" }, { code: "+386", country: "Slovenia", flag: "🇸🇮" }, { code: "+677", country: "Solomon Islands", flag: "🇸🇧" },
  { code: "+252", country: "Somalia", flag: "🇸🇴" }, { code: "+27", country: "South Africa", flag: "🇿🇦" }, { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+211", country: "South Sudan", flag: "🇸🇸" }, { code: "+34", country: "Spain", flag: "🇪🇸" }, { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+249", country: "Sudan", flag: "🇸🇩" }, { code: "+597", country: "Suriname", flag: "🇸🇷" }, { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" }, { code: "+963", country: "Syria", flag: "🇸🇾" }, { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" }, { code: "+255", country: "Tanzania", flag: "🇹🇿" }, { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+228", country: "Togo", flag: "🇹🇬" }, { code: "+676", country: "Tonga", flag: "🇹🇴" }, { code: "+1-868", country: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" }, { code: "+90", country: "Turkey", flag: "🇹🇷" }, { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+688", country: "Tuvalu", flag: "🇹🇻" }, { code: "+256", country: "Uganda", flag: "🇺🇬" }, { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" }, { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States", flag: "🇺🇸" }, { code: "+598", country: "Uruguay", flag: "🇺🇾" }, { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+678", country: "Vanuatu", flag: "🇻🇺" }, { code: "+379", country: "Vatican City", flag: "🇻🇦" }, { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" }, { code: "+967", country: "Yemen", flag: "🇾🇪" }, { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" }
];

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const categories = [
  "Startup", "Digital Nomad", "Freelancer", "Golden Visa Support", "Immigration Support"
];

const Contact = () => {
  const [form, setForm] = useState({
    name: "", email: "", phoneCode: "", phone: "", country: "", category: "", subject: "", message: "",
  });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!consent) {
      toast({
        title: "Please confirm consent",
        description: "We need your consent to process your enquiry under GDPR.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    const id = crypto.randomUUID();
    const fullPhone = `${form.phoneCode} ${form.phone}`.trim();
    const data = {
      name: form.name,
      email: form.email,
      phone: fullPhone,
      country: form.country,
      category: form.category,
      subject: form.subject,
      message: form.message,
    };

    try {
      // Send notification to info@setlix.pt (recipient is fixed in template `to` field)
      const notify = supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-notification",
          recipientEmail: "info@setlix.pt",
          idempotencyKey: `contact-notify-${id}`,
          templateData: data,
        },
      });
      // Send confirmation to the user
      const confirm = supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-confirmation",
          recipientEmail: form.email,
          idempotencyKey: `contact-confirm-${id}`,
          templateData: { name: form.name, message: form.message },
        },
      });

      const [notifyRes, confirmRes] = await Promise.all([notify, confirm]);
      if (notifyRes.error) throw notifyRes.error;
      // Confirmation failure shouldn't block; just log
      if (confirmRes.error) console.warn("Confirmation email failed", confirmRes.error);

      toast({
        title: "Message sent!",
        description: "Thanks for reaching out — we'll get back to you within 24 hours.",
      });
      setForm({ name: "", email: "", phoneCode: "", phone: "", country: "", category: "", subject: "", message: "" });
      setConsent(false);
    } catch (err: any) {
      console.error("Contact form error", err);
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly at info@setlix.pt.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-section-alt">
      <div className="container mx-auto px-4 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Get in Touch
        </h2>
        <p className="text-muted-foreground text-center mb-10">
          Ready to start your journey to Portugal? Let's discuss how we can help.
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={update("name")}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Email Address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone Number *</label>
              <div className="flex gap-2">
                <select
                  required
                  value={form.phoneCode}
                  onChange={update("phoneCode")}
                  className="w-32 shrink-0 rounded-lg border border-input bg-background px-2 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Code</option>
                  {countryCodes.map((c) => (
                    <option key={`${c.country}-${c.code}`} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={update("phone")}
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Phone Number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Country *</label>
              <select
                required
                value={form.country}
                onChange={update("country")}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select your country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category *</label>
              <select
                required
                value={form.category}
                onChange={update("category")}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select your category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={update("subject")}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Select a subject"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Message *</label>
            <textarea
              required
              maxLength={500}
              rows={5}
              value={form.message}
              onChange={update("message")}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Message"
            />
            <p className="text-xs text-muted-foreground text-right">{form.message.length}/500</p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-input bg-background p-4">
            <input
              id="gdpr-consent"
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="gdpr-consent" className="text-xs text-muted-foreground leading-relaxed">
              I consent to Setlix processing the personal data I provide above (name,
              email, phone, country, message) to respond to my enquiry, in accordance
              with the{" "}
              <a href="/privacy-policy" className="text-primary underline">Privacy Policy</a>.
              I understand I can withdraw my consent at any time by emailing{" "}
              <a href="mailto:info@setlix.pt" className="text-primary underline">info@setlix.pt</a>.
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !consent}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending…" : "Send Message"}
          </button>

          <p className="text-center text-muted-foreground text-sm">
            We'll get back to you within 24 hours
          </p>
        </form>
      </div>
    </section>
  );
};

export default Contact;
