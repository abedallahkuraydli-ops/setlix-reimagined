import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-32 pb-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Use</h1>
          <p className="text-muted-foreground mb-10 text-sm">Last updated: April 21, 2026</p>

          <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">1. About us</h2>
            <p>
              This website (<strong>setlix.pt</strong>) is operated by Setlix, based in
              Lisbon, Portugal. Contact:{" "}
              <a href="mailto:info@setlix.pt" className="text-primary underline">info@setlix.pt</a>.
            </p>

            <h2 className="text-xl font-semibold text-foreground">2. Acceptance of terms</h2>
            <p>
              By accessing or using this website you agree to be bound by these Terms of
              Use and by our{" "}
              <a href="/privacy-policy" className="text-primary underline">Privacy Policy</a>{" "}
              and{" "}
              <a href="/cookie-policy" className="text-primary underline">Cookie Policy</a>.
              If you do not agree, please do not use the site.
            </p>

            <h2 className="text-xl font-semibold text-foreground">3. Information on the site</h2>
            <p>
              The content on this site is for general information only and does not
              constitute legal, tax, immigration or financial advice. You should always
              seek qualified professional advice before making any decision based on the
              information presented here.
            </p>

            <h2 className="text-xl font-semibold text-foreground">4. Intellectual property</h2>
            <p>
              All content on this website — including text, logos, graphics, and design —
              is owned by Setlix or its licensors and is protected by Portuguese and EU
              intellectual property laws. You may view and print content for personal,
              non-commercial use only.
            </p>

            <h2 className="text-xl font-semibold text-foreground">5. User obligations</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/80">
              <li>Use the site in any unlawful way or for any unlawful purpose;</li>
              <li>Submit false, misleading or fraudulent information through our forms;</li>
              <li>Attempt to gain unauthorised access to the site, its server or any related systems;</li>
              <li>Interfere with the proper functioning of the site (including via automated tools, scraping or denial-of-service attempts).</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground">6. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by Portuguese law, Setlix shall not be
              liable for any indirect, incidental or consequential damages arising from
              the use of, or inability to use, this website. Nothing in these Terms limits
              liability that cannot be excluded under applicable law (e.g. liability for
              gross negligence or wilful misconduct).
            </p>

            <h2 className="text-xl font-semibold text-foreground">7. External links</h2>
            <p>
              Our site may contain links to third-party websites. We are not responsible
              for the content, privacy practices or availability of those sites.
            </p>

            <h2 className="text-xl font-semibold text-foreground">8. Consumer rights & dispute resolution</h2>
            <p>
              If you are a consumer based in the European Union, you have the right to use
              the European Commission's Online Dispute Resolution (ODR) platform available
              at{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                ec.europa.eu/consumers/odr
              </a>
              . Portuguese consumers may also contact{" "}
              <a
                href="https://www.consumidor.gov.pt/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Direção-Geral do Consumidor
              </a>
              .
            </p>

            <h2 className="text-xl font-semibold text-foreground">9. Governing law</h2>
            <p>
              These Terms are governed by the laws of Portugal. Any dispute arising from
              the use of this website shall be subject to the exclusive jurisdiction of
              the courts of Lisbon, Portugal, without prejudice to any mandatory
              consumer-protection rights you may have in your country of residence.
            </p>

            <h2 className="text-xl font-semibold text-foreground">10. Changes to these terms</h2>
            <p>
              We may update these Terms from time to time. Changes will be posted on this
              page with an updated revision date. Continued use of the site after changes
              are posted constitutes acceptance of the revised Terms.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Terms;
