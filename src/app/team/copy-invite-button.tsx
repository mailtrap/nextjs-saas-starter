"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  inviteUrl: string;
};

/** Copies an invite URL to the clipboard. */
export function CopyInviteButton({ inviteUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
