import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login, { DemoUser } from "./pages/Login";

type View = "home" | "login" | "dashboard";

function App() {
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<DemoUser | null>(null);

  const signIn = (nextUser: DemoUser) => {
    setUser(nextUser);
    setView("dashboard");
  };

  const signOut = () => {
    setUser(null);
    setView("home");
  };

  return (
    <ThemeProvider defaultTheme="light" switchable>
      <TooltipProvider>
        <Toaster position="bottom-left" />
        {view === "home" && <Home onSignIn={() => setView("login")} />}
        {view === "login" && <Login onBack={() => setView("home")} onLogin={signIn} />}
        {view === "dashboard" && user && <Dashboard user={user} onLogout={signOut} />}
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
