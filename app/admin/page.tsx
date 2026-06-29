import type { Metadata } from "next";
import {
  Users,
  Film,
  Flag,
  Eye,
  TrendingUp,
  Megaphone,
  Star,
} from "lucide-react";
import { getProvider } from "@/services/providers";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { preferredTitle, formatNumber, formatScore } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };

// NOTE: In production, gate this route by role (ADMIN) in middleware/layout.
export default async function AdminPage() {
  const { items: featured } = await getProvider().getPopular();

  const stats = [
    { icon: Users, label: "Total users", value: "12,480", trend: "+4.2%" },
    { icon: Film, label: "Anime entries", value: formatNumber(featured.length * 1240), trend: "+1.1%" },
    { icon: Eye, label: "Streams today", value: "84,210", trend: "+12.7%" },
    { icon: Flag, label: "Open reports", value: "7", trend: "-2" },
  ];

  // Tiny inline bar chart data (7-day views).
  const views = [42, 55, 48, 70, 65, 88, 96];
  const max = Math.max(...views);

  return (
    <PageContainer>
      <PageHeader
        title="Admin Dashboard"
        description="Manage content, users, and moderation."
        icon={<TrendingUp className="size-7 text-primary" />}
        action={<Button><Megaphone className="size-4" /> New announcement</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <s.icon className="size-5 text-primary" />
              <span className="text-xs text-emerald-400">{s.trend}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-1">
          <h2 className="mb-4 font-semibold">Views (7 days)</h2>
          <div className="flex h-40 items-end gap-2">
            {views.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-primary/50 to-primary"
                  style={{ height: `${(v / max) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Featured anime</h2>
            <Button variant="ghost" size="sm">Manage</Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 font-medium">Title</th>
                <th className="pb-2 font-medium">Format</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {featured.slice(0, 6).map((a) => (
                <tr key={a.id}>
                  <td className="max-w-[200px] truncate py-2 font-medium">{preferredTitle(a.title)}</td>
                  <td className="py-2 text-muted-foreground">{a.format}</td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {formatScore(a.averageScore)}
                    </span>
                  </td>
                  <td className="py-2"><Badge variant="success">{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
