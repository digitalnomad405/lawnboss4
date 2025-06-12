import { memo } from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string | string[] | boolean;
  onValueChange: (name: string, value: string | string[] | boolean) => void;
  error?: string;
  required?: boolean;
  as?: 'input' | 'select' | 'textarea' | 'checkboxes';
  options?: { value: string; label: string; }[];
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const FormField = memo(({ 
  label, 
  name, 
  type = 'text',
  value,
  onValueChange,
  error,
  required = true,
  as: Component = 'input',
  options = [],
  placeholder,
  disabled = false,
  'aria-label': ariaLabel,
}: FormFieldProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (type === 'checkbox') {
      onValueChange(name, e.target.checked);
    } else {
      onValueChange(name, e.target.value);
    }
  };

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    const newValues = checked
      ? [...currentValues, optionValue]
      : currentValues.filter(v => v !== optionValue);
    onValueChange(name, newValues);
  };

  const commonProps = {
    id: name,
    name,
    disabled,
    'aria-required': required,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${name}-error` : undefined,
  };

  return (
    <div>
      {type !== 'checkbox' && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="mt-1">
        {Component === 'select' ? (
          <select
            {...commonProps}
            value={value as string}
            onChange={handleChange}
            className={`block w-full rounded-md shadow-sm ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            } dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : Component === 'textarea' ? (
          <textarea
            {...commonProps}
            value={value as string}
            onChange={handleChange}
            rows={3}
            placeholder={placeholder}
            className={`block w-full rounded-md shadow-sm ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            } dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm`}
          />
        ) : Component === 'checkboxes' ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {options.map((option) => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value as string[]).includes(option.value)}
                  onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        ) : type === 'checkbox' ? (
          <label className="inline-flex items-center space-x-2">
            <input
              {...commonProps}
              type="checkbox"
              checked={Boolean(value)}
              onChange={handleChange}
              aria-label={ariaLabel || label}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
          </label>
        ) : (
          <input
            {...commonProps}
            type={type}
            value={value as string}
            onChange={handleChange}
            placeholder={placeholder}
            className={`block w-full rounded-md shadow-sm ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            } dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm`}
          />
        )}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField'; 