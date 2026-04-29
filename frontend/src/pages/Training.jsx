import React, { useEffect, useRef, useState } from "react";

const API = "http://localhost:5000";
const TARGET_SAMPLES = 30;

const defaultEvents = () => ({
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
  mcqAnswers: [],
});

const mcqQuestions = [
  {
    q: "Which database is used in this project?",
    options: ["MySQL", "MongoDB", "Oracle", "SQLite"],
  },
  {
    q: "Which model compares user behavior patterns?",
    options: ["Siamese Neural Network", "KNN", "Naive Bayes", "SVM"],
  },
  {
    q: "Hold time means?",
    options: ["Mouse speed", "Key press duration", "Tab switch", "File upload"],
  },
  {
    q: "Which activity is suspicious in exam?",
    options: ["Copy Paste", "Tab Switch", "Window Blur", "All of the above"],
  },
  {
    q: "Continuous authentication works after?",
    options: ["Login", "Shutdown", "Formatting", "Uninstalling"],
  },
];

const sentences = [
  "Continuous authentication improves security using typing rhythm and mouse behavior.",
  "User monitoring detects suspicious activity during online examination sessions.",
  "Hold time and flight time are important keystroke dynamics features.",
  "MongoDB stores user baseline, alerts, reports, and login activity logs.",
  "Repeated abnormal behavior can result in automatic user logout.",
];

function Training() {
  const [user, setUser] = useState(null);
  const [samples, setSamples] = useState([]);
  const [typedText, setTypedText] = useState("");
  const [currentSentence, setCurrentSentence] = useState(sentences[0]);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [selectedMcq, setSelectedMcq] = useState("");
  const [qualityScore, setQualityScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [dragDone, setDragDone] = useState(false);
  const [fileName, setFileName] = useState("");

  const eventsRef = useRef(defaultEvents());
  const lastKeyDownRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const dragStartRef = useRef(null);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));

    if (!savedUser) {
      alert("Please login first");
      window.location.href = "/";
      return;
    }

    setUser(savedUser);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("click", handleClick);
    window.addEventListener("wheel", handleScroll);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("wheel", handleScroll);
    };
  }, []);

  useEffect(() => {
    calculateQuality();
  }, [samples]);

  const now = () => Date.now();

  const handleVisibilityChange = () => {
    if (document.hidden) {
      eventsRef.current.tabSwitches.push({
        type: "tab_switch",
        time: now(),
      });
    }
  };

  const handleWindowBlur = () => {
    eventsRef.current.focusEvents.push({
      type: "window_blur",
      time: now(),
    });
  };

  const handlePaste = () => {
    eventsRef.current.pasteEvents.push({
      type: "paste",
      time: now(),
    });
  };

  const handleKeyDown = (e) => {
    const t = now();

    eventsRef.current.keys.push({
      key: e.key,
      type: "down",
      time: t,
    });

    if (lastKeyTimeRef.current) {
      const flight = t - lastKeyTimeRef.current;
      if (flight > 0 && flight < 2000) {
        eventsRef.current.flightTimes.push(flight);
      }
    }

    lastKeyDownRef.current[e.key] = t;
    lastKeyTimeRef.current = t;
  };

  const handleKeyUp = (e) => {
    const t = now();

    eventsRef.current.keys.push({
      key: e.key,
      type: "up",
      time: t,
    });

    const downTime = lastKeyDownRef.current[e.key];
    if (downTime) {
      const hold = t - downTime;
      if (hold > 0 && hold < 3000) {
        eventsRef.current.holdTimes.push(hold);
      }
    }
  };

  const handleMouseMove = (e) => {
    const t = now();

    eventsRef.current.mouse.push({
      type: "move",
      x: e.clientX,
      y: e.clientY,
      time: t,
    });

    if (lastMouseRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      const dt = t - lastMouseRef.current.time;

      if (dt > 0) {
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        eventsRef.current.mouseSpeeds.push(speed);
      }
    }

    lastMouseRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: t,
    };
  };

  const handleMouseDown = (e) => {
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: now(),
    };
  };

  const handleMouseUp = (e) => {
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
        endTime: now(),
      });
    }

    dragStartRef.current = null;
  };

  const handleClick = (e) => {
    eventsRef.current.clicks.push({
      type: "click",
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      time: now(),
    });
  };

  const handleScroll = (e) => {
    eventsRef.current.scrolls.push({
      type: "scroll",
      deltaY: e.deltaY,
      time: now(),
    });
  };

  const handleMcqSelect = (option) => {
    setSelectedMcq(option);

    eventsRef.current.mcqAnswers.push({
      question: mcqQuestions[mcqIndex].q,
      selected: option,
      time: now(),
    });

    setTimeout(() => {
      setMcqIndex((prev) => (prev + 1) % mcqQuestions.length);
      setSelectedMcq("");
    }, 400);
  };

  const handleFileChoose = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    eventsRef.current.files.push({
      name: file.name,
      size: file.size,
      type: file.type,
      time: now(),
    });
  };

  const generateSentence = () => {
    const random = sentences[Math.floor(Math.random() * sentences.length)];
    setCurrentSentence(random);
    setTypedText("");
  };

  const calculateQuality = () => {
    const sampleCountScore = Math.min((samples.length / TARGET_SAMPLES) * 40, 40);

    const totalKeys = samples.reduce((a, s) => a + (s.keys?.length || 0), 0);
    const totalMouse = samples.reduce((a, s) => a + (s.mouse?.length || 0), 0);
    const totalClicks = samples.reduce((a, s) => a + (s.clicks?.length || 0), 0);
    const totalDrags = samples.reduce((a, s) => a + (s.drags?.length || 0), 0);
    const totalFiles = samples.reduce((a, s) => a + (s.files?.length || 0), 0);
    const totalMcq = samples.reduce((a, s) => a + (s.mcqAnswers?.length || 0), 0);
    const totalHold = samples.reduce((a, s) => a + (s.holdTimes?.length || 0), 0);

    let behaviorScore = 0;

    if (totalKeys > 200) behaviorScore += 12;
    if (totalMouse > 150) behaviorScore += 12;
    if (totalClicks > 30) behaviorScore += 8;
    if (totalHold > 50) behaviorScore += 12;
    if (totalDrags > 3) behaviorScore += 8;
    if (totalFiles > 0) behaviorScore += 4;
    if (totalMcq > 5) behaviorScore += 4;

    setQualityScore(Math.min(Math.round(sampleCountScore + behaviorScore), 100));
  };

  const saveSample = () => {
    if (typedText.trim().length < 15) {
      alert("Please type the sentence properly before saving sample");
      return;
    }

    if (eventsRef.current.mcqAnswers.length < 1) {
      alert("Please answer at least one MCQ before saving sample");
      return;
    }

    const current = {
      ...eventsRef.current,
      typedLength: typedText.length,
      createdAt: now(),
    };

    setSamples((prev) => [...prev, current]);

    eventsRef.current = defaultEvents();
    lastKeyDownRef.current = {};
    lastKeyTimeRef.current = null;
    lastMouseRef.current = null;
    dragStartRef.current = null;

    setTypedText("");
    setSelectedMcq("");
    setDragDone(false);
    setFileName("");
    generateSentence();
  };

  const saveTraining = async () => {
    if (!user) return;

    if (samples.length < 15) {
      alert("Need minimum 15 good samples");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`${API}/api/training/save-baseline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.username,
          samples,
          qualityScore,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Training save failed");
        setIsSaving(false);
        return;
      }

      alert("Training completed successfully. Please login again.");

      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("role");
      localStorage.removeItem("hasBaseline");

      window.location.href = "/";
    } catch (error) {
      alert("Backend connection failed");
    }

    setIsSaving(false);
  };

  const progress = Math.min(Math.round((samples.length / TARGET_SAMPLES) * 100), 100);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow p-6">
          <h1 className="text-3xl font-bold text-slate-900">Training Mode</h1>
          <p className="text-slate-600 mt-2">
            MCQ + Typing + Mouse + Drag + File interaction capture for strong baseline.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <Card title="Samples" value={`${samples.length}/${TARGET_SAMPLES}`} />
          <Card title="Quality" value={`${qualityScore}%`} />
          <Card title="Progress" value={`${progress}%`} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white rounded-3xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">1. MCQ Interaction Task</h2>
            <div className="bg-slate-100 rounded-2xl p-4 mb-4 font-semibold">
              {mcqQuestions[mcqIndex].q}
            </div>

            <div className="space-y-3">
              {mcqQuestions[mcqIndex].options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleMcqSelect(opt)}
                  className={`w-full text-left border rounded-2xl p-4 font-semibold ${
                    selectedMcq === opt
                      ? "bg-green-100 border-green-500 text-green-700"
                      : "bg-white hover:bg-blue-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">2. Typing Task</h2>
            <div className="bg-slate-100 rounded-2xl p-4 mb-4 text-lg">
              {currentSentence}
            </div>

            <textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full h-40 rounded-2xl border p-4 text-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type here naturally..."
            />

            <button
              onClick={generateSentence}
              className="mt-4 bg-slate-700 text-white px-5 py-3 rounded-2xl font-bold"
            >
              Change Sentence
            </button>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white rounded-3xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">3. Drag Task</h2>
            <p className="text-slate-600 mb-4">
              Drag inside this box. Mouse drag pattern will be recorded.
            </p>

            <div
              draggable
              onDragStart={() => {
                eventsRef.current.drags.push({
                  type: "html_drag_start",
                  time: now(),
                });
              }}
              onDragEnd={() => {
                eventsRef.current.drags.push({
                  type: "html_drag_end",
                  time: now(),
                });
                setDragDone(true);
              }}
              className="h-48 rounded-3xl border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center cursor-move select-none"
            >
              <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow">
                Drag Me
              </div>
            </div>

            {dragDone && (
              <p className="mt-4 text-green-600 font-bold">Drag captured successfully</p>
            )}
          </section>

          <section className="bg-white rounded-3xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">4. File Choose Task</h2>
            <p className="text-slate-600 mb-4">
              Choose any file. Only file metadata is recorded, file content is not uploaded.
            </p>

            <input
              type="file"
              onChange={handleFileChoose}
              className="w-full rounded-2xl border p-4 bg-slate-50"
            />

            {fileName && (
              <p className="mt-4 text-green-700 font-bold">
                Selected file: {fileName}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Small label="Keys" value={eventsRef.current.keys.length} />
              <Small label="Mouse" value={eventsRef.current.mouse.length} />
              <Small label="Clicks" value={eventsRef.current.clicks.length} />
              <Small label="Drags" value={eventsRef.current.drags.length} />
            </div>
          </section>
        </div>

        <section className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-xl font-bold mb-4">Save Current Training Sample</h2>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={saveSample}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold"
            >
              Save Sample
            </button>

            <button
              onClick={saveTraining}
              disabled={isSaving}
              className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Complete Training"}
            </button>

            <button
              onClick={() => (window.location.href = "/user")}
              className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold"
            >
              Back to Dashboard
            </button>
          </div>

          <p className="text-slate-500 mt-4">
            Minimum 15 samples required. Best accuracy ku 20–30 samples collect pannunga.
          </p>
        </section>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="text-4xl font-bold mt-2">{value}</h2>
    </div>
  );
}

function Small({ label, value }) {
  return (
    <div className="bg-slate-100 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

export default Training;