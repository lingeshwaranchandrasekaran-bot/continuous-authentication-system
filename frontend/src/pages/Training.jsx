import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const trainingTasks = [
  { type: "mcq", question: "Which protocol is secure for web communication?", options: ["HTTP", "FTP", "HTTPS", "SMTP"] },
  { type: "mcq", question: "Which device connects multiple networks?", options: ["Hub", "Switch", "Router", "Repeater"] },
  { type: "mcq", question: "Which database is used in this project?", options: ["MySQL", "MongoDB", "SQLite", "Oracle"] },
  { type: "mcq", question: "Which model is used for user behavior comparison?", options: ["CNN", "Siamese Neural Network", "GAN", "KNN"] },
  { type: "mcq", question: "Which framework is used in the frontend?", options: ["React", "Django", "Flask", "Laravel"] },
  { type: "mcq", question: "Which framework is used in the backend?", options: ["Spring", "Flask", "Vue", "Angular"] },
  { type: "mcq", question: "Which action is suspicious during exam?", options: ["Copy paste", "Tab switch", "Window blur", "All"] },
  { type: "mcq", question: "Which command shows IP in Linux?", options: ["pwd", "ls", "ip a", "mkdir"] },
  { type: "mcq", question: "Which feature measures key press duration?", options: ["Hold time", "Mouse speed", "Flight time", "Latency"] },
  { type: "mcq", question: "Which collection stores baseline data?", options: ["users", "training", "alerts", "login_logs"] },

  { type: "sentence", question: "Type exactly: UserID-2026#Test@AI!" },
  { type: "sentence", question: "Type exactly: ShiftSymbols ! @ # $ % ^ & * ( )" },
  { type: "sentence", question: "Type exactly: Numbers12345 and MixedCASE typing." },
  { type: "sentence", question: "Type exactly: Punctuation .,;:'\"/? < > [ ] { }" },
  { type: "sentence", question: "Type exactly: Secure_Login-User01@Project2026" },
  { type: "sentence", question: "Type exactly: Keyboard+Mouse_Behavior=Monitor#1" },
  { type: "sentence", question: "Type exactly: QuickBrownFOX2026! slow? fast." },
  { type: "sentence", question: "Type exactly: Data_Sample(1) -> ready_to_save." },
  { type: "sentence", question: "Type exactly: AdminCreatesUser; UserCompletesTraining." },
  { type: "sentence", question: "Type exactly: Final-Test_Line#10 with 98765." },

  { type: "file", question: "Upload any document file." },
  { type: "file", question: "Upload any image file." },
  { type: "file", question: "Upload any PDF or text file." },

  { type: "drag", question: "Drag the box from left to right." },
  { type: "drag", question: "Drag the box into the target area." }
];

function Training() {
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [taskData, setTaskData] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [keys, setKeys] = useState([]);
  const [mouse, setMouse] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [holdTimes, setHoldTimes] = useState([]);
  const [flightTimes, setFlightTimes] = useState([]);
  const [mouseSpeeds, setMouseSpeeds] = useState([]);
  const [dragEvents, setDragEvents] = useState([]);
  const [fileEvents, setFileEvents] = useState([]);

  const [notice, setNotice] = useState("");

  const keyDownMapRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const dragStartRef = useRef(null);

  const currentTask = useMemo(() => trainingTasks[index], [index]);
  const userId = localStorage.getItem("userId") || "user1";

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2200);
  };

  const handleKeyDown = (e) => {
    const now = Date.now();

    setKeys((prev) => [
      ...prev,
      { key: e.key, type: "down", time: now }
    ]);

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

    setKeys((prev) => [
      ...prev,
      { key: e.key, type: "up", time: now }
    ]);

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

  const handleClick = (e) => {
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileEvents((prev) => [
      ...prev,
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        time: Date.now()
      }
    ]);

    showNotice(`File captured: ${file.name}`);
  };

  const handleDragStart = () => {
    dragStartRef.current = Date.now();
  };

  const handleDrop = () => {
    const end = Date.now();
    const start = dragStartRef.current || end;

    setDragEvents((prev) => [
      ...prev,
      {
        startTime: start,
        endTime: end,
        duration: end - start
      }
    ]);

    showNotice("Drag task captured");
  };

  const resetCurrentCapture = () => {
    setTextAnswer("");
    setSelectedOption("");
    setKeys([]);
    setMouse([]);
    setClicks([]);
    setHoldTimes([]);
    setFlightTimes([]);
    setMouseSpeeds([]);
    setDragEvents([]);
    setFileEvents([]);

    keyDownMapRef.current = {};
    lastKeyTimeRef.current = null;
    lastMouseRef.current = null;
    dragStartRef.current = null;
  };

  const buildCurrentTaskRecord = () => {
    return {
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
      dragEvents,
      fileEvents,
      createdAt: Date.now()
    };
  };

  const handleNext = async () => {
    const currentRecord = buildCurrentTaskRecord();
    const updatedData = [...taskData, currentRecord];
    setTaskData(updatedData);

    if (index < trainingTasks.length - 1) {
      setIndex((prev) => prev + 1);
      resetCurrentCapture();
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("http://localhost:5000/api/training/save-baseline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          samples: updatedData
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showNotice(data.error || "Training save failed");
        return;
      }

      localStorage.setItem("hasBaseline", "true");
      showNotice("Training completed successfully");

      setTimeout(() => {
        navigate("/user");
      }, 1200);
    } catch (error) {
      console.error(error);
      showNotice("Error saving training");
    } finally {
      setSubmitting(false);
    }
  };

  const taskProgress = `${index + 1} / ${trainingTasks.length}`;

  return (
    <div
      className="min-h-screen bg-gray-100 p-6"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      {notice && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg">
          {notice}
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow border p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-green-700">Training Module</h1>
            <p className="text-gray-600 mt-1">
              Complete all tasks to create your typing and mouse behavior baseline.
            </p>
          </div>

          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
            Task {taskProgress}
          </div>
        </div>

        <div className="bg-gray-50 border rounded-xl p-5 mb-6">
          <h2 className="text-xl font-bold mb-2">Current Task</h2>
          <p className="text-gray-800">{currentTask.question}</p>
        </div>

        {currentTask.type === "mcq" && (
          <div className="space-y-3 mb-6">
            {currentTask.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedOption(opt)}
                className={`block w-full text-left border rounded-xl p-4 transition ${
                  selectedOption === opt
                    ? "bg-green-100 border-green-500"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {currentTask.type === "sentence" && (
          <textarea
            className="w-full border rounded-xl p-4 h-36 mb-6 outline-none focus:ring-2 focus:ring-green-500"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder="Type here exactly as shown..."
          />
        )}

        {currentTask.type === "file" && (
          <div className="mb-6">
            <input
              type="file"
              onChange={handleFileUpload}
              className="w-full border rounded-xl p-4 bg-white"
            />
          </div>
        )}

        {currentTask.type === "drag" && (
          <div className="mb-6">
            <div
              draggable
              onDragStart={handleDragStart}
              className="w-28 h-28 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-move mb-4 select-none"
            >
              Drag Me
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-full h-36 border-2 border-dashed border-gray-400 rounded-xl flex items-center justify-center text-gray-600"
            >
              Drop Here
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="bg-blue-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Keys</p>
            <p className="font-bold">{keys.length}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Mouse</p>
            <p className="font-bold">{mouse.length}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Clicks</p>
            <p className="font-bold">{clicks.length}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Hold</p>
            <p className="font-bold">{holdTimes.length}</p>
          </div>
          <div className="bg-pink-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Flight</p>
            <p className="font-bold">{flightTimes.length}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Mouse Speed</p>
            <p className="font-bold">{mouseSpeeds.length}</p>
          </div>
          <div className="bg-cyan-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Files</p>
            <p className="font-bold">{fileEvents.length}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-xl text-center">
            <p className="text-xs text-gray-500">Drags</p>
            <p className="font-bold">{dragEvents.length}</p>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={handleNext}
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 disabled:opacity-60"
          >
            {index === trainingTasks.length - 1
              ? submitting
                ? "Saving..."
                : "Finish Training"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Training;