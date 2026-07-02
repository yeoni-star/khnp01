import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppNav from "@/components/nav/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <AppNav restaurant={session.restaurant} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
