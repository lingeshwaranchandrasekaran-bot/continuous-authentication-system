import React, { useEffect, useMemo, useRef, useState } from "react";

const examTasks = [
  {
    type: "mcq",
    question: "Which model is used in this project for user behavior comparison?",
    options: ["CNN", "Siamese Neural Network", "KNN", "Naive Bayes"]
  },
  {
    type: "mcq",
    question: "Which database is used in this system?",
    options: ["MySQL", "MongoDB", "Oracle", "SQLite"]
  },
  {
    type: "mcq",
    question: "Which feature measures how long a key is pressed?",
    options: ["Flight time", "Hold time", "Mouse speed", "Latency"]
  },
  {
    type: "mcq",
    question: "Which frontend framework is used here?",
    options: ["React", "Django", "Flask", "Spring"]
  },
  {
    type: "mcq",
    question: "Which suspicious action is checked during exam?",
    options: ["Copy paste", "Tab switch", "Window blur", "All of the above"]
  },
  {
    type: "mcq",
    question: "Which backend framework is used?",
    options: ["Laravel", "Flask", "Angular", "Express only"]
  },
  {
    type: "mcq",
    question: "Which command shows IP information in Linux?",
    options: ["pwd", "ls", "ip a", "cd"] 
  },
  {
    type: "mcq",
    question: "Which typing feature measures time between keys?",
    options: ["Flight time", "Hold time", "Scroll time", "Click time"]
  },
  {
    type: "mcq",
    question: "Which collection stores training baseline?",
    options: ["alerts", "training", "reports", "analysis_only"]
  },
  {
    type: "mcq",
    question: "What should happen after repeated fraud warnings?",
    options: ["Ignore", "Auto logout", "Refresh page", "Change color"]
  },

  {
    type: "sentence",
    question: "Type exactly: Continuous authentication improves security using typing rhythm and mouse behavior."
  },
  {
    type: "sentence",
    question: "Type exactly: User monitoring detects suspicious activity during online examination sessions."
  },
  {
    type: "sentence",
    question: "Type exactly: Hold time and flight time are important keystroke dynamics features."
  },
  {
    type: "sentence",
    question: "Type exactly: MongoDB stores user baseline, alerts, reports, and login activity logs."
  },
  {
    type: "sentence",
    question: "Type exactly: Tab switching and copy paste detection help prevent exam fraud."
  },
  {
    type: "sentence",
    question: "Type exactly: The system compares current behavior with previously stored user patterns."
  },
  {
    type: "sentence",
    question: "Type exactly: Mouse movement speed and click behavior also support user identification."
  },
  {
    type: "sentence",
    question: "Type exactly: Admin dashboard displays user activity reports and generated fraud alerts."
  },
  {
    type: "sentence",
    question: "Type exactly: Behavior mismatch warnings increase when the current typing style changes."
  },
  {
    type: "sentence",
    question: "Type exactly: Repeated abnormal behavior can result in automatic user logout."
  }
];

function Exam() {
  const [index, setIndex] = useState(0);

  const [warnings, setWarnings] = useState(0);
  const [patternWarnings, setPatternWarnings] = useState(0);
  const [copyPaste, setCopyPaste] = useState(0);
  const [tabSwitch, setTabSwitch] = useState(0);

  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");

  const [keys, setKeys] = useState([]);
  const [mouse, setMouse] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [holdTimes, setHoldTimes] = useState([]);
  const [flightTimes, setFlightTimes] = useState([]);
  const [mouseSpeeds, setMouseSpeeds] = useState([]);

  const [allAnswers, setAllAnswers] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState("Monitoring...");
  const [submitting, setSubmitting] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [warningHistory, setWarningHistory] = useState([]);

  const keyDownMapRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const logoutRef = useRef(false);
  const ignoreBlurRef = useRef(false);
  const lastPatternAlertRef = useRef(0);

  const currentTask = useMemo(() => examTasks[index], [index]);
  const userId = localStorage.getItem("userId") || "user1";

  const addNotification = (message, type = "warning") => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const closeNotification = (id) => {
    ignoreBlurRef.current = true;
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    setTimeout(() => {
      ignoreBlurRef.current = false;
    }, 500);
  };

  const pushWarningHistory = (reason, kind = "RULE") => {
    const entry = {
      reason,
      kind,
      time: new Date().toISOString(),
      questionNo: index + 1
    };
    setWarningHistory((prev) => [...prev, entry]);
  };

  const handleKeyDown = (e) => {
    const now = Date.now();

    setKeys((prev) => [...prev, { key: e.key, type: "down", time: now }]);
    keyDownMapRef.current[e.key] = now;

    if (lastKeyTimeRef.current !== null) {
      const flight = now - lastKeyTimeRef.current;
      if (flight > 0) {
        setFlightTimes((prev) => [...prev, flight]);
      }
    }

    lastKeyTimeRef.current = now;
  };

  const handleKeyUp = (e) => {
    const now = Date.now();

    setKeys((prev) => [...prev, { key: e.key, type: "up", time: now }]);

    const downTime = keyDownMapRef.current[e.key];
    if (downTime) {
      const hold = now - downTime;
      if (hold > 0) {
        setHoldTimes((prev) => [...prev, hold]);
      }
    }
  };

  const handleMouseMove = (e) => {
    const now = Date.now();

    setMouse((prev) => [
      ...prev,
      { type: "move", x: e.clientX, y: e.clientY, time: now }
    ]);

    if (lastMouseRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      const dt = now - lastMouseRef.current.time;

      if (dt > 0) {
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        setMouseSpeeds((prev) => [...prev, speed]);
      }
    }

    lastMouseRef.current = { x: e.clientX, y: e.clientY, time: now };
  };

  const handleNormalClick = (e) => {
    setClicks((prev) => [
      ...prev,
      { type: "click", x: e.clientX, y: e.clientY, button: e.button, time: Date.now() }
    ]);
  };

  const handleWheel = (e) => {
    setMouse((prev) => [
      ...prev,
      { type: "scroll", deltaY: e.deltaY, time: Date.now() }
    ]);
  };

  const addGeneralWarning = async (reason) => {
    const nextWarnings = warnings + 1;
    setWarnings(nextWarnings);

    pushWarningHistory(reason, "RULE");
    addNotification(`Warning ${nextWarnings}: ${reason}`, "warning");

    if (reason === "COPY" || reason === "PASTE") {
      setCopyPaste((prev) => prev + 1);
    }

    if (reason === "TAB_SWITCH") {
      setTabSwitch((prev) => prev + 1);
    }

    // 1,2,3 warning மட்டும் show
    // 4th warning வந்தா logout
    if (nextWarnings > 3 && !logoutRef.current) {
      logoutRef.current = true;
      await saveExamReport("FRAUD_AUTO_LOGOUT");
      addNotification("Too many suspicious actions. Auto logout.", "error");

      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    }
  };

  const addPatternWarning = async (reason = "PATTERN_MISMATCH") => {
    const nextPatternWarnings = patternWarnings + 1;
    setPatternWarnings(nextPatternWarnings);

    pushWarningHistory(reason, "PATTERN");
    addNotification(`Pattern Warning ${nextPatternWarnings}: ${reason}`, "warning");

    // 1,2,3 மட்டும் show
    // 4th pattern warning வந்தா logout
    if (nextPatternWarnings > 3 && !logoutRef.current) {
      logoutRef.current = true;
      await saveExamReport("PATTERN_AUTO_LOGOUT");
      addNotification("Repeated typing mismatch detected. Auto logout.", "error");

      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        addGeneralWarning("TAB_SWITCH");
      }
    };

    const onCopy = (e) => {
      e.preventDefault();
      addGeneralWarning("COPY");
    };

    const onPaste = (e) => {
      e.preventDefault();
      addGeneralWarning("PASTE");
    };

    const onRightClick = (e) => {
      e.preventDefault();
      addGeneralWarning("RIGHT_CLICK");
    };

    const onBlur = () => {
      if (ignoreBlurRef.current) return;
      addGeneralWarning("WINDOW_BLUR");
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onRightClick);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onRightClick);
      window.removeEventListener("blur", onBlur);
    };
  }, [warnings, patternWarnings]);

  const buildCurrentSample = () => ({
    taskId: index + 1,
    type: currentTask.type,
    question: currentTask.question,
    answer: currentTask.type === "mcq" ? selectedOption : textAnswer,
    keys,
    mouse,
    clicks,
    holdTimes,
    flightTimes,
    mouseSpeeds,
    createdAt: Date.now()
  });

  const resetCurrentCapture = () => {
    setTextAnswer("");
    setSelectedOption("");
    setKeys([]);
    setMouse([]);
    setClicks([]);
    setHoldTimes([]);
    setFlightTimes([]);
    setMouseSpeeds([]);

    keyDownMapRef.current = {};
    lastKeyTimeRef.current = null;
    lastMouseRef.current = null;
  };

  const analyzeBehavior = async (samplesToCheck) => {
    try {
      const res = await fetch("http://localhost:5000/api/behavior/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          samples: samplesToCheck,
          copyPaste,
          tabSwitch,
          warnings
        })
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        return null;
      }

      setAnalysisStatus(
        `Status: ${data.status} | Risk: ${data.riskScore} | Similarity: ${
          typeof data.similarity === "number"
            ? data.similarity.toFixed(3)
            : data.similarity
        }`
      );

      if (Array.isArray(data.alerts)) {
        const patternReasons = [
          "AI_MISMATCH",
          "LOW_SIMILARITY",
          "HOLD_TIME_CHANGED",
          "FLIGHT_TIME_CHANGED",
          "TYPING_ACTIVITY_LOW",
          "MOUSE_SPEED_CHANGED",
          "MOUSE_ACTIVITY_LOW"
        ];

        const foundReason = data.alerts.find((x) => patternReasons.includes(x));

        if (foundReason) {
          const now = Date.now();
          if (now - lastPatternAlertRef.current > 4000) {
            lastPatternAlertRef.current = now;
            await addPatternWarning(foundReason);
          }
        }
      }

      // direct logout வேண்டாம்
      // only warning flow follow பண்ணணும்
      if (data.status === "FRAUD") {
        addNotification("Fraud risk detected. Please continue carefully.", "warning");
      }

      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!logoutRef.current) {
        const currentSamples = [...allAnswers, buildCurrentSample()];
        analyzeBehavior(currentSamples);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [
    allAnswers,
    keys,
    mouse,
    clicks,
    holdTimes,
    flightTimes,
    mouseSpeeds,
    copyPaste,
    tabSwitch,
    warnings
  ]);

  const saveExamReport = async (result = "SUBMITTED", finalAnswers = allAnswers) => {
    try {
      await fetch("http://localhost:5000/api/exam/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          warnings: warnings + patternWarnings,
          result,
          log: finalAnswers,
          warningDetails: warningHistory
        })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleNext = async () => {
    const updated = [...allAnswers, buildCurrentSample()];
    setAllAnswers(updated);

    await analyzeBehavior(updated);

    if (index < examTasks.length - 1) {
      setIndex((prev) => prev + 1);
      resetCurrentCapture();
      return;
    }

    await handleSubmit(updated);
  };

  const handleSubmit = async (finalAnswers = allAnswers) => {
    try {
      setSubmitting(true);
      await analyzeBehavior(finalAnswers);
      await saveExamReport("SUBMITTED", finalAnswers);
      addNotification("Exam submitted successfully", "success");

      setTimeout(() => {
        window.location.href = "/user";
      }, 1000);
    } catch (error) {
      console.error(error);
      addNotification("Error submitting exam", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-100 p-6"
      onMouseMove={handleMouseMove}
      onClick={handleNormalClick}
      onWheel={handleWheel}
    >
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`w-80 rounded-xl shadow-lg p-4 text-white ${
              n.type === "error"
                ? "bg-red-600"
                : n.type === "success"
                ? "bg-green-600"
                : "bg-yellow-600"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium">{n.message}</div>
              <button
                type="button"
                onMouseDown={() => {
                  ignoreBlurRef.current = true;
                }}
                onClick={() => closeNotification(n.id)}
                className="bg-white/20 px-2 py-1 rounded"
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-red-700 mb-4">Exam Module</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-red-50 p-3 rounded">Rule Warnings: {warnings}</div>
          <div className="bg-yellow-50 p-3 rounded">Pattern Warnings: {patternWarnings}</div>
          <div className="bg-blue-50 p-3 rounded">Question: {index + 1} / {examTasks.length}</div>
          <div className="bg-green-50 p-3 rounded">{analysisStatus}</div>
        </div>

        <div className="bg-gray-50 border rounded p-4 mb-4">
          <h2 className="font-bold mb-2">Task</h2>
          <p>{currentTask.question}</p>
        </div>

        {currentTask.type === "mcq" && (
          <div className="space-y-2 mb-4">
            {currentTask.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedOption(opt)}
                className={`block w-full text-left border rounded p-3 ${
                  selectedOption === opt ? "bg-green-100 border-green-500" : ""
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {currentTask.type === "sentence" && (
          <textarea
            className="w-full border rounded p-3 h-36 mb-4"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder="Type your answer here..."
          />
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <div className="bg-blue-50 p-3 rounded">Keys: {keys.length}</div>
          <div className="bg-purple-50 p-3 rounded">Mouse: {mouse.length}</div>
          <div className="bg-orange-50 p-3 rounded">Clicks: {clicks.length}</div>
          <div className="bg-green-50 p-3 rounded">Hold: {holdTimes.length}</div>
          <div className="bg-pink-50 p-3 rounded">Flight: {flightTimes.length}</div>
          <div className="bg-yellow-50 p-3 rounded">Mouse Speed: {mouseSpeeds.length}</div>
        </div>

        <button
          onClick={handleNext}
          disabled={submitting}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {index === examTasks.length - 1
            ? submitting
              ? "Submitting..."
              : "Submit Exam"
            : "Next"}
        </button>
      </div>
    </div>
  );
}

export default Exam;