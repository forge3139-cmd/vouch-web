import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'dark' | 'outline' | 'light'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-orange text-white',
  dark: 'bg-ink text-white',
  outline: 'bg-white text-ink border border-card-border',
  light: 'bg-card-border text-ink',
}

export default function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl py-4 text-base font-bold transition-opacity disabled:opacity-40 active:opacity-80 ${variantClasses[variant]} ${className}`}
    />
  )
}
