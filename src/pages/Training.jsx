import React, { useEffect, useRef, useState } from "react";

const API = "http://localhost:5000";

const mcqQuestions = [
  { q: "Which database is used in this project?", options: ["MongoDB", "MySQL", "Oracle", "SQLite"] },
  { q: "Which model compares user behavior?", options: ["Siamese Neural Network", "KNN", "Naive Bayes", "Decision Tree"] },
  { q: "Hold time means?", options: ["Key press duration", "Mouse speed", "Tab switch", "Scroll time"] },
  { q: "Flight time means?", options: ["Time between two key presses", "File upload time", "Mouse click", "Page load"] },
  { q: "Which data is used for behavior biometrics?", options: ["Keystroke + Mouse", "Only password", "Only OTP", "Only email"] },
  { q: "Suspicious exam action?", options: ["Copy paste", "Tab switch", "Window blur", "All of the above"] },
  { q: "Backend framework used?", options: ["Flask", "Django", "Spring", "Laravel"] },
  { q: "Frontend framework used?", options: ["React", "Angular", "Vue", "Next only"] },
  { q: "Training data is stored in?", options: ["MongoDB", "Excel", "PDF", "Notepad"] },
  { q: "Continuous authentication checks user?", options: ["After login also", "Only before login", "Only signup", "Never"] },
];

const sentences = [
  "The quick brown fox jumps over the lazy dog and checks every keyboard pattern.",
  "Continuous authentication monitors typing rhythm mouse movement and click behavior.",
  "A secure system should verify the user even after the normal login process.",
  "Keystroke dynamics uses hold time flight time typing speed and correction pattern.",
  "Mouse behavior includes movement speed clicks scrolling dragging and idle activity.",
  "MongoDB stores users training baseline alerts reports login logs and behavior sessions.",
  "Siamese neural network compares current user behavior with the stored baseline.",
  "Online exam fraud detection can identify tab switch copy paste and abnormal typing.",
  "Admin dashboard shows user activity risk score suspicious alerts and PDF reports.",
  "This project improves security by detecting unauthorized users during active sessions.",
];

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

function Training() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("mcq");

  const [mcqDone, setMcqDone] = useState(0);
  const [sentenceDone, setSentenceDone] = useState(0);
  const [fileDone, setFileDone] = useState(0);
  const [dragDone, setDragDone] = useState(0);

  const [typedText, setTypedText] = useState("");
  const [samples, setSamples] = useState([]);
  const [qualityScore, setQualityScore] = useState(0);
  const [saving, setSaving] = useState(false);

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

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("wheel", onScroll);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const score =
      Math.min(mcqDone * 2, 20) +
      Math.min(sentenceDone * 3, 30) +
      Math.min(fileDone * 4, 20) +
      Math.min(dragDone * 3, 15) +
      Math.min(samples.length, 15);

    setQualityScore(Math.min(score, 100));
  }, [mcqDone, sentenceDone, fileDone, dragDone, samples]);

  const now = () => Date.now();

  const resetCapture = () => {
    eventsRef.current = defaultEvents();
    lastKeyDownRef.current = {};
    lastKeyTimeRef.current = null;
    lastMouseRef.current = null;
    dragStartRef.current = null;
  };

  const saveCurrentSample = (extra = {}) => {
    const sample = {
      ...eventsRef.current,
      ...extra,
      createdAt: now(),
    };

    setSamples((prev) => [...prev, sample]);
    resetCapture();
  };

  const onVisibility = () => {
    if (document.hidden) {
      eventsRef.current.tabSwitches.push({
        type: "tab_switch",
        time: now(),
      });
    }
  };

  const onBlur = () => {
    eventsRef.current.focusEvents.push({
      type: "window_blur",
      time: now(),
    });
  };

  const onPaste = () => {
    eventsRef.current.pasteEvents.push({
      type: "paste",
      time: now(),
    });
  };

  const onKeyDown = (e) => {
    const t = now();

    eventsRef.current.keys.push({
      key: e.key,
      type: "down",
      time: t,
    });

    if (lastKeyTimeRef.current) {
      const flight = t - lastKeyTimeRef.current;
      if (flight > 0 && flight < 3000) {
        eventsRef.current.flightTimes.push(flight);
      }
    }

    lastKeyDownRef.current[e.key] = t;
    lastKeyTimeRef.current = t;
  };

  const onKeyUp = (e) => {
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

  const onMouseMove = (e) => {
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
        eventsRef.current.mouseSpeeds.push(Math.sqrt(dx * dx + dy * dy) / dt);
      }
    }

    lastMouseRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: t,
    };
  };

  const onClick = (e) => {
    eventsRef.current.clicks.push({
      type: "click",
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      time: now(),
    });
  };

  const onScroll = (e) => {
    eventsRef.current.scrolls.push({
      type: "scroll",
      deltaY: e.deltaY,
      time: now(),
    });
  };

  const onMouseDown = (e) => {
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: now(),
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
        endTime: now(),
      });
    }

    dragStartRef.current = null;
  };

  const handleMcqAnswer = (option) => {
    const question = mcqQuestions[mcqDone];

    eventsRef.current.mcqAnswers.push({
      questionNo: mcqDone + 1,
      question: question.q,
      selected: option,
      time: now(),
    });

    saveCurrentSample({
      taskType: "mcq",
      questionNo: mcqDone + 1,
      question: question.q,
      answer: option,
    });

    const next = mcqDone + 1;
    setMcqDone(next);

    if (next >= 10) {
      setStep("sentence");
    }
  };

  const handleSentenceNext = () => {
    const expected = sentences[sentenceDone];

    if (typedText.trim().length < 20) {
      alert("Please type the sentence properly");
      return;
    }

    saveCurrentSample({
      taskType: "sentence",
      sentenceNo: sentenceDone + 1,
      expectedTextLength: expected.length,
      typedLength: typedText.length,
    });

    setTypedText("");

    const next = sentenceDone + 1;
    setSentenceDone(next);

    if (next >= 10) {
      setStep("file");
    }
  };

  const handleFileChoose = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    eventsRef.current.files.push({
      fileNo: fileDone + 1,
      name: file.name,
      size: file.size,
      type: file.type,
      time: now(),
    });

    saveCurrentSample({
      taskType: "file",
      fileNo: fileDone + 1,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const next = fileDone + 1;
    setFileDone(next);

    if (next >= 5) {
      setStep("drag");
    }

    e.target.value = "";
  };

  const handleHtmlDragStart = () => {
    eventsRef.current.drags.push({
      type: "html_drag_start",
      time: now(),
    });
  };

  const handleHtmlDragEnd = () => {
    eventsRef.current.drags.push({
      type: "html_drag_end",
      time: now(),
    });

    setDragDone((prev) => prev + 1);
  };

  const handleDragComplete = () => {
    if (dragDone < 5) {
      alert("Please drag at least 5 times inside the box");
      return;
    }

    saveCurrentSample({
      taskType: "drag",
      dragCount: dragDone,
    });

    setStep("complete");
  };

  const saveTraining = async () => {
    if (!user) return;

    if (mcqDone < 10 || sentenceDone < 10 || fileDone < 5 || dragDone < 5) {
      alert("Complete 10 MCQ, 10 sentences, 5 file tasks, and 5 drag actions.");
      return;
    }

    setSaving(true);

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
        setSaving(false);
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

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow p-6">
          <h1 className="text-3xl font-bold text-slate-900">Training Module</h1>
          <p className="text-slate-600 mt-2">
            First 10 MCQ, next 10 sentence typing, then 5 file choose, finally drag task.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <Card title="MCQ" value={`${mcqDone}/10`} />
          <Card title="Sentences" value={`${sentenceDone}/10`} />
          <Card title="Files" value={`${fileDone}/5`} />
          <Card title="Drags" value={`${dragDone}/5`} />
          <Card title="Quality" value={`${qualityScore}%`} />
        </div>

        {step === "mcq" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-4">
              Step 1: MCQ Task {mcqDone + 1}/10
            </h2>

            <div className="bg-slate-100 rounded-2xl p-5 mb-5 text-lg font-semibold">
              {mcqQuestions[mcqDone].q}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {mcqQuestions[mcqDone].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleMcqAnswer(opt)}
                  className="border rounded-2xl p-4 text-left font-semibold hover:bg-blue-50 hover:border-blue-500"
                >
                  {opt}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "sentence" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4">
              Step 2: Typing Task {sentenceDone + 1}/10
            </h2>

            <div className="bg-slate-100 rounded-2xl p-5 mb-5 text-lg">
              {sentences[sentenceDone]}
            </div>

            <textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full h-40 rounded-2xl border p-4 text-lg outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Type the above sentence here..."
            />

            <button
              onClick={handleSentenceNext}
              className="mt-5 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold"
            >
              Save Sentence & Next
            </button>
          </section>
        )}

        {step === "file" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">
              Step 3: File Choose Task {fileDone + 1}/5
            </h2>

            <p className="text-slate-600 mb-5">
              Choose any 5 files. Only metadata is stored, file content is not uploaded.
            </p>

            <input
              type="file"
              onChange={handleFileChoose}
              className="w-full rounded-2xl border p-5 bg-slate-50"
            />
          </section>
        )}

        {step === "drag" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-2xl font-bold text-orange-700 mb-4">
              Step 4: Drag Task
            </h2>

            <p className="text-slate-600 mb-5">
              Drag the blue box at least 5 times inside this area.
            </p>

            <div className="h-72 rounded-3xl border-2 border-dashed border-orange-400 bg-orange-50 flex items-center justify-center select-none">
              <div
                draggable
                onDragStart={handleHtmlDragStart}
                onDragEnd={handleHtmlDragEnd}
                className="bg-blue-600 text-white px-8 py-5 rounded-2xl font-bold shadow cursor-move"
              >
                Drag Me
              </div>
            </div>

            <p className="mt-4 font-bold text-slate-700">Drag Count: {dragDone}/5</p>

            <button
              onClick={handleDragComplete}
              className="mt-5 bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold"
            >
              Complete Drag Task
            </button>
          </section>
        )}

        {step === "complete" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4">
              Training Ready to Save
            </h2>

            <p className="text-slate-600 mb-5">
              All training activities completed. Save baseline to MongoDB.
            </p>

            <button
              onClick={saveTraining}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold disabled:opacity-60"
            >
              {saving ? "Saving..." : "Complete Training"}
            </button>
          </section>
        )}

        <div className="bg-white rounded-3xl shadow p-5">
          <p className="font-bold text-slate-700">Live Capture Summary</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
            <Small title="Samples" value={samples.length} />
            <Small title="Keys" value={eventsRef.current.keys.length} />
            <Small title="Mouse" value={eventsRef.current.mouse.length} />
            <Small title="Clicks" value={eventsRef.current.clicks.length} />
            <Small title="Drags" value={eventsRef.current.drags.length} />
            <Small title="Files" value={eventsRef.current.files.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  );
}

function Small({ title, value }) {
  return (
    <div className="bg-slate-100 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

export default Training;