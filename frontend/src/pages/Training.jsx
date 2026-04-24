import React, { useMemo, useRef, useState, useEffect } from "react";
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

  { type: "drag", question: "Drag the box into the target area." },
  { type: "drag", question: "Drag the box from left side to the bottom-right target." }
];

function Training() {
  const navigate = useNavigate();

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [taskData, setTaskData] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [keys, setKeys] = useState([]);
  const [mouse, setMouse] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [scrolls, setScrolls] = useState([]);
  const [holdTimes, setHoldTimes] = useState([]);
  const [flightTimes, setFlightTimes] = useState([]);
  const [mouseSpeeds, setMouseSpeeds] = useState([]);
  const [dragEvents, setDragEvents] = useState([]);
  const [fileEvents, setFileEvents] = useState([]);

  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [qualityScore, setQualityScore] = useState(0);

  const [dragBoxPos, setDragBoxPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragDone, setDragDone] = useState(false);

  const keyDownMapRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const dragStartRef = useRef(null);
  const dragContainerRef = useRef(null);

  const currentTask = useMemo(() => trainingTasks[index], [index]);
  const userId = localStorage.getItem("userId") || "user1";
  const role = localStorage.getItem("role") || "user";

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2200);
  };

  const calculateQualityScore = (samples) => {
    let score = 0;

    const totalKeys = samples.reduce((sum, s) => sum + (s.keys?.length || 0), 0);
    const totalMouse = samples.reduce((sum, s) => sum + (s.mouse?.length || 0), 0);
    const totalClicks = samples.reduce((sum, s) => sum + (s.clicks?.length || 0), 0);
    const totalHold = samples.reduce((sum, s) => sum + (s.holdTimes?.length || 0), 0);
    const totalFlight = samples.reduce((sum, s) => sum + (s.flightTimes?.length || 0), 0);
    const totalFiles = samples.reduce((sum, s) => sum + (s.fileEvents?.length || 0), 0);
    const totalDrags = samples.reduce((sum, s) => sum + (s.dragEvents?.length || 0), 0);
    const totalScrolls = samples.reduce((sum, s) => sum + (s.scrolls?.length || 0), 0);

    if (samples.length >= 20) score += 20;
    if (totalKeys >= 80) score += 20;
    if (totalMouse >= 80) score += 15;
    if (totalClicks >= 8) score += 10;
    if (totalHold >= 30) score += 15;
    if (totalFlight >= 30) score += 10;
    if (totalFiles >= 3) score += 4;
    if (totalDrags >= 2) score += 4;
    if (totalScrolls >= 2) score += 2;

    return Math.min(score, 100);
  };

  const saveBehaviorSession = async (events, page = "training") => {
    try {
      await fetch("http://localhost:5000/api/behavior/session-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          role,
          page,
          events
        })
      });
    } catch (error) {
      console.error("Training behavior session save failed:", error);
    }
  };

  useEffect(() => {
    const moveHandler = (e) => handleMouseDragMove(e);
    const upHandler = () => handleMouseDragEnd();

    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("mouseup", upHandler);

    return () => {
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseup", upHandler);
    };
  }, [isDragging, dragBoxPos]);

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
      {
        type: "click",
        x: e.clientX,
        y: e.clientY,
        button: e.button,
        time: Date.now()
      }
    ]);
  };

  const handleWheel = (e) => {
    const data = {
      type: "scroll",
      deltaY: e.deltaY,
      time: Date.now()
    };

    setScrolls((prev) => [...prev, data]);
    setMouse((prev) => [...prev, data]);
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

    setErrorMessage("");
    showNotice(`File captured: ${file.name}`);
  };

  const handleMouseDragStart = () => {
    dragStartRef.current = Date.now();
    setIsDragging(true);
    setErrorMessage("");
  };

  const handleMouseDragMove = (e) => {
    if (!isDragging || !dragContainerRef.current) return;

    const rect = dragContainerRef.current.getBoundingClientRect();

    let newX = e.clientX - rect.left - 48;
    let newY = e.clientY - rect.top - 48;

    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX > rect.width - 96) newX = rect.width - 96;
    if (newY > rect.height - 96) newY = rect.height - 96;

    setDragBoxPos({ x: newX, y: newY });
  };

  const handleMouseDragEnd = () => {
    if (!isDragging) return;

    const end = Date.now();
    const start = dragStartRef.current || end;

    const reachedTarget = dragBoxPos.x > 260 && dragBoxPos.y > 130;

    if (reachedTarget) {
      setDragEvents((prev) => [
        ...prev,
        {
          type: "drag",
          startTime: start,
          endTime: end,
          duration: end - start,
          finalX: dragBoxPos.x,
          finalY: dragBoxPos.y,
          success: true
        }
      ]);

      setDragDone(true);
      showNotice("Drag task completed");
    } else {
      showNotice("Drag not reached target. Try again.");
    }

    setIsDragging(false);
  };

  const resetCurrentCapture = () => {
    setTextAnswer("");
    setSelectedOption("");
    setKeys([]);
    setMouse([]);
    setClicks([]);
    setScrolls([]);
    setHoldTimes([]);
    setFlightTimes([]);
    setMouseSpeeds([]);
    setDragEvents([]);
    setFileEvents([]);
    setErrorMessage("");

    setDragBoxPos({ x: 0, y: 0 });
    setIsDragging(false);
    setDragDone(false);

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
      scrolls,
      holdTimes,
      flightTimes,
      mouseSpeeds,
      dragEvents,
      fileEvents,
      createdAt: Date.now()
    };
  };

  const isTaskValid = () => {
    if (currentTask.type === "mcq") {
      if (!selectedOption) {
        setErrorMessage("Select one option before moving to the next task.");
        return false;
      }
      return true;
    }

    if (currentTask.type === "sentence") {
      if (!textAnswer.trim()) {
        setErrorMessage("Type the sentence before moving to the next task.");
        return false;
      }

      if (keys.length < 6) {
        setErrorMessage("Typing data is too low. Please type normally.");
        return false;
      }

      return true;
    }

    if (currentTask.type === "file") {
      if (fileEvents.length === 0) {
        setErrorMessage("Upload a file before moving to the next task.");
        return false;
      }
      return true;
    }

    if (currentTask.type === "drag") {
      if (!dragDone || dragEvents.length === 0) {
        setErrorMessage("Complete the drag task properly before moving to the next task.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleRedoTask = () => {
    resetCurrentCapture();
    showNotice("Current task cleared. Please do it again.");
  };

  const handleStartTraining = () => {
    setStarted(true);
    showNotice("Training started");
  };

  const handleNext = async () => {
    if (!isTaskValid()) return;

    const currentRecord = buildCurrentTaskRecord();
    const updatedData = [...taskData, currentRecord];
    const currentQuality = calculateQualityScore(updatedData);

    setTaskData(updatedData);
    setQualityScore(currentQuality);

    await saveBehaviorSession(currentRecord, "training_task");

    if (index < trainingTasks.length - 1) {
      setIndex((prev) => prev + 1);
      resetCurrentCapture();
      return;
    }

    if (currentQuality < 60) {
      setErrorMessage(
        `Training quality low (${currentQuality}%). Please redo training and type/move naturally.`
      );
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
          samples: updatedData,
          qualityScore: currentQuality
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Training save failed");
        return;
      }

      localStorage.setItem("hasBaseline", "true");
      showNotice(`Training completed successfully. Quality: ${currentQuality}%`);

      setTimeout(() => {
        navigate("/user");
      }, 1200);
    } catch (error) {
      console.error(error);
      setErrorMessage("Error saving training");
    } finally {
      setSubmitting(false);
    }
  };

  const taskProgress = `${index + 1} / ${trainingTasks.length}`;
  const progressPercent = Math.round(((index + 1) / trainingTasks.length) * 100);

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow border p-8">
          <h1 className="text-3xl font-bold text-green-700 mb-4">
            Training Instructions
          </h1>

          <p className="text-gray-700 mb-6">
            This training module collects your normal typing and mouse behavior.
            The system will use this data as your baseline during exam verification.
          </p>

          <div className="bg-gray-50 border rounded-xl p-5 mb-6">
            <h2 className="text-xl font-bold mb-3">Please follow these rules</h2>
            <ul className="space-y-3 text-gray-700">
              <li>• Use the same laptop and keyboard that you will use during the exam.</li>
              <li>• Type naturally. Do not type too fast or too slow.</li>
              <li>• Use the mouse normally while answering the tasks.</li>
              <li>• Do not skip file or drag tasks.</li>
              <li>• Try to stay focused and complete the tasks without interruption.</li>
            </ul>
          </div>

          <div className="bg-green-50 border rounded-xl p-5 mb-6">
            <h3 className="font-bold mb-2">Training Includes</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• 10 MCQ tasks</li>
              <li>• 10 sentence typing tasks</li>
              <li>• 3 file upload tasks</li>
              <li>• 2 drag interaction tasks</li>
              <li>• Quality score validation</li>
            </ul>
          </div>

          <button
            onClick={handleStartTraining}
            className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700"
          >
            Start Training
          </button>
        </div>
      </div>
    );
  }

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
              Complete all tasks carefully to create a stable behavioral baseline.
            </p>
          </div>

          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
            Task {taskProgress}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="bg-blue-50 border rounded-xl p-4">
            <p className="text-sm text-gray-600">Current Quality Score</p>
            <h2 className="text-2xl font-bold text-blue-700">{qualityScore}%</h2>
          </div>
          <div className="bg-purple-50 border rounded-xl p-4">
            <p className="text-sm text-gray-600">Minimum Required</p>
            <h2 className="text-2xl font-bold text-purple-700">60%</h2>
          </div>
        </div>

        <div className="bg-gray-50 border rounded-xl p-5 mb-6">
          <h2 className="text-xl font-bold mb-2">Current Task</h2>
          <p className="text-gray-800">{currentTask.question}</p>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-100 text-red-700 border border-red-200 rounded-xl p-4">
            {errorMessage}
          </div>
        )}

        {currentTask.type === "mcq" && (
          <div className="space-y-3 mb-6">
            {currentTask.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelectedOption(opt);
                  setErrorMessage("");
                }}
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
            onChange={(e) => {
              setTextAnswer(e.target.value);
              setErrorMessage("");
            }}
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
              ref={dragContainerRef}
              className="relative w-full h-80 border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 overflow-hidden"
            >
              <div className="absolute right-6 bottom-6 w-36 h-24 bg-green-100 border-2 border-green-500 rounded-xl flex items-center justify-center text-green-700 font-semibold">
                Drop Zone
              </div>

              <div
                onMouseDown={handleMouseDragStart}
                className={`absolute w-24 h-24 rounded-xl flex items-center justify-center text-white font-bold cursor-grab select-none shadow-lg ${
                  dragDone ? "bg-green-600" : "bg-blue-600"
                }`}
                style={{
                  left: `${dragBoxPos.x}px`,
                  top: `${dragBoxPos.y}px`
                }}
              >
                {dragDone ? "Done" : "Drag"}
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-3">
              Drag the blue box into the green drop zone.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-6">
          <Metric title="Keys" value={keys.length} />
          <Metric title="Mouse" value={mouse.length} />
          <Metric title="Clicks" value={clicks.length} />
          <Metric title="Scrolls" value={scrolls.length} />
          <Metric title="Hold" value={holdTimes.length} />
          <Metric title="Flight" value={flightTimes.length} />
          <Metric title="Mouse Speed" value={mouseSpeeds.length} />
          <Metric title="Files" value={fileEvents.length} />
          <Metric title="Drags" value={dragEvents.length} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={handleRedoTask}
            className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600"
          >
            Redo Task
          </button>

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

function Metric({ title, value }) {
  return (
    <div className="bg-gray-50 p-3 rounded-xl text-center border">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

export default Training;