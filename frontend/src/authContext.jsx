import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import api from "./api";

const AuthContext = createContext(null);

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Warning before logout (1 minute)
const WARNING_TIME = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);

  const login = async (identifier, password) => {
    const res = await api.post("/auth/login", { identifier, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("lastActivity", Date.now().toString());
    setUser(res.data.user);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("lastActivity");
    setUser(null);
    setShowTimeoutWarning(false);
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const resetTimeout = useCallback(() => {
    if (!user) return;

    // Clear existing timers
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    setShowTimeoutWarning(false);

    // Update last activity
    localStorage.setItem("lastActivity", Date.now().toString());

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setTimeRemaining(WARNING_TIME / 1000);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT);
  }, [user, logout]);

  const extendSession = useCallback(() => {
    setShowTimeoutWarning(false);
    resetTimeout();
  }, [resetTimeout]);

  const fetchMe = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Check if session has expired (only if lastActivity exists)
      const lastActivity = localStorage.getItem("lastActivity");
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity);
        if (elapsed > SESSION_TIMEOUT) {
          // Session expired
          localStorage.removeItem("token");
          localStorage.removeItem("lastActivity");
          setIsLoading(false);
          return;
        }
      } else {
        // Se non esiste lastActivity, lo inizializziamo ora (sessioni legacy)
        localStorage.setItem("lastActivity", Date.now().toString());
      }
      fetchMe();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Setup activity listeners and timeout
  useEffect(() => {
    if (!user) return;

    // Start timeout tracking
    resetTimeout();

    // Activity events to track
    const events = ["mousedown", "keydown", "scroll", "touchstart"];

    const handleActivity = () => {
      if (!showTimeoutWarning) {
        resetTimeout();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      clearInterval(countdownRef.current);
    };
  }, [user, resetTimeout, showTimeoutWarning]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, showTimeoutWarning, timeRemaining, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
