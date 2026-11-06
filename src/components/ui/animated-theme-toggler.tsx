"use client"

import { useCallback, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export type TransitionVariant = "circle" | "square" | "triangle" | "diamond"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
  variant?: TransitionVariant
  fromCenter?: boolean
  theme?: "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
}

export function AnimatedThemeToggler({
  className,
  duration = 400,
  theme: controlledTheme,
  onThemeChange,
  ...props
}: AnimatedThemeTogglerProps) {
  const [internalIsDark, setInternalIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark"
    }
    return false
  })

  const isControlled = controlledTheme !== undefined
  const isDark = isControlled ? controlledTheme === "dark" : internalIsDark

  useEffect(() => {
    // Sync on mount and storage events
    const syncTheme = () => {
      const activeDark = document.documentElement.classList.contains("dark")
      setInternalIsDark(activeDark)
    }
    syncTheme()

    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark")
    const newDark = !isCurrentlyDark

    const apply = () => {
      if (newDark) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }
      setInternalIsDark(newDark)
      onThemeChange?.(newDark ? "dark" : "light")
    }

    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => {
        ready?: Promise<void>
        finished?: Promise<void>
      }
    }

    if (typeof doc.startViewTransition !== "function") {
      apply()
      return
    }

    try {
      doc.startViewTransition(() => {
        apply()
      })
    } catch {
      apply()
    }
  }, [onThemeChange])

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 cursor-pointer",
        className
      )}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      {...props}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
