"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type AvatarSize = "default" | "sm" | "lg"

interface AvatarContextValue {
  size: AvatarSize
  imageLoaded: boolean
  setImageLoaded: (loaded: boolean) => void
}

const AvatarContext = React.createContext<AvatarContextValue>({
  size: "default",
  imageLoaded: false,
  setImageLoaded: () => {},
})

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = "default", ...props }, ref) => {
    const [imageLoaded, setImageLoaded] = React.useState(false)

    return (
      <AvatarContext.Provider value={{ size, imageLoaded, setImageLoaded }}>
        <div
          ref={ref}
          data-slot="avatar"
          data-size={size}
          className={cn(
            "group relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border",
            size === "lg" && "size-10",
            size === "sm" && "size-6",
            className
          )}
          {...props}
        />
      </AvatarContext.Provider>
    )
  }
)
Avatar.displayName = "Avatar"

export type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, onLoad, onError, ...props }, ref) => {
    const { setImageLoaded } = React.useContext(AvatarContext)

    return (
      <img
        ref={ref}
        data-slot="avatar-image"
        className={cn(
          "aspect-square size-full rounded-full object-cover",
          className
        )}
        onLoad={(e) => {
          setImageLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          setImageLoaded(false)
          onError?.(e)
        }}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = "AvatarImage"

export type AvatarFallbackProps = React.HTMLAttributes<HTMLSpanElement>

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => {
    const { size, imageLoaded } = React.useContext(AvatarContext)

    if (imageLoaded) return null

    return (
      <span
        ref={ref}
        data-slot="avatar-fallback"
        className={cn(
          "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground",
          size === "sm" && "text-xs",
          className
        )}
        {...props}
      />
    )
  }
)
AvatarFallback.displayName = "AvatarFallback"

export type AvatarBadgeProps = React.HTMLAttributes<HTMLSpanElement>

const AvatarBadge = React.forwardRef<HTMLSpanElement, AvatarBadgeProps>(
  ({ className, ...props }, ref) => {
    const { size } = React.useContext(AvatarContext)

    return (
      <span
        ref={ref}
        data-slot="avatar-badge"
        className={cn(
          "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none",
          size === "sm" && "size-2 [&>svg]:hidden",
          size === "default" && "size-2.5 [&>svg]:size-2",
          size === "lg" && "size-3 [&>svg]:size-2",
          className
        )}
        {...props}
      />
    )
  }
)
AvatarBadge.displayName = "AvatarBadge"

const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="avatar-group"
    className={cn(
      "flex -space-x-2 [&_[data-slot=avatar]]:ring-2 [&_[data-slot=avatar]]:ring-background",
      className
    )}
    {...props}
  />
))
AvatarGroup.displayName = "AvatarGroup"

const AvatarGroupCount = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="avatar-group-count"
    className={cn(
      "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background [&>svg]:size-4",
      className
    )}
    {...props}
  />
))
AvatarGroupCount.displayName = "AvatarGroupCount"

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
