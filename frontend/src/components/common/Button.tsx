import type { ButtonHTMLAttributes } from 'react';

export default function Button({ className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`v-btn ${className}`} {...p} />;
}
