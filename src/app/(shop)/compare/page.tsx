import { redirect } from "next/navigation";

export default function CompareAliasPage() {
  redirect("/dashboard?tab=compare");
}
