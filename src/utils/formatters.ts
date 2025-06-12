/**
 * Formats a phone number to E.164 format (+1XXXXXXXXXX)
 * Removes all non-numeric characters and adds +1 prefix if needed
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's a US/Canada number (10 digits)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it already has country code (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it already has + and country code
  if (phone.startsWith('+1') && cleaned.length === 11) {
    return phone;
  }
  
  // Return original if we can't format it
  return phone;
}

/**
 * Validates if a phone number is in E.164 format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const regex = /^\+1\d{10}$/;
  return regex.test(phone);
} 