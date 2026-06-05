import { WelcomeScreen } from "@/components/DriverFlowScreens";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function IndexRoute() {
  const { driver, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    console.log("User session:", driver?.id ?? null);
    console.log("Auth state:", driver);
    if (!driver) {
      console.log("Splash screen mounted");
    }
  }, [driver, isLoading]);

  return <WelcomeScreen />;
}
