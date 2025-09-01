import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";

export default async function MyProfilePage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/login");
  }

  // Redirect to the user's actual profile page
  redirect(`/users/${user.username}`);
}