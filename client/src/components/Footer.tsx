import { Link } from "wouter";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-primary via-purple-700 to-pink-600 border-t border-purple-600/20 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Company */}
          <div>
            <h3 className="text-white font-semibold uppercase tracking-wide mb-4">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/about"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <div className="text-white/90 inline-flex items-start gap-2 mt-2">
                  <MapPin size={16} className="mt-1 flex-shrink-0" />
                  <div>
                    <div>Bengaluru, Karnataka</div>
                    <div>Bathinda, Punjab</div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 2: Products */}
          <div>
            <h3 className="text-white font-semibold uppercase tracking-wide mb-4">
              Products
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/plans"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Subscription Plans
                </Link>
              </li>
              <li>
                <Link 
                  href="/universities"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  University Directory
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hey@phozos.com"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-flex items-center gap-2"
                  aria-label="Email Phozos"
                >
                  <Mail size={16} />
                  hey@phozos.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+917526951566"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-flex items-center gap-2"
                  aria-label="Call Phozos"
                >
                  <Phone size={16} />
                  +91-7526951566
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h3 className="text-white font-semibold uppercase tracking-wide mb-4">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/faq"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Contact Support
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms-of-service"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 className="text-white font-semibold uppercase tracking-wide mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/privacy-policy"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms-of-service"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/cookie-policy"
                  className="text-white/90 hover:text-white transition-colors duration-200 inline-block"
                >
                  Cookie Policy
                </Link>
              </li>
              <li className="mt-4">
                <h4 className="text-white font-semibold mb-2">Follow Us</h4>
                <div className="flex gap-3">
                  <a
                    href="https://www.facebook.com/phozos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-white transition-colors duration-200"
                    aria-label="Follow Phozos on Facebook"
                  >
                    <Facebook size={20} />
                  </a>
                  <a
                    href="https://www.instagram.com/phozosofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-white transition-colors duration-200"
                    aria-label="Follow Phozos on Instagram"
                  >
                    <Instagram size={20} />
                  </a>
                  <a
                    href="https://www.twitter.com/phozosofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-white transition-colors duration-200"
                    aria-label="Follow Phozos on Twitter"
                  >
                    <Twitter size={20} />
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-white/20 pt-6">
          <div className="text-center">
            <p className="text-white/90">
              © 2025 Phozos Study Abroad. Empowering international education journeys.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
