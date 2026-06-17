"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  deleteAccount,
  updateEmail,
  updateProfile,
} from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  email: string;
  fullName: string;
};

/** Compact account settings: profile, email, password, and delete. */
export function SettingsForm({ email, fullName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");

  useEffect(() => {
    setName(fullName);
  }, [fullName]);

  function notify(text: string, tone: "success" | "error" = "success") {
    setMsg(text);
    setMsgTone(tone);
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            msgTone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-border bg-muted/40 text-foreground"
          }`}
          role="status"
        >
          {msg}
        </p>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update your profile, email, or password.
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          <form
            action={async (fd) => {
              const r = await updateProfile(fd);
              if (r?.error) notify(r.error, "error");
              else {
                setName(String(fd.get("fullName") ?? "").trim());
                notify("Profile updated");
                router.refresh();
              }
            }}
            className="space-y-3 px-6 py-5"
          >
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full name
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="fullName"
                name="fullName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="sm:flex-1"
              />
              <Button type="submit" variant="secondary" className="shrink-0 sm:w-auto">
                Save
              </Button>
            </div>
          </form>

          <form
            action={async (fd) => {
              const r = await updateEmail(fd);
              if (r?.error) notify(r.error, "error");
              else notify(r?.success ?? "Email update requested");
            }}
            className="space-y-3 px-6 py-5"
          >
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <p className="text-xs text-muted-foreground">Current: {email}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="New email address"
                className="sm:flex-1"
              />
              <Button type="submit" variant="secondary" className="shrink-0 sm:w-auto">
                Update
              </Button>
            </div>
          </form>

          <form
            action={async (fd) => {
              const r = await changePassword(fd);
              if (r?.error) notify(r.error, "error");
              else notify("Password updated");
            }}
            className="space-y-3 px-6 py-5"
          >
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="New password (min. 8 characters)"
                className="sm:flex-1"
              />
              <Button type="submit" variant="secondary" className="shrink-0 sm:w-auto">
                Change
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-600">Delete account</p>
            <p className="text-sm text-muted-foreground">
              Permanently remove your account and all associated data.
            </p>
          </div>
          <form action={deleteAccount} className="shrink-0">
            <Button
              type="submit"
              variant="outline"
              className="w-full border-red-300 text-red-600 sm:w-auto"
            >
              Delete account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
