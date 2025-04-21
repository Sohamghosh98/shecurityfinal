import React, { useState, useEffect, useRef } from "react";

export default function HelpPage() {
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem("emergencyPhone") || "");
  const [email, setEmail] = useState(localStorage.getItem("emergencyEmail") || "");
  const [locationUrl, setLocationUrl] = useState("");
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const chunks = useRef([]);
  const recognitionRef = useRef(null); // 🔊 Voice recognition reference
  const [micOn, setMicOn] = useState(false); // 🎤 Mic toggle state


  useEffect(() => {
    localStorage.setItem("emergencyPhone", phoneNumber);
  }, [phoneNumber]);

  useEffect(() => {
    localStorage.setItem("emergencyEmail", email);
  }, [email]);

  useEffect(() => {
    preventScreenshot();
  }, []);

  // 🔊 Start Voice Recognition
  const startVoiceRecognition = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }
  
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.lang = "en-US";
  
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toUpperCase();
      console.log("Detected:", transcript);
  
      const triggerPhrases = [
        "HELP", "I NEED HELP", "HELP ME", "EMERGENCY",
        "SHECURITY HELP", "TELL SHECURITY I NEED HELP",
        "SEND HELP", "CALL FOR HELP", "GET HELP NOW",
      ];
  
      if (triggerPhrases.some(phrase => transcript.includes(phrase))) {
        handleHelpClick();
      }
    };
  
    recognitionRef.current.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === "network") {
        alert("Speech recognition failed due to a network error. Please check your internet connection.");
      }
    };
  
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
    }
  };
  
  
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      console.log("Voice recognition stopped");
    }
  };
  

  // 🔒 Prevent screenshots
  const preventScreenshot = () => {
    document.addEventListener("keydown", (event) => {
      if (event.key === "PrintScreen" && downloadReady) {
        alert("Screenshots are not allowed!");
        event.preventDefault();
      }
    });
  };

  const handleHelpClick = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          setDownloadReady(true);
          chunks.current = [];
        };

        mediaRecorder.start();
        setRecording(true);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            setLocationUrl(googleMapsUrl);

            const emergencyMessage = `EMERGENCY! I need help. My location: ${googleMapsUrl}`;
            setMessage(emergencyMessage);

            alert("Location fetched! Opening nearby police stations...");
            window.open(`https://www.google.com/maps/search/police+station/@${latitude},${longitude},14z`, "_blank");

            sendSMS(emergencyMessage);
            sendEmail(emergencyMessage);
            makeCall();

            fetch("http://localhost:5000/save-location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude }),
            })
              .then((res) => res.json())
              .then((data) => console.log("Location saved:", data))
              .catch((error) => console.error("Error saving location:", error));
          },
          (error) => {
            console.error("Error fetching location:", error);
            alert("Could not fetch location. Please enable GPS.");
          }
        );
      })
      .catch((error) => {
        console.error("Error accessing camera and microphone:", error);
        alert("Camera and microphone access denied. Please enable them.");
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setRecording(false);
    }
  };

  const downloadVideo = () => {
    if (!videoUrl) return;

    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "emergency-video.webm";

    // 🔒 Disable right-click on the download link
    a.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      alert("Right-click is disabled for security reasons!");
    });
     
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadReady(false);
  };

  const sendSMS = async (message) => {
    if (!phoneNumber) {
      alert("Please enter a valid phone number.");
      return;
    }
  
    try {
      const response = await fetch("http://localhost:5000/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, message }),
      });
  
      const data = await response.json();
      if (data.success) {
        alert("Emergency SMS sent successfully!");
      } else {
        alert("Failed to send SMS: " + data.error);
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      alert("Error sending SMS. Check console for details.");
    }
  };
  

  const sendEmail = (message) => {
    if (!email) {
      alert("Please enter a valid email.");
      return;
    }
    window.open(`mailto:${email}?subject=Emergency%20Help&body=${encodeURIComponent(message)}`, "_self");
  };

  const makeCall = () => {
    if (!phoneNumber) {
      alert("Please enter a valid phone number.");
      return;
    }
    window.open(`tel:${phoneNumber}`, "_self");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-red-600 text-white flex justify-between items-center p-4">
        <h1 className="font-bold text-xl">SHEcurity</h1>
      </nav>

      <button
  onClick={() => {
    if (!micOn) {
      startVoiceRecognition();
    } else {
      stopVoiceRecognition();
    }
    setMicOn(!micOn);
  }}
  className={`${
    micOn ? "bg-green-600" : "bg-gray-500"
  } text-white p-2 rounded-lg mb-4 w-64`}
>
  {micOn ? "🎤 Mic On (Listening)" : "🎙️ Turn On Mic"}
</button>


      <div className="flex flex-col items-center justify-center flex-grow bg-white">
        <button
          onClick={handleHelpClick}
          className="bg-red-600 text-white text-2xl font-bold rounded-full w-40 h-40 flex items-center justify-center shadow-lg mb-8"
        >
          {recording ? "Recording..." : "HELP"}
        </button>

        {recording && (
          <button onClick={stopRecording} className="bg-gray-600 text-white p-2 rounded-lg mb-2 w-64">
            Stop Recording
          </button>
        )}

        <video ref={videoRef} autoPlay muted className="w-64 h-40 border border-gray-400"></video>

        {downloadReady && (
          <button
            onClick={downloadVideo}
            onContextMenu={(e) => e.preventDefault()}
            className="bg-green-600 text-white p-2 rounded-lg mt-4 w-64"
          >
            Download Video
          </button>
        )}

        <button onClick={makeCall} className="bg-red-500 text-white p-2 rounded-lg mt-4 w-64">
          Call Now
        </button>

        <div className="w-80 flex flex-col items-center">
          <input
            type="tel"
            placeholder="Enter emergency phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="border border-gray-400 p-2 rounded w-full mb-2"
          />
          <input
            type="email"
            placeholder="Enter emergency email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-400 p-2 rounded w-full mb-4"
          />
        </div>
      </div>
    </div>
  );
}
