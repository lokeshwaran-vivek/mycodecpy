"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

export function SessionActivityTracker() {
  const { data: session } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isThrottlingRef = useRef<boolean>(false);
  
  // 25 minutes in milliseconds
  const INACTIVITY_TIMEOUT = 25 * 60 * 1000;
  // Check every 60 seconds
  const CHECK_INTERVAL = 60 * 1000;
  // Throttle activity updates to once per 2 seconds
  const THROTTLE_DELAY = 2000;

  const updateActivity = () => {
    // Skip updates if throttling
    if (isThrottlingRef.current) return;
    
    lastActivityRef.current = Date.now();
    
    // Set throttle flag
    isThrottlingRef.current = true;
    setTimeout(() => {
      isThrottlingRef.current = false;
    }, THROTTLE_DELAY);
  };

  useEffect(() => {
    if (!session) return;

    // Initialize with current time
    lastActivityRef.current = Date.now();
    
    // Single interval to check inactivity
    intervalRef.current = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        signOut({ callbackUrl: "/login" });
      }
    }, CHECK_INTERVAL);

    // Use fewer, more critical user events
    const events = [
      "mousedown",
      "keypress",
      "touchstart",
      "click",
      "visibilitychange" // Track when user returns to the tab
    ];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    // Clean up
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [session]);

  return null;
} 