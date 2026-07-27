'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

export function PasswordInput({
  className = 'input',
  style,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: 44, ...style }}
      />
      <button
        type="button"
        onClick={() => setShowPassword((visible) => !visible)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        disabled={props.disabled}
        tabIndex={-1}
        style={{
          position: 'absolute',
          top: '50%',
          right: 12,
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          border: 0,
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? 0.5 : 1,
        }}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
