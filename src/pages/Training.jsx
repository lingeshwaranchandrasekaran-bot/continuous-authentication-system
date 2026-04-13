import React, { useState } from "react";

const sentence = "The quick brown fox jumps over the lazy dog";

function Training() {
  const [input, setInput] = useState("");
  const [keyData, setKeyData] = useState([]);
  const [mouseData, setMouseData] = useState([]);

  // ⌨️ Key press
  const handleKeyDown = (e) => {
    setKeyData((prev) => [
      ...prev,
      {
        key: e.key,
        type: "down",
        time: Date.now(),
      },
    ]);
  };

  // ⌨️ Key release
  const handleKeyUp = (e) => {
    setKeyData((prev) => [
      ...prev,
      {
        key: e.key,
        type: "up",
        time: Date.now(),
      },
    ]);
  };

  // 🖱️ Mouse move
  const handleMouseMove = (e) => {
    setMouseData((prev) => [
      ...prev,
      {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      },
    ]);
  };

  const handleSubmit = () => {
    const data = {
      text: input,
      keystrokes: keyData,
      mouse: mouseData,
    };

    console.log("Collected Data:", data);

    // Save locally (demo)
    localStorage.setItem("trainingData", JSON.stringify(data));

    alert("✅ Training Data Saved");
  };

  return (
    <div
      className="p-6"
      onMouseMove={handleMouseMove}
    >
      <h1 className="text-xl font-bold text-green-700 mb-4">
        🧠 Training Mode
      </h1>

      <p className="mb-4">{sentence}</p>

      <textarea
        className="w-full border p-3"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      />

      <button
        onClick={handleSubmit}
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
      >
        Save Training Data
      </button>
    </div>
  );
}

export default Training;