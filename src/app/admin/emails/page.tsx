import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { db } from "@/db";
import { emailEvents } from "@/db/schema";

/** Admin view of Mailtrap webhook email events. */
export default async function AdminEmailsPage() {
  const events = await db
    .select()
    .from(emailEvents)
    .orderBy(desc(emailEvents.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Email logs</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">Event</th>
              <th className="p-3">Email</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-muted-foreground">
                  No events yet. Configure Mailtrap webhooks to populate this view.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3">{e.eventType}</td>
                  <td className="p-3">{e.email}</td>
                  <td className="p-3 font-mono text-xs">{e.userId ?? "—"}</td>
                  <td className="p-3">{e.createdAt?.toISOString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
