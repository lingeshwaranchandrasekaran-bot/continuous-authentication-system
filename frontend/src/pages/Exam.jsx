import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://continuous-authentication-system.onrender.com";
const MAX_WARNINGS = 3;
const EXAM_TIME_SECONDS = 15 * 60;

const examTasks = [
  {
    type: "mcq",
    question: "Which model is used in this project for user behavior comparison?",
    options: ["CNN", "Siamese Neural Network", "KNN", "Naive Bayes"],
    answer: "Siamese Neural Network",
  },
  {
    type: "mcq",
    question: "Which database is used in this system?",
    options: ["MySQL", "MongoDB", "Oracle", "SQLite"],
    answer: "MongoDB",
  },
  {
    type: "mcq",
    question: "Which feature measures how long a key is pressed?",
    options: ["Flight time", "Hold time", "Mouse speed", "Latency"],
    answer: "Hold time",
  },
  {
    type: "mcq",
    question: "Which frontend framework is used here?",
    options: ["React", "Django", "Flask", "Spring"],
    answer: "React",
  },
  {
    type: "mcq",
    question: "Which suspicious action is checked during exam?",
    options: ["Copy paste", "Tab switch", "Window blur", "All of the above"],
    answer: "All of the above",
  },
  {
    type: "sentence",
    question: "Type exactly: Continuous authentication improves security using typing rhythm and mouse behavior.",
    answer: "Continuous authentication improves security using typing rhythm and mouse behavior.",
  },
  {
    type: "sentence",
    question: "Type exactly: User monitoring detects suspicious activity during online examination sessions.",
    answer: "User monitoring detects suspicious activity during online examination sessions.",
  },
  {
    type: "sentence",
    question: "Type exactly: Hold time and flight time are important keystroke dynamics features.",
    answer: "Hold time and flight time are important keystroke dynamics features.",
  },
  {
    type: "sentence",
    question: "Type exactly: MongoDB stores user baseline, alerts, reports, and login activity logs.",
    answer: "MongoDB stores user baseline, alerts, reports, and login activity logs.",
  },
  {
    type: "sentence",
    question: "Type exactly: Repeated abnormal behavior can result in automatic user logout.",
    answer: "Repeated abnormal behavior can result in automatic user logout.",
  },
];

const emptyEvents = () => ({
  keys: [],
  mouse: [],
  clicks: [],
  scrolls: [],
  drags: [],
  files: [],
  focusEvents: [],
  pasteEvents: [],
  tabSwitches: [],
  holdTimes: [],
  flightTimes: [],
  mouseSpeeds: [],
});

const warningText = {
  TAB_SWITCH: "Tab switch detected. Please stay on the exam page.",
  WINDOW_BLUR: "Exam window focus lost. Please continue in the exam window.",
  COPY_BLOCKED: "Copy action is not allowed during exam.",
  PASTE_BLOCKED: "Paste action is not allowed during exam.",
  RIGHT_CLICK_BLOCKED: "Right click is disabled during exam.",
  AI_SIMILARITY_LOW: "Your behavior pattern looks different from your training baseline.",
  AI_SIMILARITY_VERY_LOW: "Your behavior pattern is highly different from your training baseline.",
  AI_SIMILARITY_CRITICAL: "Critical behavior mismatch detected.",
  HOLD_TIME_CHANGED: "Typing key hold pattern changed.",
  HOLD_VARIANCE_CHANGED: "Typing hold-time variation changed.",
  FLIGHT_TIME_CHANGED: "Typing speed rhythm changed.",
  FLIGHT_VARIANCE_CHANGED: "Typing rhythm variation changed.",
  MOUSE_SPEED_CHANGED: "Mouse movement speed changed.",
  MOUSE_VARIANCE_CHANGED: "Mouse movement pattern changed.",
  KEY_ACTIVITY_CHANGED: "Keyboard activity pattern changed.",
  CLICK_ACTIVITY_CHANGED: "Click activity pattern changed.",
  FRAUD_STATUS: "High risk behavior detected.",
  SUSPICIOUS_STATUS: "Suspicious behavior detected.",
  TIME_UP: "Exam time completed. Auto submitting exam.",
};

const patternReasons = [
  "AI_SIMILARITY_LOW",
  "AI_SIMILARITY_VERY_LOW",
  "AI_SIMILARITY_CRITICAL",
  "HOLD_TIME_CHANGED",
  "HOLD_VARIANCE_CHANGED",
  "FLIGHT_TIME_CHANGED",
  "FLIGHT_VARIANCE_CHANGED",
  "MOUSE_SPEED_CHANGED",
  "MOUSE_VARIANCE_CHANGED",
  "KEY_ACTIVITY_CHANGED",
  "CLICK_ACTIVITY_CHANGED",
];

const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]/g, "")
    .trim();

const isSentenceCorrect = (typed, correct) =>
  normalizeText(typed) === normalizeText(correct);

function Exam() {
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [visibleWarnings, setVisibleWarnings] = useState([]);
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME_SECONDS);
  const [startedAt] = useState(new Date().toISOString());

  const currentTask = useMemo(() => examTasks[index], [index]);

  const eventsRef = useRef(emptyEvents());
  const warningDetailsRef = useRef([]);
  const warningCountRef = useRef(0);
  const keyDownMapRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const lastMouseSaveRef = useRef(0);
  const dragStartRef = useRef(null);
  const userRef = useRef(null);
  const logoutRef = useRef(false);
  const lastPatternWarningRef = useRef(0);
  const latestAnalysisRef = useRef({
    status: "GENUINE",
    riskScore: 0,
    similarity: null,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role === "admin") {
      navigate("/admin");
      return;
    }

    const hasBaseline =
      parsedUser.hasBaseline === true ||
      localStorage.getItem("hasBaseline") === "true";

    if (!hasBaseline) {
      alert("Please complete training before attending exam.");
      navigate("/user");
      return;
    }

    userRef.current = parsedUser;
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && !logoutRef.current) {
          handleAutoSubmitByTime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [answers, selectedOption, textAnswer, index]);

  const buildCurrentAnswer = () => {
    const currentAnswer =
      currentTask.type === "mcq" ? selectedOption : textAnswer;

    const isCorrect =
      currentTask.type === "mcq"
        ? selectedOption === currentTask.answer
        : isSentenceCorrect(textAnswer, currentTask.answer);

    return {
      questionNo: index + 1,
      type: currentTask.type,
      question: currentTask.question,
      selectedAnswer: currentAnswer || "Not Answered",
      correctAnswer: currentTask.answer,
      isCorrect,
      behaviorSummary: {
        keys: eventsRef.current.keys.length,
        mouse: eventsRef.current.mouse.length,
        clicks: eventsRef.current.clicks.length,
        scrolls: eventsRef.current.scrolls.length,
        drags: eventsRef.current.drags.length,
        focusEvents: eventsRef.current.focusEvents.length,
        pasteEvents: eventsRef.current.pasteEvents.length,
        tabSwitches: eventsRef.current.tabSwitches.length,
      },
      sample: {
        taskId: index + 1,
        type: currentTask.type,
        question: currentTask.question,
        selectedAnswer: currentAnswer || "Not Answered",
        correctAnswer: currentTask.answer,
        isCorrect,
        keys: eventsRef.current.keys,
        mouse: eventsRef.current.mouse,
        clicks: eventsRef.current.clicks,
        scrolls: eventsRef.current.scrolls,
        drags: eventsRef.current.drags,
        files: [],
        focusEvents: eventsRef.current.focusEvents,
        pasteEvents: eventsRef.current.pasteEvents,
        tabSwitches: eventsRef.current.tabSwitches,
        holdTimes: eventsRef.current.holdTimes,
        flightTimes: eventsRef.current.flightTimes,
        mouseSpeeds: eventsRef.current.mouseSpeeds,
        createdAt: Date.now(),
      },
    };
  };

  const mergeAnswer = (list, answerObj) => {
    const withoutCurrent = list.filter((a) => a.questionNo !== answerObj.questionNo);
    return [...withoutCurrent, answerObj].sort((a, b) => a.questionNo - b.questionNo);
  };

  const calculateScore = (finalAnswers) => {
    const totalQuestions = examTasks.length;
    const correctAnswers = finalAnswers.filter((a) => a.isCorrect).length;
    const unanswered = totalQuestions - finalAnswers.filter((a) => a.selectedAnswer !== "Not Answered").length;
    const wrongAnswers = totalQuestions - correctAnswers - unanswered;

    const scorePercent =
      totalQuestions > 0
        ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
        : 0;

    let result = "FAIL";

    if (scorePercent >= 80 && warningCountRef.current <= 2) {
      result = "PASS";
    } else if (scorePercent >= 50) {
      result = "REVIEW";
    }

    if (
      warningCountRef.current > MAX_WARNINGS ||
      latestAnalysisRef.current.status === "FRAUD"
    ) {
      result = "SUSPICIOUS";
    }

    return {
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      unanswered,
      scorePercent,
      result,
    };
  };

  const submitExam = async (
    finalAnswers,
    forcedResult = null,
    autoLogout = false
  ) => {
    const user = userRef.current;
    if (!user || submitting) return;

    setSubmitting(true);

    const score = calculateScore(finalAnswers);

    const behaviorSummary = finalAnswers.reduce(
      (acc, item) => {
        const sm = item.behaviorSummary || {};
        acc.keys += sm.keys || 0;
        acc.mouse += sm.mouse || 0;
        acc.clicks += sm.clicks || 0;
        acc.scrolls += sm.scrolls || 0;
        acc.drags += sm.drags || 0;
        acc.focusEvents += sm.focusEvents || 0;
        acc.pasteEvents += sm.pasteEvents || 0;
        acc.tabSwitches += sm.tabSwitches || 0;
        return acc;
      },
      {
        keys: 0,
        mouse: 0,
        clicks: 0,
        scrolls: 0,
        drags: 0,
        focusEvents: 0,
        pasteEvents: 0,
        tabSwitches: 0,
      }
    );

    try {
      const res = await fetch(`${API}/api/exam/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.username,
          totalQuestions: score.totalQuestions,
          correctAnswers: score.correctAnswers,
          wrongAnswers: score.wrongAnswers,
          unanswered: score.unanswered,
          scorePercent: score.scorePercent,
          warnings: warningCountRef.current,
          result: forcedResult || score.result,
          answers: finalAnswers.map((a) => ({
            questionNo: a.questionNo,
            type: a.type,
            question: a.question,
            selectedAnswer: a.selectedAnswer,
            correctAnswer: a.correctAnswer,
            isCorrect: a.isCorrect,
          })),
          warningDetails: warningDetailsRef.current,
          behaviorSummary,
          analysisStatus: latestAnalysisRef.current.status,
          riskScore: latestAnalysisRef.current.riskScore,
          similarity: latestAnalysisRef.current.similarity,
          startedAt,
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          autoLogout,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (!autoLogout) alert(data.error || "Exam submit failed");
        setSubmitting(false);
        return;
      }

      if (!autoLogout) {
        alert("Exam submitted successfully.");
        navigate("/user");
      }
    } catch {
      if (!autoLogout) {
        alert("Backend connection failed. Please try again.");
      }
    }

    setSubmitting(false);
  };

  const finalAnswersWithCurrent = () => {
    const currentAnswerObj = buildCurrentAnswer();
    return mergeAnswer(answers, currentAnswerObj);
  };

  const handleAutoSubmitByTime = async () => {
    if (logoutRef.current) return;
    logoutRef.current = true;
    await addWarning("TIME_UP", false);
    await submitExam(finalAnswersWithCurrent(), "TIME_UP", false);
    navigate("/user");
  };

  const saveAutoLogoutReport = async (reason) => {
    const finalAnswers = finalAnswersWithCurrent();
    await submitExam(finalAnswers, reason, true);
  };

  const triggerAutoLogout = async (reason) => {
    if (logoutRef.current) return;

    logoutRef.current = true;

    const item = {
      id: Date.now() + Math.random(),
      type: "AUTO_LOGOUT",
      message: `Too many warnings. Auto logout triggered. Reason: ${reason}`,
      questionNo: index + 1,
      time: new Date().toISOString(),
    };

    setVisibleWarnings((prev) => [item, ...prev].slice(0, 4));
    warningDetailsRef.current.push(item);

    try {
      await saveAutoLogoutReport("FRAUD_AUTO_LOGOUT");
    } catch {}

    setTimeout(() => {
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("role");
      localStorage.removeItem("hasBaseline");
      window.location.href = "/";
    }, 1500);
  };

  const addWarning = async (type, canAutoLogout = true) => {
    if (logoutRef.current && type !== "TIME_UP") return;

    const message = warningText[type] || "Suspicious exam activity detected.";

    warningCountRef.current += 1;

    const item = {
      id: Date.now() + Math.random(),
      type,
      message,
      questionNo: index + 1,
      time: new Date().toISOString(),
    };

    warningDetailsRef.current.push(item);
    setVisibleWarnings((prev) => [item, ...prev].slice(0, 4));

    if (canAutoLogout && warningCountRef.current > MAX_WARNINGS) {
      await triggerAutoLogout(type);
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        eventsRef.current.tabSwitches.push({
          type: "tab_switch",
          time: Date.now(),
          questionNo: index + 1,
        });
        addWarning("TAB_SWITCH");
      }
    };

    const onBlur = () => {
      eventsRef.current.focusEvents.push({
        type: "window_blur",
        time: Date.now(),
        questionNo: index + 1,
      });
      addWarning("WINDOW_BLUR");
    };

    const onCopy = (e) => {
      e.preventDefault();
      addWarning("COPY_BLOCKED");
    };

    const onPaste = (e) => {
      e.preventDefault();
      eventsRef.current.pasteEvents.push({
        type: "paste",
        time: Date.now(),
        questionNo: index + 1,
      });
      addWarning("PASTE_BLOCKED");
    };

    const onContextMenu = (e) => {
      e.preventDefault();
      addWarning("RIGHT_CLICK_BLOCKED");
    };

    const onKeyDown = (e) => {
      const now = Date.now();

      eventsRef.current.keys.push({
        key: e.key,
        type: "down",
        time: now,
      });

      keyDownMapRef.current[e.key] = now;

      if (lastKeyTimeRef.current !== null) {
        const flight = now - lastKeyTimeRef.current;
        if (flight > 0 && flight < 3000) {
          eventsRef.current.flightTimes.push(flight);
        }
      }

      lastKeyTimeRef.current = now;
    };

    const onKeyUp = (e) => {
      const now = Date.now();

      eventsRef.current.keys.push({
        key: e.key,
        type: "up",
        time: now,
      });

      const downTime = keyDownMapRef.current[e.key];

      if (downTime) {
        const hold = now - downTime;
        if (hold > 0 && hold < 3000) {
          eventsRef.current.holdTimes.push(hold);
        }
      }
    };

    const onMouseMove = (e) => {
      const now = Date.now();

      if (now - lastMouseSaveRef.current < 70) return;
      lastMouseSaveRef.current = now;

      eventsRef.current.mouse.push({
        type: "move",
        x: e.clientX,
        y: e.clientY,
        time: now,
      });

      if (lastMouseRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        const dt = now - lastMouseRef.current.time;

        if (dt > 0) {
          const speed = Math.sqrt(dx * dx + dy * dy) / dt;
          eventsRef.current.mouseSpeeds.push(speed);
        }
      }

      lastMouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: now,
      };
    };

    const onClick = (e) => {
      eventsRef.current.clicks.push({
        type: "click",
        x: e.clientX,
        y: e.clientY,
        button: e.button,
        time: Date.now(),
      });
    };

    const onWheel = (e) => {
      eventsRef.current.scrolls.push({
        type: "scroll",
        deltaY: e.deltaY,
        time: Date.now(),
      });
    };

    const onMouseDown = (e) => {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };
    };

    const onMouseUp = (e) => {
      if (!dragStartRef.current) return;

      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);

      if (dx > 20 || dy > 20) {
        eventsRef.current.drags.push({
          type: "drag",
          startX: dragStartRef.current.x,
          startY: dragStartRef.current.y,
          endX: e.clientX,
          endY: e.clientY,
          startTime: dragStartRef.current.time,
          endTime: Date.now(),
        });
      }

      dragStartRef.current = null;
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [index, answers, selectedOption, textAnswer]);

  const resetQuestionCapture = () => {
    eventsRef.current = emptyEvents();
    keyDownMapRef.current = {};
    lastKeyTimeRef.current = null;
    lastMouseRef.current = null;
    dragStartRef.current = null;
    setSelectedOption("");
    setTextAnswer("");
  };

  const handlePatternWarnings = async (data) => {
    if (!data) return;

    latestAnalysisRef.current = {
      status: data.status || "GENUINE",
      riskScore: data.riskScore || 0,
      similarity: data.similarity,
    };

    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    const foundReason = alerts.find((a) => patternReasons.includes(a));

    const now = Date.now();
    if (now - lastPatternWarningRef.current < 4500) return;

    if (foundReason) {
      lastPatternWarningRef.current = now;
      await addWarning(foundReason);
      return;
    }

    if (data.status === "FRAUD") {
      lastPatternWarningRef.current = now;
      await addWarning("FRAUD_STATUS");
      return;
    }

    if (data.status === "SUSPICIOUS" && Number(data.riskScore || 0) >= 50) {
      lastPatternWarningRef.current = now;
      await addWarning("SUSPICIOUS_STATUS");
    }
  };

  const saveBehaviorInBackground = (answerObj, allAnswerList) => {
    const user = userRef.current;
    if (!user) return;

    const samples = allAnswerList.map((a) => a.sample);

    fetch(`${API}/api/behavior/session-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.username,
        role: user.role || "user",
        page: "exam_question",
        events: answerObj.sample,
      }),
    }).catch(() => {});

    fetch(`${API}/api/behavior/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.username,
        samples,
        copyPaste: answerObj.sample.pasteEvents.length,
        tabSwitch: answerObj.sample.tabSwitches.length,
        warnings: warningCountRef.current,
        focusLost: answerObj.sample.focusEvents.length,
        dragCount: answerObj.sample.drags.length,
      }),
    })
      .then((res) => res.json())
      .then((data) => handlePatternWarnings(data))
      .catch(() => {});
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (logoutRef.current || !userRef.current) return;

      const current = buildCurrentAnswer();
      const currentSamples = mergeAnswer(answers, current);

      const totalEvents =
        current.sample.keys.length +
        current.sample.mouse.length +
        current.sample.clicks.length;

      if (totalEvents < 15) return;

      saveBehaviorInBackground(current, currentSamples);
    }, 5000);

    return () => clearInterval(timer);
  }, [answers, index, selectedOption, textAnswer]);

  const currentAnswer = currentTask.type === "mcq" ? selectedOption : textAnswer;
  const canProceed = currentAnswer.trim().length > 0;
  const progressPercent = Math.round(((index + 1) / examTasks.length) * 100);

  const handleNext = () => {
    if (!currentAnswer.trim()) {
      alert("Please answer this question.");
      return;
    }

    const answerObj = buildCurrentAnswer();
    const updatedAnswers = mergeAnswer(answers, answerObj);

    setAnswers(updatedAnswers);
    saveBehaviorInBackground(answerObj, updatedAnswers);

    if (index < examTasks.length - 1) {
      setIndex((prev) => prev + 1);
      resetQuestionCapture();
      return;
    }

    submitExam(updatedAnswers);
  };

  const formatTimer = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 select-none">
      {visibleWarnings.length > 0 && (
        <div className="fixed top-6 right-6 z-50 space-y-3 w-[360px]">
          {visibleWarnings.map((w) => (
            <div
              key={w.id}
              className="bg-orange-50 border border-orange-300 text-orange-900 rounded-2xl p-4 shadow-xl"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-bold">
                    Warning {warningCountRef.current}/{MAX_WARNINGS}
                  </p>
                  <p className="text-sm mt-1">{w.message}</p>
                </div>

                <button
                  onClick={() =>
                    setVisibleWarnings((prev) =>
                      prev.filter((item) => item.id !== w.id)
                    )
                  }
                  className="font-bold text-orange-700"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow border p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black text-slate-950">
                Online Examination
              </h1>
              <p className="text-slate-500 mt-2">
                Read the question carefully and submit your answer.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <InfoBox title="Time" value={formatTimer(timeLeft)} tone={timeLeft < 120 ? "danger" : "normal"} />
              <InfoBox title="Question" value={`${index + 1}/${examTasks.length}`} />
              <InfoBox title="Warnings" value={`${warningCountRef.current}/${MAX_WARNINGS}`} tone={warningCountRef.current >= 2 ? "danger" : "normal"} />
            </div>
          </div>

          <div className="mt-6">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow border p-6">
          <div className="bg-slate-50 border rounded-3xl p-5 mb-6">
            <p className="text-xl font-bold text-slate-900">
              {currentTask.question}
            </p>
          </div>

          {currentTask.type === "mcq" && (
            <div className="grid md:grid-cols-2 gap-4">
              {currentTask.options.map((option, optionIndex) => (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                  className={`text-left rounded-2xl border p-5 font-semibold transition ${
                    selectedOption === option
                      ? "bg-blue-600 text-white border-blue-600 shadow"
                      : "bg-white border-slate-200 hover:bg-blue-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {currentTask.type === "sentence" && (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full h-44 rounded-3xl border border-slate-200 p-5 text-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your answer here..."
            />
          )}

          <div className="flex justify-between items-center mt-8">
            <p className="text-sm text-slate-500">
              Copy, paste, right click, tab switch and behavior mismatch are monitored.
            </p>

            <button
              type="button"
              onClick={handleNext}
              disabled={submitting || !canProceed || logoutRef.current}
              className={`px-8 py-4 rounded-2xl font-bold transition ${
                canProceed
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              } disabled:opacity-60`}
            >
              {index === examTasks.length - 1
                ? submitting
                  ? "Submitting..."
                  : "Submit Exam"
                : "Next Question"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow border p-5 text-sm text-slate-500">
          Exam activity is securely monitored for academic integrity.
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, value, tone = "normal" }) {
  return (
    <div
      className={`border rounded-2xl px-5 py-3 ${
        tone === "danger"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-blue-50 border-blue-200 text-blue-700"
      }`}
    >
      <p className="text-xs font-bold">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

export default Exam;