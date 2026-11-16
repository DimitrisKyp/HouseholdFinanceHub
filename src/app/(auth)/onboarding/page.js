import { redirect } from "next/navigation";
import CreateHouseholdForm from "@/components/Auth/CreateHouseholdForm";
import { getMembership, requireUser } from "@/lib/dal";

export const metadata = { title: "Set up your household · Household Finance Hub" };

// Shown to a signed-in user who doesn't belong to any household yet.
export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/");

  return (
    <>
      <h1 className="text-2xl font-semibold">Hi {user.name}, set up your household</h1>
      <p className="mt-1 mb-6 text-sm text-slate-400">You’ll be its owner. You can invite family members once it’s created.</p>
      <CreateHouseholdForm />
    </>
  );
}
