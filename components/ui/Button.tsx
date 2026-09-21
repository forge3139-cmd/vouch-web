import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'dark' | 'outline' | 'light' | 'blue' | 'orange'

// primary/dark are the app's dark pill CTA; orange is the hero-gradient
// button; blue is for secondary actions; outline/light are frosted glass.
const variantClasses: Record<Variant, string> = {
  primary: 'btn-dark',
  dark: 'btn-dark',
  outline: 'btn-glass',
  light: 'btn-glass',
  blue: 'btn-blue',
  orange: 'btn-orange',
}

export default function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`btn tap w-full py-4 text-base disabled:opacity-40 active:opacity-80 ${variantClasses[variant]} ${className}`}
    />
  )
}
