"use client";

import { useState } from "react";
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

/** User profile, email, password, and account deletion settings. */
export default function SettingsPage() {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              const r = await updateProfile(fd);
              setMsg(r?.success ? "Profile updated" : r?.error ?? null);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" />
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              const r = await updateEmail(fd);
              setMsg(r?.success ?? r?.error ?? null);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">New email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit">Update email</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              const r = await changePassword(fd);
              setMsg(r?.success ? "Password updated" : r?.error ?? null);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <Button type="submit">Change password</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Delete account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              await deleteAccount();
            }}
          >
            <Button type="submit" variant="outline" className="border-red-300 text-red-600">
              Permanently delete account
            </Button>
          </form>
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}
