import { redirect } from "next/navigation";

export default function WishlistAliasPage() {
  redirect("/dashboard?tab=wishlist");
}
