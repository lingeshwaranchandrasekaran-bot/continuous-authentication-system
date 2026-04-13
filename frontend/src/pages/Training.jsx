import React, { useMemo, useRef, useState } from "react";

const trainingTasks = [
  { type: "mcq", question: "Which protocol is secure for web communication?", options: ["HTTP", "FTP", "HTTPS", "SMTP"] },
  { type: "mcq", question: "Which device connects networks?", options: ["Hub", "Switch", "Router", "Repeater"] },
  { type: "mcq", question: "Which database is used in this project?", options: ["MySQL", "MongoDB", "SQLite", "Oracle"] },
  { type: "mcq", question: "Which frontend framework is used?", options: ["React", "Django", "Flask", "Spring"] },
  { type: "mcq", question: "Which model is used for behavior comparison?", options: ["CNN", "Siamese", "GAN", "RNN"] },
  { type: "mcq", question: "Which attack uses fake emails?", options: ["Phishing", "DoS", "Spoofing", "Sniffing"] },
  { type: "mcq", question: "Which command shows IP in Linux?", options: ["pwd", "ls", "ip a", "dir"] },
  { type: "mcq", question: "Which feature measures key press duration?", options: ["Flight time", "Hold time", "Mouse speed", "Latency"] },
  { type: "mcq", question: "Which action is suspicious in exam?", options: ["Copy-paste", "Tab switch", "Blur", "All"] },
  { type: "mcq", question: "Which collection stores training data?", options: ["users", "training", "alerts", "exam"] },

  { type: "sentence", question: 'Type exactly: UserID-2026#Test@AI!' },
  { type: "sentence", question: 'Type exactly: ShiftSymbols ! @ # $ % ^ & * ( )' },
  { type: "sentence", question: 'Type exactly: Numbers12345 and MixedCASE typing.' },
  { type: "sentence", question: 'Type exactly: Punctuation .,;:\'" / ? < > [ ] { }' },
  { type: "sentence", question: 'Type exactly: Secure_Login-User01@Project2026' },
  { type: "sentence", question: 'Type exactly: Keyboard+Mouse_Behavior=Monitor#1' },
  { type: "sentence", question: 'Type exactly: QuickBrownFOX2026! slow? fast.' },
  { type: "sentence", question: 'Type exactly: Data_Sample(1) -> ready_to_save.' },
  { type: "sentence", question: 'Type exactly: AdminCreatesUser; UserCompletesTraining.' },
  { type: "sentence", question: 'Type exactly: Final-Test_Line#10 with 98765.' },

  { type: "file", question: "Upload any document file." },
  { type: "file", question: "Upload any image file." },
  { type: "file", question: "Upload any PDF or text file." },

  { type: "drag", question: "Drag the box from left to right." },
  { type: "drag", question: "Drag the box into the target area." }
];

function Training() {
  const [index, setIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [taskData, setTaskData] = useState([]);
  const [keys, setKeys] = useState([]);
  const [mouse, setMouse] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [holdTimes, setHoldTimes] = useState([]);
  const [flightTimes, setFlightTimes] = useState([]);
  const [mouseSpeeds, setMouseSpeeds] = useState([]);
  const [dragEvents, setDragEvents] = useState([]);
  const [fileEvents, setFileEvents] = useState([]);

  const keyDownMapRef = useRef({});
  const lastKeyTimeRef = useRef(null);
  const lastMouseRef = useRef(null);
  const dragStartRef = useRef(null);

  const currentTask = useMemo(() => trainingTasks[index], [index]);
  const userId = localStorage.getItem("userId") || "user1";

  const handleKeyDown = (e) => {
    const now = Date.now();
    setKeys((prev) => [...prev, { key: e.key, type: "down", time: now }]);
    keyDownMapRef.current[e.key] = now;

    if (lastKeyTimeRef.current !== null) {
      const flight = now - lastKeyTimeRef.current;
      if (flight > 0) setFlightTimes((prev) => [...prev, flight]);
    }

    lastKeyTimeRef.current = now;
  };

  const handleKeyUp = (e) => {
    const now = Date.now();
    setKeys((prev) => [...prev, { key: e.key, type: "up", time: now }]);

    const downTime = keyDownMapRef.current[e.key];
    if (downTime) {
      const hold = now - downTime;
      if (hold > 0) setHoldTimes((prev) => [...prev, hold]);
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

  const saveCurrentTask = () => {
    const record = {
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

    return [...taskData, record];
  };

  const handleNext = async () => {
    const updated = saveCurrentTask();
    setTaskData(updated);

    if (index < trainingTasks.length - 1) {
      setIndex((prev) => prev + 1);
      resetCurrentCapture();
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/training/save-baseline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          samples: updated
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Training save failed");
        return;
      }

      alert("Training completed and saved");
      window.location.href = "/user";
    } catch (error) {
      console.error(error);
      alert("Error saving training");
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-100 p-6"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-green-700 mb-4">Training Module</h1>
        <p className="mb-4 font-semibold">
          Task {index + 1} / {trainingTasks.length}
        </p>

        <div className="bg-gray-50 border rounded p-4 mb-4">
          <h2 className="font-bold mb-2">Task</h2>
          <p>{currentTask.question}</p>
        </div>

        {currentTask.type === "mcq" && (
          <div className="space-y-2 mb-4">
            {currentTask.options.map((opt, i) => (
              <button
                key={i}
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
            className="w-full border rounded p-3 h-32 mb-4"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder="Type here..."
          />
        )}

        {currentTask.type === "file" && (
          <input
            type="file"
            onChange={handleFileUpload}
            className="mb-4"
          />
        )}

        {currentTask.type === "drag" && (
          <div className="mb-4">
            <div
              draggable
              onDragStart={handleDragStart}
              className="w-24 h-24 bg-blue-500 text-white flex items-center justify-center rounded cursor-move mb-4"
            >
              Drag
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-full h-32 border-2 border-dashed border-gray-400 rounded flex items-center justify-center"
            >
              Drop Here
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 p-3 rounded">Keys: {keys.length}</div>
          <div className="bg-purple-50 p-3 rounded">Mouse: {mouse.length}</div>
          <div className="bg-orange-50 p-3 rounded">Clicks: {clicks.length}</div>
          <div className="bg-green-50 p-3 rounded">Drags: {dragEvents.length}</div>
        </div>

        <button
          onClick={handleNext}
          className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
        >
          {index === trainingTasks.length - 1 ? "Finish Training" : "Next"}
        </button>
      </div>
    </div>
  );
}

export default Training;