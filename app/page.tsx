import { redirect } from "next/navigation";

// Root entry point redirects directly to the Login Gateway
export default function RootPage() {
  redirect("/login");
}
