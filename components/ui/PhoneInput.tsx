"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, Search, Check } from "lucide-react";

export interface CountryConfig {
  iso: string;
  name: string;
  dialCode: string;
  flag: string;
  digitsLength: number; // standard mobile digits without leading 0
  minDigits: number;
  maxDigits: number;
  placeholder: string;
  example: string;
}

export const COUNTRIES: CountryConfig[] = [
  { iso: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", digitsLength: 10, minDigits: 10, maxDigits: 10, placeholder: "300 1234567", example: "03001234567" },
  { iso: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪", digitsLength: 9, minDigits: 9, maxDigits: 9, placeholder: "50 123 4567", example: "501234567" },
  { iso: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", digitsLength: 9, minDigits: 9, maxDigits: 9, placeholder: "50 123 4567", example: "501234567" },
  { iso: "GB", name: "UK", dialCode: "+44", flag: "🇬🇧", digitsLength: 10, minDigits: 10, maxDigits: 10, placeholder: "7911 123456", example: "7911123456" },
  { iso: "US", name: "USA", dialCode: "+1", flag: "🇺🇸", digitsLength: 10, minDigits: 10, maxDigits: 10, placeholder: "555 123 4567", example: "5551234567" },
  { iso: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", digitsLength: 10, minDigits: 10, maxDigits: 10, placeholder: "555 123 4567", example: "5551234567" },
  { iso: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩", digitsLength: 10, minDigits: 10, maxDigits: 10, placeholder: "1712 345678", example: "1712345678" },
  { iso: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", digitsLength: 10, minDigits: 10, maxDigits: 10, placeholder: "98765 43210", example: "9876543210" },
  { iso: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦", digitsLength: 8, minDigits: 8, maxDigits: 8, placeholder: "3312 3456", example: "33123456" },
  { iso: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲", digitsLength: 8, minDigits: 8, maxDigits: 8, placeholder: "9123 4567", example: "91234567" },
  { iso: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼", digitsLength: 8, minDigits: 8, maxDigits: 8, placeholder: "9123 4567", example: "91234567" },
  { iso: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭", digitsLength: 8, minDigits: 8, maxDigits: 8, placeholder: "3912 3456", example: "39123456" },
  { iso: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷", digitsLength: 10, minDigits: 10, maxDigits: 10, placeholder: "532 123 4567", example: "5321234567" },
  { iso: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", digitsLength: 11, minDigits: 11, maxDigits: 11, placeholder: "138 1234 5678", example: "13812345678" },
  { iso: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", digitsLength: 10, minDigits: 10, maxDigits: 11, placeholder: "151 12345678", example: "15112345678" },
  { iso: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", digitsLength: 9, minDigits: 9, maxDigits: 10, placeholder: "12 345 6789", example: "123456789" },
  { iso: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", digitsLength: 8, minDigits: 8, maxDigits: 8, placeholder: "9123 4567", example: "91234567" },
];

export interface PhoneInputValue {
  countryCode: string;
  number: string;
  fullPhone: string;
  isValid: boolean;
  country: CountryConfig;
}

export interface PhoneInputProps {
  value?: string; // e.g. "+92 300 1234567" or "3001234567"
  defaultCountry?: string; // ISO e.g. "PK" or dial code e.g. "+92"
  onChange: (fullPhone: string, meta: PhoneInputValue) => void;
  error?: boolean | string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PhoneInput({
  value = "",
  defaultCountry = "PK",
  onChange,
  error,
  placeholder,
  disabled,
  className,
  id,
}: PhoneInputProps) {
  // Identify selected country
  const [selectedCountry, setSelectedCountry] = React.useState<CountryConfig>(() => {
    if (value && value.startsWith("+")) {
      const match = COUNTRIES.find((c) => value.startsWith(c.dialCode));
      if (match) return match;
    }
    const found = COUNTRIES.find((c) => c.iso === defaultCountry || c.dialCode === defaultCountry);
    return found || COUNTRIES[0];
  });

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Extract raw digits
  const digits = React.useMemo(() => {
    if (!value) return "";
    let clean = value.replace(/\D/g, "");
    const dialDigits = selectedCountry.dialCode.replace(/\D/g, "");
    if (clean.startsWith(dialDigits)) {
      clean = clean.slice(dialDigits.length);
    }
    if (clean.startsWith("0")) {
      clean = clean.slice(1);
    }
    return clean.slice(0, selectedCountry.maxDigits);
  }, [value, selectedCountry]);

  // Format digits with clear readable spacing
  const formattedDigits = React.useMemo(() => {
    if (!digits) return "";
    if (selectedCountry.iso === "PK" || selectedCountry.iso === "GB" || selectedCountry.iso === "IN") {
      if (digits.length <= 3) return digits;
      return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    }
    if (selectedCountry.iso === "AE" || selectedCountry.iso === "SA") {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }
    if (selectedCountry.iso === "US" || selectedCountry.iso === "CA") {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }, [digits, selectedCountry]);

  const isValid = digits.length >= selectedCountry.minDigits && digits.length <= selectedCountry.maxDigits;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.startsWith("0")) {
      raw = raw.slice(1);
    }
    const cleanNumber = raw.slice(0, selectedCountry.maxDigits);
    const full = cleanNumber ? `${selectedCountry.dialCode} ${cleanNumber}` : "";
    const valid = cleanNumber.length >= selectedCountry.minDigits && cleanNumber.length <= selectedCountry.maxDigits;

    onChange(full, {
      countryCode: selectedCountry.dialCode,
      number: cleanNumber,
      fullPhone: full,
      isValid: valid,
      country: selectedCountry,
    });
  };

  const handleSelectCountry = (country: CountryConfig) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery("");

    const cleanNumber = digits.slice(0, country.maxDigits);
    const full = cleanNumber ? `${country.dialCode} ${cleanNumber}` : "";
    const valid = cleanNumber.length >= country.minDigits && cleanNumber.length <= country.maxDigits;

    onChange(full, {
      countryCode: country.dialCode,
      number: cleanNumber,
      fullPhone: full,
      isValid: valid,
      country,
    });
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = React.useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex items-stretch w-full rounded-lg border bg-white shadow-2xs transition-all",
          "focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600",
          error
            ? "border-rose-500 ring-1 ring-rose-500"
            : "border-slate-300 hover:border-slate-400",
          disabled && "bg-slate-50 opacity-70 cursor-not-allowed"
        )}
      >
        {/* Country Selector: Dedicated 180px Width Displaying Flag + Country + Dial Code */}
        <div className="relative w-[180px] shrink-0" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center justify-between w-full h-full px-3 py-2.5 bg-slate-50/90 hover:bg-slate-100/80 border-r border-slate-300 rounded-l-lg text-xs font-semibold text-slate-800 transition-colors cursor-pointer select-none"
            title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-base leading-none shrink-0">{selectedCountry.flag}</span>
              <span className="truncate font-medium text-slate-900">{selectedCountry.name}</span>
              <span className="font-mono text-slate-500 text-[11px] shrink-0">({selectedCountry.dialCode})</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Searchable Country Dropdown Popover */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-80 max-h-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="p-2.5 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search country or dial code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-50 p-1">
                {filteredCountries.map((c) => {
                  const isSelected = c.iso === selectedCountry.iso;
                  return (
                    <button
                      key={c.iso}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={cn(
                        "w-full px-3 py-2.5 flex items-center justify-between text-left text-xs rounded-lg transition-colors hover:bg-blue-50 cursor-pointer",
                        isSelected ? "bg-blue-50/90 font-bold text-blue-900" : "text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({c.dialCode})</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
                {filteredCountries.length === 0 && (
                  <p className="p-4 text-center text-xs text-slate-400">No countries found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Proportional Phone Number Input (Takes Full Remaining Width) */}
        <div className="flex-1 min-w-0 relative flex items-center">
          <input
            id={id}
            type="tel"
            disabled={disabled}
            value={formattedDigits}
            onChange={handleInputChange}
            placeholder={placeholder || `e.g. ${selectedCountry.placeholder}`}
            className="w-full px-3.5 py-2 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
          />

          {/* Validation Badge inside input */}
          <div className="pr-3 flex items-center gap-1.5 shrink-0 select-none">
            {digits.length > 0 && (
              <span
                className={cn(
                  "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border",
                  isValid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                {digits.length}/{selectedCountry.digitsLength} digits
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Helpful Length & Mask Hint */}
      <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500 px-0.5">
        <span>
          Format: <strong>{selectedCountry.dialCode} {selectedCountry.placeholder}</strong> ({selectedCountry.digitsLength} digits)
        </span>
        {digits.length > 0 && !isValid && (
          <span className="text-amber-600 font-semibold">
            {selectedCountry.digitsLength - digits.length > 0
              ? `${selectedCountry.digitsLength - digits.length} more digits needed`
              : `Max ${selectedCountry.digitsLength} digits`}
          </span>
        )}
      </div>
    </div>
  );
}
