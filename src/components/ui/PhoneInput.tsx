import { useState, useEffect } from 'react';
import { formatPhoneNumber, isValidPhoneNumber } from '../../utils/formatters';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const PhoneInput = ({
  value,
  onChange,
  onBlur,
  placeholder = '(555) 555-5555',
  required = false,
  disabled = false,
  error,
  className = ''
}: PhoneInputProps) => {
  const [displayValue, setDisplayValue] = useState('');

  // Format for display while typing: (XXX) XXX-XXXX
  const formatForDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length > 0) {
      formatted = '(' + cleaned.slice(0, 3);
      if (cleaned.length > 3) {
        formatted += ') ' + cleaned.slice(3, 6);
        if (cleaned.length > 6) {
          formatted += '-' + cleaned.slice(6, 10);
        }
      }
    }

    return formatted;
  };

  // Update display value when prop value changes
  useEffect(() => {
    // If the value is in E.164 format (+1XXXXXXXXXX), convert it for display
    if (isValidPhoneNumber(value)) {
      const cleaned = value.replace(/\D/g, '').slice(1); // Remove +1
      setDisplayValue(formatForDisplay(cleaned));
    } else {
      setDisplayValue(formatForDisplay(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(formatForDisplay(input));
    
    // Convert to E.164 format for the actual value
    const formatted = formatPhoneNumber(input);
    onChange(formatted);
  };

  const handleBlur = () => {
    // Ensure the display value is fully formatted
    const formatted = formatPhoneNumber(displayValue);
    if (isValidPhoneNumber(formatted)) {
      onChange(formatted);
      const cleaned = formatted.replace(/\D/g, '').slice(1);
      setDisplayValue(formatForDisplay(cleaned));
    }
    onBlur?.();
  };

  return (
    <div className="relative">
      <input
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 ${error ? 'border-red-500' : ''} ${className}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}; 