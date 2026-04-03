import { Mail, Phone, MapPin, Instagram } from "lucide-react";
import icon from "@/assets/setlix-icon.png";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={icon} alt="Setlix" className="h-8 w-8 object-contain rounded" />
              <span className="font-bold text-xl tracking-wider">SETLIX</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="#about" className="hover:text-primary-foreground transition-colors">About Us</a></li>
              <li><a href="#services" className="hover:text-primary-foreground transition-colors">Services</a></li>
              <li><a href="#contact" className="hover:text-primary-foreground transition-colors">Contact</a></li>
              <li><a href="/privacy-policy" className="hover:text-primary-foreground transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact Info</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                info@setlix.pt
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +351 931 926 855
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Lisbon, Portugal
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm text-primary-foreground/50">
          ©{new Date().getFullYear()} Setlix. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
