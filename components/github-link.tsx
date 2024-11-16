"use client"

import * as React from "react"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"

export const GithubLink = React.memo(function GithubLink() {
  return (
    <Button
      variant="outline" 
      size="icon"
      asChild
    >
      <a
        href="https://github.com/Sprechender/videocompress"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Github className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">View source on GitHub</span>
      </a>
    </Button>
  )
})