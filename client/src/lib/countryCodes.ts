// Country codes with names and phone prefixes
export interface CountryCode {
  code: string;
  name: string;
  phonePrefix: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  { code: "US", name: "United States", phonePrefix: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", phonePrefix: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", phonePrefix: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", phonePrefix: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", phonePrefix: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", phonePrefix: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", phonePrefix: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", phonePrefix: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", phonePrefix: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", phonePrefix: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", phonePrefix: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", phonePrefix: "+43", flag: "🇦🇹" },
  { code: "SE", name: "Sweden", phonePrefix: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", phonePrefix: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", phonePrefix: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", phonePrefix: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", phonePrefix: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", phonePrefix: "+420", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", phonePrefix: "+36", flag: "🇭🇺" },
  { code: "RO", name: "Romania", phonePrefix: "+40", flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria", phonePrefix: "+359", flag: "🇧🇬" },
  { code: "GR", name: "Greece", phonePrefix: "+30", flag: "🇬🇷" },
  { code: "PT", name: "Portugal", phonePrefix: "+351", flag: "🇵🇹" },
  { code: "IE", name: "Ireland", phonePrefix: "+353", flag: "🇮🇪" },
  { code: "IS", name: "Iceland", phonePrefix: "+354", flag: "🇮🇸" },
  { code: "LU", name: "Luxembourg", phonePrefix: "+352", flag: "🇱🇺" },
  { code: "MT", name: "Malta", phonePrefix: "+356", flag: "🇲🇹" },
  { code: "CY", name: "Cyprus", phonePrefix: "+357", flag: "🇨🇾" },
  { code: "RU", name: "Russia", phonePrefix: "+7", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", phonePrefix: "+380", flag: "🇺🇦" },
  { code: "BY", name: "Belarus", phonePrefix: "+375", flag: "🇧🇾" },
  { code: "MD", name: "Moldova", phonePrefix: "+373", flag: "🇲🇩" },
  { code: "EE", name: "Estonia", phonePrefix: "+372", flag: "🇪🇪" },
  { code: "LV", name: "Latvia", phonePrefix: "+371", flag: "🇱🇻" },
  { code: "LT", name: "Lithuania", phonePrefix: "+370", flag: "🇱🇹" },
  { code: "SK", name: "Slovakia", phonePrefix: "+421", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", phonePrefix: "+386", flag: "🇸🇮" },
  { code: "HR", name: "Croatia", phonePrefix: "+385", flag: "🇭🇷" },
  { code: "BA", name: "Bosnia and Herzegovina", phonePrefix: "+387", flag: "🇧🇦" },
  { code: "ME", name: "Montenegro", phonePrefix: "+382", flag: "🇲🇪" },
  { code: "RS", name: "Serbia", phonePrefix: "+381", flag: "🇷🇸" },
  { code: "MK", name: "North Macedonia", phonePrefix: "+389", flag: "🇲🇰" },
  { code: "AL", name: "Albania", phonePrefix: "+355", flag: "🇦🇱" },
  { code: "XK", name: "Kosovo", phonePrefix: "+383", flag: "🇽🇰" },
  { code: "JP", name: "Japan", phonePrefix: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", phonePrefix: "+82", flag: "🇰🇷" },
  { code: "CN", name: "China", phonePrefix: "+86", flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong", phonePrefix: "+852", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", phonePrefix: "+886", flag: "🇹🇼" },
  { code: "SG", name: "Singapore", phonePrefix: "+65", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", phonePrefix: "+60", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", phonePrefix: "+66", flag: "🇹🇭" },
  { code: "PH", name: "Philippines", phonePrefix: "+63", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", phonePrefix: "+62", flag: "🇮🇩" },
  { code: "VN", name: "Vietnam", phonePrefix: "+84", flag: "🇻🇳" },
  { code: "IN", name: "India", phonePrefix: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", phonePrefix: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", phonePrefix: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", phonePrefix: "+94", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", phonePrefix: "+977", flag: "🇳🇵" },
  { code: "BT", name: "Bhutan", phonePrefix: "+975", flag: "🇧🇹" },
  { code: "MV", name: "Maldives", phonePrefix: "+960", flag: "🇲🇻" },
  { code: "AF", name: "Afghanistan", phonePrefix: "+93", flag: "🇦🇫" },
  { code: "IR", name: "Iran", phonePrefix: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", phonePrefix: "+964", flag: "🇮🇶" },
  { code: "SA", name: "Saudi Arabia", phonePrefix: "+966", flag: "🇸🇦" },
  { code: "AE", name: "United Arab Emirates", phonePrefix: "+971", flag: "🇦🇪" },
  { code: "QA", name: "Qatar", phonePrefix: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", phonePrefix: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", phonePrefix: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", phonePrefix: "+968", flag: "🇴🇲" },
  { code: "YE", name: "Yemen", phonePrefix: "+967", flag: "🇾🇪" },
  { code: "JO", name: "Jordan", phonePrefix: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon", phonePrefix: "+961", flag: "🇱🇧" },
  { code: "SY", name: "Syria", phonePrefix: "+963", flag: "🇸🇾" },
  { code: "IL", name: "Israel", phonePrefix: "+972", flag: "🇮🇱" },
  { code: "PS", name: "Palestine", phonePrefix: "+970", flag: "🇵🇸" },
  { code: "TR", name: "Turkey", phonePrefix: "+90", flag: "🇹🇷" },
  { code: "CY", name: "Cyprus", phonePrefix: "+357", flag: "🇨🇾" },
  { code: "EG", name: "Egypt", phonePrefix: "+20", flag: "🇪🇬" },
  { code: "LY", name: "Libya", phonePrefix: "+218", flag: "🇱🇾" },
  { code: "TN", name: "Tunisia", phonePrefix: "+216", flag: "🇹🇳" },
  { code: "DZ", name: "Algeria", phonePrefix: "+213", flag: "🇩🇿" },
  { code: "MA", name: "Morocco", phonePrefix: "+212", flag: "🇲🇦" },
  { code: "SD", name: "Sudan", phonePrefix: "+249", flag: "🇸🇩" },
  { code: "ZA", name: "South Africa", phonePrefix: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", phonePrefix: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", phonePrefix: "+254", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", phonePrefix: "+233", flag: "🇬🇭" },
  { code: "ET", name: "Ethiopia", phonePrefix: "+251", flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", phonePrefix: "+255", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", phonePrefix: "+256", flag: "🇺🇬" },
  { code: "RW", name: "Rwanda", phonePrefix: "+250", flag: "🇷🇼" },
  { code: "ZW", name: "Zimbabwe", phonePrefix: "+263", flag: "🇿🇼" },
  { code: "ZM", name: "Zambia", phonePrefix: "+260", flag: "🇿🇲" },
  { code: "MW", name: "Malawi", phonePrefix: "+265", flag: "🇲🇼" },
  { code: "MZ", name: "Mozambique", phonePrefix: "+258", flag: "🇲🇿" },
  { code: "BW", name: "Botswana", phonePrefix: "+267", flag: "🇧🇼" },
  { code: "NA", name: "Namibia", phonePrefix: "+264", flag: "🇳🇦" },
  { code: "SZ", name: "Eswatini", phonePrefix: "+268", flag: "🇸🇿" },
  { code: "LS", name: "Lesotho", phonePrefix: "+266", flag: "🇱🇸" },
  { code: "BR", name: "Brazil", phonePrefix: "+55", flag: "🇧🇷" },
  { code: "AR", name: "Argentina", phonePrefix: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", phonePrefix: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", phonePrefix: "+57", flag: "🇨🇴" },
  { code: "PE", name: "Peru", phonePrefix: "+51", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", phonePrefix: "+58", flag: "🇻🇪" },
  { code: "EC", name: "Ecuador", phonePrefix: "+593", flag: "🇪🇨" },
  { code: "BO", name: "Bolivia", phonePrefix: "+591", flag: "🇧🇴" },
  { code: "PY", name: "Paraguay", phonePrefix: "+595", flag: "🇵🇾" },
  { code: "UY", name: "Uruguay", phonePrefix: "+598", flag: "🇺🇾" },
  { code: "GY", name: "Guyana", phonePrefix: "+592", flag: "🇬🇾" },
  { code: "SR", name: "Suriname", phonePrefix: "+597", flag: "🇸🇷" },
  { code: "MX", name: "Mexico", phonePrefix: "+52", flag: "🇲🇽" },
  { code: "GT", name: "Guatemala", phonePrefix: "+502", flag: "🇬🇹" },
  { code: "BZ", name: "Belize", phonePrefix: "+501", flag: "🇧🇿" },
  { code: "SV", name: "El Salvador", phonePrefix: "+503", flag: "🇸🇻" },
  { code: "HN", name: "Honduras", phonePrefix: "+504", flag: "🇭🇳" },
  { code: "NI", name: "Nicaragua", phonePrefix: "+505", flag: "🇳🇮" },
  { code: "CR", name: "Costa Rica", phonePrefix: "+506", flag: "🇨🇷" },
  { code: "PA", name: "Panama", phonePrefix: "+507", flag: "🇵🇦" },
  { code: "NZ", name: "New Zealand", phonePrefix: "+64", flag: "🇳🇿" },
  { code: "FJ", name: "Fiji", phonePrefix: "+679", flag: "🇫🇯" },
  { code: "PG", name: "Papua New Guinea", phonePrefix: "+675", flag: "🇵🇬" },
  { code: "NC", name: "New Caledonia", phonePrefix: "+687", flag: "🇳🇨" },
  { code: "VU", name: "Vanuatu", phonePrefix: "+678", flag: "🇻🇺" },
  { code: "SB", name: "Solomon Islands", phonePrefix: "+677", flag: "🇸🇧" },
  { code: "WS", name: "Samoa", phonePrefix: "+685", flag: "🇼🇸" },
  { code: "TO", name: "Tonga", phonePrefix: "+676", flag: "🇹🇴" },
  { code: "TV", name: "Tuvalu", phonePrefix: "+688", flag: "🇹🇻" },
  { code: "KI", name: "Kiribati", phonePrefix: "+686", flag: "🇰🇮" },
  { code: "NR", name: "Nauru", phonePrefix: "+674", flag: "🇳🇷" },
  { code: "PW", name: "Palau", phonePrefix: "+680", flag: "🇵🇼" },
  { code: "FM", name: "Micronesia", phonePrefix: "+691", flag: "🇫🇲" },
  { code: "MH", name: "Marshall Islands", phonePrefix: "+692", flag: "🇲🇭" },
].sort((a, b) => a.name.localeCompare(b.name));

// Utility functions
export const getCountryByCode = (code: string): CountryCode | undefined => {
  return countryCodes.find(country => country.code === code);
};

export const getCountryByPhonePrefix = (prefix: string): CountryCode | undefined => {
  return countryCodes.find(country => country.phonePrefix === prefix);
};

export const formatPhoneNumberWithCountry = (phoneNumber: string, countryCode: string): string => {
  const country = getCountryByCode(countryCode);
  if (!country) return phoneNumber;
  
  // Remove any existing prefix
  let cleanNumber = phoneNumber.replace(/^\+\d+/, '').replace(/^\d+/, '');
  
  // Add the country prefix
  return `${country.phonePrefix}${cleanNumber}`;
};

export const extractCountryFromPhoneNumber = (phoneNumber: string): CountryCode | undefined => {
  if (!phoneNumber.startsWith('+')) return undefined;
  
  // Try to match longest prefixes first
  const sortedCountries = [...countryCodes].sort((a, b) => b.phonePrefix.length - a.phonePrefix.length);
  
  for (const country of sortedCountries) {
    if (phoneNumber.startsWith(country.phonePrefix)) {
      return country;
    }
  }
  
  return undefined;
};