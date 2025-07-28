import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { countryCodes, getCountryByCode, extractCountryFromPhoneNumber } from "@/lib/countryCodes";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({ 
  value, 
  onChange, 
  placeholder = "Enter phone number", 
  className = "",
  disabled = false 
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState("US"); // Default to US
  const [phoneNumber, setPhoneNumber] = useState("");

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      const country = extractCountryFromPhoneNumber(value);
      if (country) {
        setSelectedCountry(country.code);
        setPhoneNumber(value.replace(country.phonePrefix, ""));
      } else {
        // If no country code detected, assume current selection
        const currentCountry = getCountryByCode(selectedCountry);
        if (currentCountry && value.startsWith(currentCountry.phonePrefix)) {
          setPhoneNumber(value.replace(currentCountry.phonePrefix, ""));
        } else {
          setPhoneNumber(value);
        }
      }
    }
  }, [value, selectedCountry]);

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = getCountryByCode(countryCode);
    if (country) {
      const fullNumber = `${country.phonePrefix}${phoneNumber}`;
      onChange(fullNumber);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove any non-digit characters except for spaces and dashes for formatting
    const cleanedValue = inputValue.replace(/[^\d\s-]/g, '');
    setPhoneNumber(cleanedValue);
    
    const country = getCountryByCode(selectedCountry);
    if (country) {
      const fullNumber = `${country.phonePrefix}${cleanedValue}`;
      onChange(fullNumber);
    }
  };

  const selectedCountryData = getCountryByCode(selectedCountry);

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select value={selectedCountry} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            {selectedCountryData && (
              <div className="flex items-center gap-2">
                <span>{selectedCountryData.flag}</span>
                <span className="text-sm">{selectedCountryData.phonePrefix}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {countryCodes.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <div className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span className="text-sm">{country.name}</span>
                <span className="text-xs text-gray-500">{country.phonePrefix}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className="flex-1"
        disabled={disabled}
      />
    </div>
  );
}