"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  // Memorize the click handler to avoid recreating on each render
  const handleClick = React.useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light")
  }, [setTheme, theme])

  // Memoize the icons to avoid unnecessary re-renders
  const icons = React.useMemo(() => (
    <>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
    </>
  ), [])

  return (
    <Button
      variant="outline" 
      size="icon"
      onClick={handleClick}
    >
      {icons}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}