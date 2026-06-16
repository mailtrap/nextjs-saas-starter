"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

/** Accessible form field label. */
const Label = ({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) => (
  <LabelPrimitive.Root
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
);

export { Label };
