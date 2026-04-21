import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-32 pb-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-10 text-sm">Last updated: April 3, 2026</p>

          <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">1. Data Controller</h2>
            <p>
              Setlix ("we", "us", or "our") is the data controller responsible for processing your personal data. 
              We are based in Lisbon, Portugal. For any questions regarding this policy, contact us at{" "}
              <a href="mailto:info@setlix.pt" className="text-primary underline">info@setlix.pt</a>.
            </p>

            <h2 className="text-xl font-semibold text-foreground">2. Data We Collect</h2>
            <p>We may collect the following categories of personal data:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/80">
              <li><strong>Identity data:</strong> full name, nationality</li>
              <li><strong>Contact data:</strong> email address, phone number, country of residence</li>
              <li><strong>Enquiry data:</strong> category of interest, message content, subject</li>
              <li><strong>Technical data:</strong> IP address, browser type, device information, cookies</li>
              <li><strong>Usage data:</strong> pages visited, time spent on site, referral source</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">3. Legal Basis for Processing</h2>
            <p>Under the General Data Protection Regulation (GDPR), we process your personal data based on:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/80">
              <li><strong>Consent:</strong> when you submit a contact form or subscribe to communications</li>
              <li><strong>Legitimate interest:</strong> to improve our services and respond to enquiries</li>
              <li><strong>Contractual necessity:</strong> to provide the services you have requested</li>
              <li><strong>Legal obligation:</strong> to comply with applicable laws and regulations</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">4. How We Use Your Data</h2>
            <p>We use your personal data to:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/80">
              <li>Respond to your enquiries and provide requested services</li>
              <li>Process applications for relocation, business setup, or Golden Visa services</li>
              <li>Send relevant updates about our services (only with your consent)</li>
              <li>Improve our website and user experience</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">5. Data Sharing</h2>
            <p>
              We do not sell your personal data. We may share your data with trusted third parties only 
              when necessary to provide our services, including legal advisors, financial service providers, 
              and government authorities as required by law. All third parties are bound by data processing agreements 
              in compliance with the GDPR.
            </p>

            <h2 className="text-xl font-semibold text-foreground">6. International Transfers</h2>
            <p>
              Your data is primarily processed within the European Economic Area (EEA). If any data is 
              transferred outside the EEA, we ensure adequate safeguards are in place, such as Standard 
              Contractual Clauses approved by the European Commission.
            </p>

            <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to fulfil the purposes for which 
              it was collected, or as required by law. Contact form data is retained for a maximum of 
              24 months unless a longer retention period is required for ongoing services or legal obligations.
            </p>

            <h2 className="text-xl font-semibold text-foreground">8. Your Rights</h2>
            <p>Under the GDPR, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/80">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you</li>
              <li><strong>Rectification:</strong> request correction of inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> request deletion of your personal data ("right to be forgotten")</li>
              <li><strong>Restriction:</strong> request restriction of processing in certain circumstances</li>
              <li><strong>Portability:</strong> receive your data in a structured, commonly used format</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interest or direct marketing</li>
              <li><strong>Withdraw consent:</strong> withdraw consent at any time without affecting prior processing</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:info@setlix.pt" className="text-primary underline">info@setlix.pt</a>.
              We will respond within 30 days.
            </p>

            <h2 className="text-xl font-semibold text-foreground">9. Cookies & Analytics</h2>
            <p>
              We use strictly necessary cookies/storage to remember your cookie consent choice.
              With your explicit consent, we also use <strong>Google Analytics 4</strong>
              (provider: Google Ireland Limited) with IP anonymisation to understand how
              visitors use our site. Analytics cookies are not set unless you accept them
              in our consent banner. You can review or change your choice at any time on
              our <a href="/cookie-policy" className="text-primary underline">Cookie Policy</a> page.
              Some Google Analytics data may be transferred outside the EEA under the
              EU-US Data Privacy Framework and Standard Contractual Clauses.
            </p>

            <h2 className="text-xl font-semibold text-foreground">10. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your personal data 
              against unauthorised access, alteration, disclosure, or destruction, in accordance with 
              Article 32 of the GDPR.
            </p>

            <h2 className="text-xl font-semibold text-foreground">11. Supervisory Authority</h2>
            <p>
              If you believe your data protection rights have been violated, you have the right to lodge a 
              complaint with the Portuguese Data Protection Authority (Comissão Nacional de Proteção de Dados — CNPD) 
              or any other competent supervisory authority within the EU.
            </p>

            <h2 className="text-xl font-semibold text-foreground">12. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be posted on this page 
              with an updated revision date. We encourage you to review this policy periodically.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
