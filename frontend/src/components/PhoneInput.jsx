import { useState, useRef, useEffect } from "react";

const COUNTRY_CODES = [
  { code: "IT", prefix: "+39", name: "Italia", flag: "🇮🇹" },
  { code: "US", prefix: "+1", name: "Stati Uniti", flag: "🇺🇸" },
  { code: "GB", prefix: "+44", name: "Regno Unito", flag: "🇬🇧" },
  { code: "DE", prefix: "+49", name: "Germania", flag: "🇩🇪" },
  { code: "FR", prefix: "+33", name: "Francia", flag: "🇫🇷" },
  { code: "ES", prefix: "+34", name: "Spagna", flag: "🇪🇸" },
  { code: "PT", prefix: "+351", name: "Portogallo", flag: "🇵🇹" },
  { code: "CH", prefix: "+41", name: "Svizzera", flag: "🇨🇭" },
  { code: "AT", prefix: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "BE", prefix: "+32", name: "Belgio", flag: "🇧🇪" },
  { code: "NL", prefix: "+31", name: "Paesi Bassi", flag: "🇳🇱" },
  { code: "PL", prefix: "+48", name: "Polonia", flag: "🇵🇱" },
  { code: "RO", prefix: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "GR", prefix: "+30", name: "Grecia", flag: "🇬🇷" },
  { code: "SE", prefix: "+46", name: "Svezia", flag: "🇸🇪" },
  { code: "NO", prefix: "+47", name: "Norvegia", flag: "🇳🇴" },
  { code: "DK", prefix: "+45", name: "Danimarca", flag: "🇩🇰" },
  { code: "FI", prefix: "+358", name: "Finlandia", flag: "🇫🇮" },
  { code: "IE", prefix: "+353", name: "Irlanda", flag: "🇮🇪" },
  { code: "CZ", prefix: "+420", name: "Repubblica Ceca", flag: "🇨🇿" },
  { code: "HU", prefix: "+36", name: "Ungheria", flag: "🇭🇺" },
  { code: "HR", prefix: "+385", name: "Croazia", flag: "🇭🇷" },
  { code: "SI", prefix: "+386", name: "Slovenia", flag: "🇸🇮" },
  { code: "SK", prefix: "+421", name: "Slovacchia", flag: "🇸🇰" },
  { code: "BG", prefix: "+359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "UA", prefix: "+380", name: "Ucraina", flag: "🇺🇦" },
  { code: "RU", prefix: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "TR", prefix: "+90", name: "Turchia", flag: "🇹🇷" },
  { code: "CN", prefix: "+86", name: "Cina", flag: "🇨🇳" },
  { code: "JP", prefix: "+81", name: "Giappone", flag: "🇯🇵" },
  { code: "KR", prefix: "+82", name: "Corea del Sud", flag: "🇰🇷" },
  { code: "IN", prefix: "+91", name: "India", flag: "🇮🇳" },
  { code: "AU", prefix: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", prefix: "+64", name: "Nuova Zelanda", flag: "🇳🇿" },
  { code: "BR", prefix: "+55", name: "Brasile", flag: "🇧🇷" },
  { code: "AR", prefix: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "MX", prefix: "+52", name: "Messico", flag: "🇲🇽" },
  { code: "CA", prefix: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "ZA", prefix: "+27", name: "Sudafrica", flag: "🇿🇦" },
  { code: "EG", prefix: "+20", name: "Egitto", flag: "🇪🇬" },
  { code: "MA", prefix: "+212", name: "Marocco", flag: "🇲🇦" },
  { code: "TN", prefix: "+216", name: "Tunisia", flag: "🇹🇳" },
  { code: "AE", prefix: "+971", name: "Emirati Arabi", flag: "🇦🇪" },
  { code: "SA", prefix: "+966", name: "Arabia Saudita", flag: "🇸🇦" },
  { code: "IL", prefix: "+972", name: "Israele", flag: "🇮🇱" },
  { code: "SG", prefix: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "MY", prefix: "+60", name: "Malesia", flag: "🇲🇾" },
  { code: "TH", prefix: "+66", name: "Thailandia", flag: "🇹🇭" },
  { code: "PH", prefix: "+63", name: "Filippine", flag: "🇵🇭" },
  { code: "ID", prefix: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "VN", prefix: "+84", name: "Vietnam", flag: "🇻🇳" },
];

export default function PhoneInput({ value, onChange, disabled, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]); // Default Italia
  const [phoneNumber, setPhoneNumber] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Parse initial value to extract prefix and number
  useEffect(() => {
    if (value) {
      // Try to match an existing prefix
      const matchedCountry = COUNTRY_CODES.find(c => value.startsWith(c.prefix));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(value.slice(matchedCountry.prefix.length).trim());
      } else {
        // If no prefix matched, assume it's just the number
        setPhoneNumber(value.replace(/^\+\d+\s*/, ""));
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch("");
    // Update the full value
    const fullNumber = phoneNumber ? `${country.prefix} ${phoneNumber}` : "";
    onChange(fullNumber);
    // Focus the input after selection
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handlePhoneChange = (e) => {
    const num = e.target.value.replace(/[^\d\s-]/g, ""); // Allow only digits, spaces, dashes
    setPhoneNumber(num);
    const fullNumber = num ? `${selectedCountry.prefix} ${num}` : "";
    onChange(fullNumber);
  };

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.prefix.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="phone-input-container" ref={dropdownRef}>
      <div className="phone-input-wrapper">
        {/* Country selector button */}
        <button
          type="button"
          className={`phone-country-btn ${isOpen ? "open" : ""}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="country-flag">{selectedCountry.flag}</span>
          <span className="country-prefix">{selectedCountry.prefix}</span>
          <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Phone number input */}
        <input
          ref={inputRef}
          type="tel"
          className="phone-number-input"
          placeholder={placeholder || "123 456 7890"}
          value={phoneNumber}
          onChange={handlePhoneChange}
          disabled={disabled}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="phone-dropdown">
          <div className="phone-dropdown-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Cerca paese..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="phone-dropdown-list">
            {filteredCountries.length === 0 ? (
              <div className="phone-dropdown-empty">Nessun paese trovato</div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className={`phone-dropdown-item ${selectedCountry.code === country.code ? "selected" : ""}`}
                  onClick={() => handleCountrySelect(country)}
                >
                  <span className="country-flag">{country.flag}</span>
                  <span className="country-name">{country.name}</span>
                  <span className="country-prefix">{country.prefix}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
