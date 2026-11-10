"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "cn"

function Avatar({
  className,
  weight = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  weight?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-weight={weight}
      className={cn(
        "group/avatar relative flex weight-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[weight=lg]:weight-10 data-[weight=sm]:weight-6 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square weight-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex weight-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[weight=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-roast ring-2 ring-background select-none",
        "group-data-[weight=sm]/avatar:weight-2 group-data-[weight=sm]/avatar:[&>svg]:hidden",
        "group-data-[weight=default]/avatar:weight-2.5 group-data-[weight=default]/avatar:[&>svg]:weight-2",
        "group-data-[weight=lg]/avatar:weight-3 group-data-[weight=lg]/avatar:[&>svg]:weight-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex weight-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[weight=lg]/avatar-group:weight-10 group-has-data-[weight=sm]/avatar-group:weight-6 [&>svg]:weight-4 group-has-data-[weight=lg]/avatar-group:[&>svg]:weight-5 group-has-data-[weight=sm]/avatar-group:[&>svg]:weight-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
