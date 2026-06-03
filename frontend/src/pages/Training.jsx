import React, { useEffect, useRef, useState } from "react";

const API = "https://continuous-authentication-system.onrender.com";

const mcqQuestions = [
  { q: "Which database is used in this project?", options: ["MongoDB", "MySQL", "Oracle", "SQLite"] },
  { q: "Which model compares user behavior?", options: ["Siamese Neural Network", "KNN", "Naive Bayes", "Decision Tree"] },
  { q: "Hold time means?", options: ["Key press duration", "Mouse speed", "Tab switch", "Scroll time"] },
  { q: "Flight time means?", options: ["Time between two key presses", "File upload time", "Mouse click", "Page load"] },
  { q: "Which data is used for behavior biometrics?", options: ["Keystroke + Mouse", "Only password", "Only OTP", "Only email"] },
  { q: "Suspicious exam action?", options: ["Copy paste", "Tab switch", "Window blur", "All of the above"] },
  { q: "Backend framework used?", options: ["Flask", "Django", "Spring", "Laravel"] },
  { q: "Frontend framework used?", options: ["React", "Angular", "Vue", "Next.js"] },
  { q: "Training data is stored in?", options: ["MongoDB", "Excel", "PDF", "Notepad"] },
  { q: "Continuous authentication checks user?", options: ["After login also", "Only before login", "Only signup", "Never"] },
];

const sentences = [
  "The User typed Password@2026 and entered 12345 before clicking Submit.",

  "My Secure Login ID is TestUser01 and the code is #A1B2C3.",

  "Admin entered Report_2026.pdf and verified 98% accuracy successfully.",

  "The quick brown fox jumps over 13 lazy dogs near River#5 every day.",

  "User123 typed HelloWorld! and updated the score to 99%.",

  "Continuous Authentication checks typing speed, hold time, and flight time.",

  "Please enter ExamCode@2026 and confirm using button number 7.",

  "System Alert! Risk score reached 85% after multiple suspicious actions.",

  "Upload File_01.docx and File_02.pdf before pressing Save & Continue.",

  "Keyboard behavior includes A-Z, a-z, 0-9, and symbols ! @ # $ % ^ & * ( ).",
];

const defaultEvents = () => ({
  keyEvents: [],
  mouseEvents: [],
  clickEvents: [],
  scrollEvents: [],
  dragEvents: [],
  fileEvents: [],
  focusEvents: [],
  pasteEvents: [],
  holdTimes: [],
  flightTimes: [],
  mouseSpeeds: [],
});

function Training() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("mcq");

  const [mcqDone, setMcqDone] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");

  const [sentenceDone, setSentenceDone] = useState(0);
  const [typedText, setTypedText] = useState("");

  const [fileDone, setFileDone] = useState(0);
  const [dragDone, setDragDone] = useState(0);
  const [boxDropped, setBoxDropped] = useState(false);

  const [samples, setSamples] = useState([]);
  const [saving, setSaving] = useState(false);

  const eventsRef = useRef(defaultEvents());
  const lastKeyDownRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const lastMouseSaveRef = useRef(0);
  const dragStartRef = useRef(null);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));

    if (!savedUser) {
      alert("Please login first");
      window.location.href = "/";
      return;
    }

    setUser(savedUser);

    const onVisibility = () => {
      if (document.hidden) {
        eventsRef.current.focusEvents.push({ type: "tab_switch", time: Date.now() });
      }
    };

    const onBlur = () => {
      eventsRef.current.focusEvents.push({ type: "window_blur", time: Date.now() });
    };

    const onPaste = (e) => {
      e.preventDefault();
      eventsRef.current.pasteEvents.push({ type: "paste_blocked", time: Date.now() });
      alert("Copy paste not allowed. Type manually.");
    };

    const onKeyDown = (e) => {
      const t = Date.now();

      eventsRef.current.keyEvents.push({
        type: "keydown",
        code: e.code,
        keyLength: e.key.length,
        time: t,
      });

      if (lastKeyTimeRef.current) {
        const flight = t - lastKeyTimeRef.current;
        if (flight > 0 && flight < 3000) eventsRef.current.flightTimes.push(flight);
      }

      lastKeyDownRef.current[e.code] = t;
      lastKeyTimeRef.current = t;
    };

    const onKeyUp = (e) => {
      const t = Date.now();

      eventsRef.current.keyEvents.push({
        type: "keyup",
        code: e.code,
        keyLength: e.key.length,
        time: t,
      });

      const downTime = lastKeyDownRef.current[e.code];
      if (downTime) {
        const hold = t - downTime;
        if (hold > 0 && hold < 3000) eventsRef.current.holdTimes.push(hold);
      }
    };

    const onMouseMove = (e) => {
      const t = Date.now();
      if (t - lastMouseSaveRef.current < 70) return;
      lastMouseSaveRef.current = t;

      eventsRef.current.mouseEvents.push({
        type: "mousemove",
        x: e.clientX,
        y: e.clientY,
        time: t,
      });

      if (lastMouseRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        const dt = t - lastMouseRef.current.time;
        if (dt > 0) eventsRef.current.mouseSpeeds.push(Math.sqrt(dx * dx + dy * dy) / dt);
      }

      lastMouseRef.current = { x: e.clientX, y: e.clientY, time: t };
    };

    const onClick = (e) => {
      eventsRef.current.clickEvents.push({
        type: "click",
        x: e.clientX,
        y: e.clientY,
        button: e.button,
        time: Date.now(),
      });
    };

    const onWheel = (e) => {
      eventsRef.current.scrollEvents.push({
        type: "scroll",
        deltaY: e.deltaY,
        time: Date.now(),
      });
    };

    const onMouseDown = (e) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const onMouseUp = (e) => {
      if (!dragStartRef.current) return;

      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);

      if (dx > 15 || dy > 15) {
        eventsRef.current.dragEvents.push({
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
    window.addEventListener("blur", onBlur);
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel);
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
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const std = (arr) => {
    if (!arr.length) return 0;
    const m = mean(arr);
    return Math.sqrt(mean(arr.map((x) => Math.pow(x - m, 2))));
  };

  const buildFeatureVector = () => {
    const e = eventsRef.current;
    return [
      mean(e.holdTimes),
      std(e.holdTimes),
      mean(e.flightTimes),
      std(e.flightTimes),
      mean(e.mouseSpeeds),
      std(e.mouseSpeeds),
      e.keyEvents.length,
      e.clickEvents.length,
      e.mouseEvents.length,
      e.scrollEvents.length,
      e.dragEvents.length,
      e.fileEvents.length,
      e.pasteEvents.length,
      e.focusEvents.length,
    ];
  };

  const buildFeatureObject = () => {
    const e = eventsRef.current;
    return {
      mean_hold: mean(e.holdTimes),
      std_hold: std(e.holdTimes),
      mean_flight: mean(e.flightTimes),
      std_flight: std(e.flightTimes),
      mean_mouse_speed: mean(e.mouseSpeeds),
      std_mouse_speed: std(e.mouseSpeeds),
      total_keys: e.keyEvents.length,
      total_clicks: e.clickEvents.length,
      total_mouse_moves: e.mouseEvents.length,
      total_scrolls: e.scrollEvents.length,
      total_drags: e.dragEvents.length,
      total_files: e.fileEvents.length,
      total_paste: e.pasteEvents.length,
      total_focus_events: e.focusEvents.length,
    };
  };

  const resetCapture = () => {
    eventsRef.current = defaultEvents();
    lastKeyDownRef.current = {};
    lastKeyTimeRef.current = null;
    lastMouseRef.current = null;
    dragStartRef.current = null;
  };

  const saveSample = (extra = {}) => {
    const sample = {
      ...extra,
      featureVector: buildFeatureVector(),
      features: buildFeatureObject(),
      rawEvents: eventsRef.current,
      createdAt: new Date().toISOString(),
    };

    setSamples((prev) => [...prev, sample]);
    resetCapture();
  };

  const handleMcqNext = () => {
    if (!selectedOption) {
      alert("Please select one option");
      return;
    }

    const question = mcqQuestions[mcqDone];

    saveSample({
      taskType: "mcq",
      questionNo: mcqDone + 1,
      question: question.q,
      selectedAnswer: selectedOption,
    });

    setSelectedOption("");

    const next = mcqDone + 1;
    setMcqDone(next);

    if (next >= 10) setStep("sentence");
  };

  const handleSentenceNext = () => {
    const expected = sentences[sentenceDone];

    if (typedText.trim() !== expected.trim()) {
      alert("Sentence must be typed exactly. Copy paste not allowed.");
      return;
    }

    saveSample({
      taskType: "sentence",
      sentenceNo: sentenceDone + 1,
      expectedTextLength: expected.length,
      typedLength: typedText.length,
    });

    setTypedText("");

    const next = sentenceDone + 1;
    setSentenceDone(next);

    if (next >= 10) setStep("file");
  };

  const handleFileChoose = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    eventsRef.current.fileEvents.push({
      type: "file_select",
      fileNo: fileDone + 1,
      fileNameLength: file.name.length,
      fileSize: file.size,
      fileType: file.type,
      time: Date.now(),
    });

    saveSample({
      taskType: "file",
      fileNo: fileDone + 1,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const next = fileDone + 1;
    setFileDone(next);

    if (next >= 5) setStep("drag");

    e.target.value = "";
  };

  const handleHtmlDragStart = () => {
    eventsRef.current.dragEvents.push({ type: "html_drag_start", time: Date.now() });
  };

  const allowDrop = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();

    eventsRef.current.dragEvents.push({
      type: "box_dropped_inside_target",
      time: Date.now(),
    });

    setBoxDropped(true);
    setDragDone((prev) => Math.min(prev + 1, 5));
  };

  const handleDragTaskDone = () => {
    if (dragDone < 5) {
      alert("Please drag and drop the box inside target area at least 5 times.");
      return;
    }

    saveSample({
      taskType: "drag",
      dragCount: dragDone,
    });

    setStep("complete");
  };

  const qualityScore = Math.min(
    mcqDone * 2 + sentenceDone * 4 + fileDone * 4 + dragDone * 4,
    100
  );

  const saveTraining = async () => {
    if (!user) return;

    if (mcqDone < 10 || sentenceDone < 10 || fileDone < 5 || dragDone < 5) {
      alert("Complete full training first.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API}/api/training/save-baseline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.username,
          samples,
          totalSamples: samples.length,
          qualityScore,
          trainingFlow: {
            mcq: mcqDone,
            sentences: sentenceDone,
            files: fileDone,
            drags: dragDone,
          },
          savedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Training save failed");
        setSaving(false);
        return;
      }

      localStorage.setItem("hasBaseline", "true");
      const oldUser = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...oldUser, hasBaseline: true }));

      alert("Training completed successfully ✅");
      window.location.href = "/user";
    } catch (error) {
      alert("Backend connection failed");
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow p-6">
          <h1 className="text-3xl font-bold text-slate-900">Training Mode</h1>
          <p className="text-slate-600 mt-2">
            Complete all tasks naturally to create your secure behavior baseline.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  onClick={() => setSelectedOption(opt)}
                  className={`border rounded-2xl p-4 text-left font-semibold ${
                    selectedOption === opt
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-blue-50 hover:border-blue-500"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              onClick={handleMcqNext}
              className="mt-5 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold"
            >
              Next MCQ
            </button>
          </section>
        )}

        {step === "sentence" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4">
              Step 2: Exact Typing Task {sentenceDone + 1}/10
            </h2>

            <div className="bg-slate-100 rounded-2xl p-5 mb-5 text-lg">
              {sentences[sentenceDone]}
            </div>

            <textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                alert("Copy paste not allowed. Type manually.");
              }}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              className="w-full h-40 rounded-2xl border p-4 text-lg outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Type the above sentence exactly..."
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
              Step 3: File Upload Task {fileDone + 1}/5
            </h2>

            <p className="text-slate-600 mb-5">
              Select any 5 files. Only metadata is used for behavior training.
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
              Step 4: Drag and Drop Task
            </h2>

            <p className="text-slate-600 mb-5">
              Drag the blue box and drop it inside the target area 5 times.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-72 rounded-3xl border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center select-none">
                <div
                  draggable
                  onDragStart={handleHtmlDragStart}
                  className="bg-blue-600 text-white px-8 py-5 rounded-2xl font-bold shadow cursor-move"
                >
                  Drag Me
                </div>
              </div>

              <div
                onDragOver={allowDrop}
                onDrop={handleDrop}
                className={`h-72 rounded-3xl border-2 border-dashed flex items-center justify-center ${
                  boxDropped
                    ? "bg-green-100 border-green-500 text-green-700"
                    : "bg-orange-50 border-orange-400 text-orange-700"
                }`}
              >
                <h3 className="text-xl font-bold">
                  {boxDropped ? "Dropped Successfully ✅" : "Drop Here"}
                </h3>
              </div>
            </div>

            <p className="mt-4 font-bold text-slate-700">Drop Count: {dragDone}/5</p>

            <button
              onClick={handleDragTaskDone}
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
              All training tasks completed. Save baseline to MongoDB Atlas.
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
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  );
}

export default Training;