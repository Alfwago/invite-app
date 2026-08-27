import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth/AuthContext";
import { Loading } from "@/src/components/ui";

// Entry point: bounce to the right place once auth state is known.
export default function Index() {
  const { ready, token } = useAuth();
  if (!ready) return <Loading />;
  return <Redirect href={token ? "/(tabs)/events" : "/login"} />;
}
