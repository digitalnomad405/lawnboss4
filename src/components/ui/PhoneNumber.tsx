interface PhoneNumberProps {
  number: string;
  className?: string;
}

export const PhoneNumber = ({ number, className = '' }: PhoneNumberProps) => {
  // Format for display: +1 (XXX) XXX-XXXX
  const formatForDisplay = (phone: string) => {
    // Remove all non-numeric characters and the +1 prefix
    const cleaned = phone.replace(/\D/g, '').replace(/^1/, '');
    
    // If we don't have exactly 10 digits, return the original
    if (cleaned.length !== 10) return phone;
    
    // Format as: +1 (XXX) XXX-XXXX
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  };

  return (
    <span className={className}>
      {formatForDisplay(number)}
    </span>
  );
}; 