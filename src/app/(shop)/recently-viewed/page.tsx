import { redirect } from "next/navigation";

export default function RecentlyViewedAliasPage() {
  redirect("/dashboard?tab=recent");
}
