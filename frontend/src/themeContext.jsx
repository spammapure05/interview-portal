import { createContext, useContext, useState, useEffect } from "react";
import api from "./api";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    // Default to system preference
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState("light");

  // Resolve actual theme based on system preference
  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setResolvedTheme(prefersDark ? "dark" : "light");
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(`${resolvedTheme}-theme`);
  }, [resolvedTheme]);

  // Fetch theme from server on mount (if logged in)
  useEffect(() => {
    const fetchTheme = async () => {
      // Solo se c'è un token (utente loggato)
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await api.get("/preferences");
        if (res.data.theme) {
          setTheme(res.data.theme);
          localStorage.setItem("theme", res.data.theme);
        }
      } catch (err) {
        // User not logged in or error, use local storage
      }
    };
    fetchTheme();
  }, []);

  // Change theme
  const changeTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    // Sync to server (solo se loggato)
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.patch("/preferences/theme", { theme: newTheme });
    } catch (err) {
      // Ignore errors, local storage is enough
    }
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    changeTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, changeTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
