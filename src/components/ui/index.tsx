import { type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, forwardRef, useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-sans font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beacon/60 disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-beacon text-white hover:bg-beacon/90 shadow-glow',
        variant === 'ghost' && 'text-body hover:bg-border hover:text-light',
        variant === 'outline' && 'border border-border text-body hover:border-beacon/40 hover:text-light',
        variant === 'danger' && 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20',
        className
      )}
      {...props}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-xs font-medium text-body uppercase tracking-wide">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'w-full bg-surface border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted font-sans',
          'focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all duration-150',
          error ? 'border-danger/60' : 'border-border hover:border-muted',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, id, children, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-xs font-medium text-body uppercase tracking-wide">{label}</label>}
      <select
        ref={ref}
        id={id}
        className={clsx(
          'w-full bg-surface border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm text-light font-sans',
          'focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all duration-150',
          'hover:border-muted',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
)
Select.displayName = 'Select'

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('bg-surface rounded-2xl shadow-card border border-border', className)}>
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray'

export function Badge({ color = 'gray', children }: { color?: BadgeColor; children: React.ReactNode }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
      color === 'blue' && 'bg-beacon-dim text-beacon',
      color === 'green' && 'bg-success/10 text-success',
      color === 'yellow' && 'bg-warn/10 text-warn',
      color === 'red' && 'bg-danger/10 text-danger',
      color === 'gray' && 'bg-border text-muted',
    )}>
      {children}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={clsx('w-5 h-5 border-2 border-border border-t-beacon rounded-full animate-spin', className)} />
  )
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

export interface ComboboxOption { label: string; value: string }

interface ComboboxProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  className?: string
}

export function Combobox({ label, value, onChange, options, placeholder, className }: ComboboxProps) {
  const selectedLabel = options.find(o => o.value === value)?.label ?? value
  const [inputVal, setInputVal] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync display text when the value prop changes (e.g. form pre-fill)
  useEffect(() => {
    setInputVal(options.find(o => o.value === value)?.label ?? value)
  }, [value, options])

  const filtered = inputVal && inputVal !== selectedLabel
    ? options.filter(o =>
        o.label.toLowerCase().includes(inputVal.toLowerCase()) ||
        o.value.toLowerCase().includes(inputVal.toLowerCase())
      )
    : options

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setInputVal(options.find(o => o.value === value)?.label ?? value)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, options])

  const handleSelect = (opt: ComboboxOption) => {
    onChange(opt.value)
    setInputVal(opt.label)
    setOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value)
    setHighlighted(0)
    setOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && filtered[highlighted]) { e.preventDefault(); handleSelect(filtered[highlighted]) }
    else if (e.key === 'Escape') { setOpen(false); setInputVal(options.find(o => o.value === value)?.label ?? value) }
  }

  return (
    <div className={clsx('flex flex-col gap-1.5 relative', className)} ref={containerRef}>
      {label && <label className="text-xs font-medium text-body uppercase tracking-wide">{label}</label>}
      <input
        autoComplete="off"
        value={inputVal}
        onChange={handleChange}
        onFocus={() => { setOpen(true); setHighlighted(0) }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={clsx(
          'w-full bg-surface border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted font-sans',
          'focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all duration-150',
          'border-border hover:border-muted'
        )}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface border border-border rounded-xl shadow-card max-h-48 overflow-y-auto">
          {filtered.map((opt, i) => (
            <button
              key={opt.value || opt.label}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(opt) }}
              className={clsx(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                i === highlighted ? 'bg-beacon-dim text-beacon' : 'text-light hover:bg-border'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
