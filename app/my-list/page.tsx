import type { Metadata } from "next";
import { MyListView } from "@/components/my-list/my-list-view";

export const metadata: Metadata = { title: "My List — Bankai" };

export default function MyListPage() {
  return <MyListView />;
}
