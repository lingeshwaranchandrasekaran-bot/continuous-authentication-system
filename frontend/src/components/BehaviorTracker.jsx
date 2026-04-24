import React, { useEffect, useRef, useState } from "react";

function BehaviorTracker() {
  const [events, setEvents] = useState({
    keys: [],
    mouse: [],
    clicks: [],
    scrolls: [],
    drags: [],
    files: [],
    focusEvents: []
  });

  const keyDownMapRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const mouseDownRef = useRef(null);
  const saveTimerRef = useRef(null);

  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  const addEvent = (type, data) => {
    if (!userId) return;

    setEvents((prev) => ({
      ...prev,
      [type]: [
        ...prev[type],
        {
          ...data,
          page: window.location.pathname,
          time: Date.now()
        }
      ]
    }));
  };

  const saveBehaviorSession = async (currentEvents) => {
    if (!userId) return;

    const total =
      currentEvents.keys.length +
      currentEvents.mouse.length +
      currentEvents.clicks.length +
      currentEvents.scrolls.length +
      currentEvents.drags.length +
      currentEvents.files.length +
      currentEvents.focusEvents.length;

    if (total === 0) return;

    try {
      await fetch("http://localhost:5000/api/behavior/session-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          role,
          page: window.location.pathname,
          events: currentEvents
        })
      });
    } catch (error) {
      console.error("Behavior save failed:", error);
    }
  };

  useEffect(() => {
    if (!userId) return;

    saveTimerRef.current = setInterval(() => {
      setEvents((prev) => {
        saveBehaviorSession(prev);

        return {
          keys: [],
          mouse: [],
          clicks: [],
          scrolls: [],
          drags: [],
          files: [],
          focusEvents: []
        };
      });
    }, 10000);

    return () => {
      clearInterval(saveTimerRef.current);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const handleKeyDown = (e) => {
      const now = Date.now();

      keyDownMapRef.current[e.key] = now;

      let flightTime = null;
      if (lastKeyTimeRef.current) {
        flightTime = now - lastKeyTimeRef.current;
      }

      lastKeyTimeRef.current = now;

      addEvent("keys", {
        event: "keydown",
        key: e.key,
        flightTime
      });
    };

    const handleKeyUp = (e) => {
      const now = Date.now();
      const downTime = keyDownMapRef.current[e.key];
      const holdTime = downTime ? now - downTime : null;

      addEvent("keys", {
        event: "keyup",
        key: e.key,
        holdTime
      });
    };

    const handleMouseMove = (e) => {
      const now = Date.now();

      let speed = null;

      if (lastMouseRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        const dt = now - lastMouseRef.current.time;

        if (dt > 0) {
          speed = Math.sqrt(dx * dx + dy * dy) / dt;
        }
      }

      lastMouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: now
      };

      addEvent("mouse", {
        event: "mousemove",
        x: e.clientX,
        y: e.clientY,
        speed
      });
    };

    const handleClick = (e) => {
      addEvent("clicks", {
        event: "click",
        x: e.clientX,
        y: e.clientY,
        button: e.button
      });
    };

    const handleWheel = (e) => {
      addEvent("scrolls", {
        event: "scroll",
        deltaY: e.deltaY
      });
    };

    const handleMouseDown = (e) => {
      mouseDownRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now()
      };
    };

    const handleMouseUp = (e) => {
      if (!mouseDownRef.current) return;

      const start = mouseDownRef.current;
      const end = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now()
      };

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = end.time - start.time;

      if (distance > 20 && duration > 100) {
        addEvent("drags", {
          event: "natural_drag",
          startX: start.x,
          startY: start.y,
          endX: end.x,
          endY: end.y,
          distance,
          duration
        });
      }

      mouseDownRef.current = null;
    };

    const handleFocus = () => {
      addEvent("focusEvents", {
        event: "focus"
      });
    };

    const handleBlur = () => {
      addEvent("focusEvents", {
        event: "blur"
      });
    };

    const handleVisibility = () => {
      addEvent("focusEvents", {
        event: document.hidden ? "tab_hidden" : "tab_visible"
      });
    };

    const handleFileChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      addEvent("files", {
        event: "file_upload",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleClick);
    document.addEventListener("wheel", handleWheel);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("change", handleFileChange, true);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("change", handleFileChange, true);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [userId]);

  return null;
}

export default BehaviorTracker;