import { createContext, useContext, useEffect, useState, useRef } from "react";
import api from "./api";

const AuthContext = createContext(null);

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Warning before logout (1 minute)
const WARNING_TIME = 60 * 1000;

// Helper: get or create device ID
const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};

// Helper: get device name
const getDeviceName = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Linux")) return "Linux PC";
  return "Browser";
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [mustSetup2FA, setMustSetup2FA] = useState(false);

  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const userRef = useRef(user);

  // Mantieni userRef sincronizzato
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearAllTimers = () => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
  };

  const login = async (identifier, password) => {
    const deviceId = getOrCreateDeviceId();
    const res = await api.post("/auth/login", { identifier, password, deviceId });

    if (res.data.requires2FA) {
      setTempToken(res.data.tempToken);
      setRequires2FA(true);
      return { requires2FA: true };
    }

    // Handle mandatory 2FA setup (user has totp_required=1 but hasn't set up 2FA yet)
    if (res.data.requires2FASetup) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("lastActivity", Date.now().toString());
      setUser(res.data.user);
      setMustSetup2FA(true);
      return { requires2FASetup: true };
    }

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("lastActivity", Date.now().toString());
    setUser(res.data.user);
    setMustSetup2FA(false);
    return { requires2FA: false };
  };

  const verify2FA = async (code, trustDevice = false) => {
    const deviceId = getOrCreateDeviceId();
    const deviceName = getDeviceName();

    const res = await api.post("/auth/verify-2fa", {
      tempToken,
      code,
      trustDevice,
      deviceId,
      deviceName
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("lastActivity", Date.now().toString());
    setUser(res.data.user);
    setRequires2FA(false);
    setTempToken(null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lastActivity");
    setUser(null);
    setShowTimeoutWarning(false);
    setRequires2FA(false);
    setTempToken(null);
    setMustSetup2FA(false);
    clearAllTimers();
  };

  // Called after user completes mandatory 2FA setup
  const complete2FASetup = () => {
    setMustSetup2FA(false);
  };

  const resetTimeout = () => {
    if (!userRef.current) return;

    clearAllTimers();
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
  };

  const extendSession = () => {
    setShowTimeoutWarning(false);
    resetTimeout();
  };

  const fetchMe = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
      // Check if user has mustSetup2FA flag (set during login when totp_required but not enabled)
      if (res.data.user?.mustSetup2FA) {
        setMustSetup2FA(true);
      }
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

  // Setup activity listeners and timeout when user changes
  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    // Start timeout tracking
    resetTimeout();

    // Activity events to track
    const events = ["mousedown", "keydown", "scroll", "touchstart"];

    const handleActivity = () => {
      // Solo reset se non c'è il warning attivo
      if (!showTimeoutWarning) {
        resetTimeout();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [user]); // Solo user come dipendenza

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoading,
      showTimeoutWarning,
      timeRemaining,
      extendSession,
      requires2FA,
      tempToken,
      verify2FA,
      mustSetup2FA,
      complete2FASetup
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
