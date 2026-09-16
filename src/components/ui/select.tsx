"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from "lucide-react"

/* ---------------------------------- Context --------------------------------- */

interface SelectContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  onValueChange: (value: string) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error("Select compound components must be used within <Select>")
  return ctx
}

/* ---------------------------------- Select ---------------------------------- */

interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

function Select({ children, value: controlledValue, onValueChange, defaultValue = "" }: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) setUncontrolledValue(newValue)
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange]
  )

  return (
    <SelectContext.Provider value={{ open, setOpen, value, onValueChange: handleValueChange, triggerRef }}>
      {children}
    </SelectContext.Provider>
  )
}

/* --------------------------------- Trigger --------------------------------- */

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default"
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size = "default", children, onClick, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useSelectContext()

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
      },
      [ref, triggerRef]
    )

    return (
      <button
        ref={mergedRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid]:border-destructive aria-[invalid]:ring-[3px] aria-[invalid]:ring-destructive/20 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-md dark:bg-input/30 dark:hover:bg-input/50 dark:aria-[invalid]:border-destructive/50 dark:aria-[invalid]:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:h-4 [&_svg:not([class*='size-'])]:w-4",
          className
        )}
        onClick={(e) => {
          setOpen(!open)
          onClick?.(e)
        }}
        {...props}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none h-4 w-4 text-muted-foreground" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

/* ---------------------------------- Value ---------------------------------- */

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    const { value } = useSelectContext()

    return (
      <span
        ref={ref}
        data-slot="select-value"
        className={cn(
          "flex flex-1 text-left",
          !value && "text-muted-foreground",
          className
        )}
        {...props}
      >
        {value || placeholder}
      </span>
    )
  }
)
SelectValue.displayName = "SelectValue"

/* --------------------------------- Content --------------------------------- */

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom"
  sideOffset?: number
  align?: "start" | "center" | "end"
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, side = "bottom", ...props }, ref) => {
    const { open, setOpen, triggerRef } = useSelectContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = React.useState(false)
    const [position, setPosition] = React.useState<{ top: number; left: number; width: number }>({
      top: 0,
      left: 0,
      width: 0,
    })

    // Calculate position relative to trigger
    React.useEffect(() => {
      if (!open || !triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: side === "bottom" ? rect.bottom + 4 : rect.top - 4,
        left: rect.left,
        width: rect.width,
      })
      setMounted(true)
    }, [open, triggerRef, side])

    // Click outside to close
    React.useEffect(() => {
      if (!open) return

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node
        if (
          contentRef.current &&
          !contentRef.current.contains(target) &&
          triggerRef.current &&
          !triggerRef.current.contains(target)
        ) {
          setOpen(false)
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false)
      }

      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        document.removeEventListener("keydown", handleEscape)
      }
    }, [open, setOpen, triggerRef])

    // Reset mounted on close
    React.useEffect(() => {
      if (!open) setMounted(false)
    }, [open])

    if (!open) return null

    return createPortal(
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        data-slot="select-content"
        data-side={side}
        style={{
          position: "fixed",
          top: side === "bottom" ? position.top : undefined,
          bottom: side === "top" ? `${window.innerHeight - position.top}px` : undefined,
          left: position.left,
          minWidth: Math.max(position.width, 144),
          zIndex: 50,
        }}
        className={cn(
          "max-h-[min(var(--radix-select-content-available-height,300px),300px)] overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
          mounted && "animate-in fade-in-0 zoom-in-95",
          side === "bottom" && "slide-in-from-top-2",
          side === "top" && "slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
      </div>,
      document.body
    )
  }
)
SelectContent.displayName = "SelectContent"

/* ---------------------------------- Item ----------------------------------- */

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value: itemValue, disabled = false, onClick, ...props }, ref) => {
    const { value, onValueChange, setOpen } = useSelectContext()
    const isSelected = value === itemValue

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        data-slot="select-item"
        data-disabled={disabled || undefined}
        className={cn(
          "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:h-4 [&_svg:not([class*='size-'])]:w-4",
          className
        )}
        onClick={(e) => {
          if (disabled) return
          onValueChange(itemValue)
          setOpen(false)
          onClick?.(e)
        }}
        {...props}
      >
        <span className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">{children}</span>
        {isSelected && (
          <span className="pointer-events-none absolute right-2 flex h-4 w-4 items-center justify-center">
            <CheckIcon className="h-4 w-4" />
          </span>
        )}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

/* ---------------------------------- Group ---------------------------------- */

const SelectGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
)
SelectGroup.displayName = "SelectGroup"

/* ---------------------------------- Label ---------------------------------- */

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
)
SelectLabel.displayName = "SelectLabel"

/* -------------------------------- Separator -------------------------------- */

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
)
SelectSeparator.displayName = "SelectSeparator"

/* ----------------------------- Scroll Buttons ------------------------------ */

const SelectScrollUpButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="select-scroll-up-button"
      className={cn(
        "flex w-full cursor-default items-center justify-center bg-popover py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="h-4 w-4" />
    </div>
  )
)
SelectScrollUpButton.displayName = "SelectScrollUpButton"

const SelectScrollDownButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="select-scroll-down-button"
      className={cn(
        "flex w-full cursor-default items-center justify-center bg-popover py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="h-4 w-4" />
    </div>
  )
)
SelectScrollDownButton.displayName = "SelectScrollDownButton"

/* --------------------------------- Exports --------------------------------- */

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
