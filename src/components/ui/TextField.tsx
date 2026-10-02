import React, { useId } from 'react';

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}

export function TextField({ label, value, onChange, hint, error, className = '', ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-navy/20 ${
        error ? 'border-danger focus:border-danger' : 'border-line focus:border-navy'}`
        }
        {...rest} />
      
      {(error || hint) &&
      <p id={`${id}-note`} className={`mt-1.5 text-xs ${error ? 'text-danger' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      }
    </div>);

}