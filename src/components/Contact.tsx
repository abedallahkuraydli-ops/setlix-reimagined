import { useState } from "react";

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
  const [charCount, setCharCount] = useState(0);

  return (
    <section id="contact" className="py-24 bg-section-alt">
      <div className="container mx-auto px-4 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Get in Touch
        </h2>
        <p className="text-muted-foreground text-center mb-10">
          Ready to start your journey to Portugal? Let's discuss how we can help.
        </p>

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email Address *</label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Email Address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
              <div className="flex gap-2">
                <select className="w-28 shrink-0 rounded-lg border border-input bg-background px-2 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Code</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+351">🇵🇹 +351</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+39">🇮🇹 +39</option>
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+82">🇰🇷 +82</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+7">🇷🇺 +7</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+27">🇿🇦 +27</option>
                  <option value="+234">🇳🇬 +234</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+54">🇦🇷 +54</option>
                  <option value="+31">🇳🇱 +31</option>
                  <option value="+46">🇸🇪 +46</option>
                  <option value="+47">🇳🇴 +47</option>
                  <option value="+48">🇵🇱 +48</option>
                  <option value="+41">🇨🇭 +41</option>
                  <option value="+90">🇹🇷 +90</option>
                  <option value="+20">🇪🇬 +20</option>
                  <option value="+62">🇮🇩 +62</option>
                  <option value="+60">🇲🇾 +60</option>
                  <option value="+63">🇵🇭 +63</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+66">🇹🇭 +66</option>
                  <option value="+84">🇻🇳 +84</option>
                  <option value="+353">🇮🇪 +353</option>
                  <option value="+32">🇧🇪 +32</option>
                  <option value="+43">🇦🇹 +43</option>
                  <option value="+30">🇬🇷 +30</option>
                  <option value="+45">🇩🇰 +45</option>
                  <option value="+358">🇫🇮 +358</option>
                  <option value="+64">🇳🇿 +64</option>
                  <option value="+56">🇨🇱 +56</option>
                  <option value="+57">🇨🇴 +57</option>
                </select>
                <input
                  type="tel"
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Phone Number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Country *</label>
              <select className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
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
              <select className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
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
              onChange={(e) => setCharCount(e.target.value.length)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Message"
            />
            <p className="text-xs text-muted-foreground text-right">{charCount}/500</p>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Send Message
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
