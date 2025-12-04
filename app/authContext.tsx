"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { getSessionClient } from "@/utils/auth";

interface User {
  id: string;
  name?: string;
  email: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize local storage with default values if not already set
    if (localStorage.getItem("isAuth") === null) {
      localStorage.setItem("isAuth", "false");
    }
    if (localStorage.getItem("isLoggedIn") === null) {
      localStorage.setItem("isLoggedIn", "false");
    }
    if (localStorage.getItem("token") === null) {
      localStorage.setItem("token", "");
    }
    if (localStorage.getItem("getSession") === null) {
      localStorage.setItem("getSession", "");
    }
    if (localStorage.getItem("theme") === null) {
      localStorage.setItem("theme", "light");
    }
    if (localStorage.getItem("jiraBaseUrl") === null) {
      localStorage.setItem("jiraBaseUrl", "atlassian.net");
    }
    if (localStorage.getItem("captureCloudUrl") === null) {
      localStorage.setItem(
        "captureCloudUrl",
        "https://prod-capture.zephyr4jiracloud.com/capture"
      );
    }

    const checkSession = async () => {
      // Don't rely on reading the cookie client-side since it's httpOnly
      // Instead, directly call the session API which can access the httpOnly cookie
      try {
        const session = await getSessionClient();
        // Debug log - only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log("Session from getSessionClient:", session);
        }
        if (session && session.id) {
          setIsLoggedIn(true);
          setUser({
            id: session.id,
            name: session.name,
            email: session.email,
          });
          // Debug log - only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log("User from session:", session);
          }
          // Set necessary attributes in local storage
          localStorage.setItem("isAuth", "true");
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("getSession", JSON.stringify(session));
        } else {
          clearAuthData();
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error checking session:", error);
        }
        clearAuthData();
      } finally {
        setIsLoading(false); // Session check complete
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post("/auth/login", {
        email,
        password,
      });

      const result = response.data;
      setIsLoggedIn(true);
      setUser({
        id: result.userId,
        name: result.userName,
        email: result.userEmail,
      });
      // Note: The server sets the session_id as an httpOnly cookie, so we don't need to set it client-side
      // Debug log - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Login successful, user:", result);
      }

      // Set necessary attributes in local storage
      localStorage.setItem("isAuth", "true");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("getSession", JSON.stringify(result));
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      clearAuthData();
      // Debug log - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Logout successful, session ID removed");
      }
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  };

  const clearAuthData = () => {
    setIsLoggedIn(false);
    setUser(null);
    // Note: The session_id cookie is httpOnly, so it will be cleared by the logout API on the server
    // Clear attributes from local storage
    localStorage.setItem("isAuth", "false");
    localStorage.setItem("isLoggedIn", "false");
    localStorage.setItem("getSession", "");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
