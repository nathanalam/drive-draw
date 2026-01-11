import { useEffect, useState, useRef, useCallback } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useGoogleLogin } from '@react-oauth/google';

// Simple debounce utility (or we could use lodash.debounce)
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  return debouncedCallback;
};

const App = () => {
  const [fileId, setFileId] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [headRevisionId, setHeadRevisionId] = useState(null);
  const [status, setStatus] = useState("Initializing..."); // 'Initializing' | 'Auth' | 'Loading' | 'Ready' | 'Saving' | 'Error'

  // Ref to keep track of latest revision without triggering re-renders in callbacks
  const headRevisionIdRef = useRef(null);

  // 1. Auth Setup
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("Logged in:", tokenResponse);
      setAccessToken(tokenResponse.access_token);
      setStatus("Loading");
    },
    onError: (error) => {
      console.error("Login Failed:", error);
      setStatus("Error: Login Failed");
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install',
    // drive.file is usually enough if created by app, but for 'Open with', we need access to that specific file.
    // drive.install is needed to be an installed app.
  });

  // 2. Parse URL & Trigger Auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get('state');

    if (stateParam) {
      try {
        const state = JSON.parse(stateParam);
        if (state.action === 'open' && state.ids.length > 0) {
          setFileId(state.ids[0]);
          // Check if we have an access token? If not, trigger login
          // Note context: We are likely needing to prompt or rely on previous session.
          // For this implementation, we will trigger login immediately.
          // In a real app, might check token storage first.
          setStatus("Auth");
          login();
        } else {
          // New file creation flow or other actions
          setStatus("Ready (No File)");
        }
      } catch (e) {
        console.error("Failed to parse state", e);
        setStatus("Error: Invalid State");
      }
    } else {
      // Dev mode or standalone open
      setStatus("Standalone");
      // login(); // Optional: trigger login button manually
    }
  }, [login]);

  // 3. Fetch File Content
  useEffect(() => {
    if (!accessToken || !fileId) return;

    const loadFile = async () => {
      try {
        // Fetch Metadata (Revision ID)
        const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=headRevisionId`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const metaData = await metaRes.json();
        setHeadRevisionId(metaData.headRevisionId);
        headRevisionIdRef.current = metaData.headRevisionId;

        // Fetch Content
        const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!contentRes.ok) {
          throw new Error("Failed to fetch file content");
        }

        // Blobs might come empty for new files
        const blob = await contentRes.blob();
        if (blob.size > 0) {
          const text = await blob.text();
          const json = JSON.parse(text);
          setFileData(json); // Expected { elements, appState }
        } else {
          // New/Empty file
          setFileData({ elements: [], appState: {} });
        }

        setStatus("Ready");

      } catch (err) {
        console.error(err);
        setStatus("Error: Load Failed");
      }
    };

    loadFile();
  }, [accessToken, fileId]);

  // 4. Save Logic
  const saveToDrive = async (elements, appState) => {
    if (!accessToken || !fileId) return;

    console.log("Saving...");
    // Check revision
    try {
      // In a real rigorous implementation, you check remote revision first.
      // For now, we assume optimistic or 'last write' but user asked for revision check.
      // We'll skip the PRE-check to save a call, rely on user to be only editor or implement specific locking.
      // The user prompted: "When saving: Check if remote revisionId matches headRevisionId."

      // Let's implement the check.
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=headRevisionId`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const metaData = await metaRes.json();

      if (metaData.headRevisionId !== headRevisionIdRef.current) {
        alert("File has changed remotely! Please reload to avoid overwriting.");
        return; // Stop save
      }

      const payload = JSON.stringify({ elements, appState });

      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (res.ok) {
        const data = await res.json();
        // Update our revision ID
        if (data.headRevisionId) {
          setHeadRevisionId(data.headRevisionId);
          headRevisionIdRef.current = data.headRevisionId;
        }
        console.log("Saved successfully");
      }

    } catch (e) {
      console.error("Save failure", e);
    }
  };

  const debouncedSave = useDebounce(saveToDrive, 2000);

  const handleChange = (elements, appState) => {
    if (status === "Ready") {
      debouncedSave(elements, appState);
    }
  };

  if (status === "Initializing" || status === "Auth") {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <h3>Authenticating with Drive...</h3>
      </div>
    );
  }

  if (status === "Loading") {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <h3>Loading your drawing...</h3>
      </div>
    );
  }

  if (status.startsWith("Error")) {
    return (
      <div className="loader-container">
        <h3 style={{ color: '#ef4444' }}>{status}</h3>
        <button onClick={() => window.location.reload()} className="glass-panel" style={{ padding: '1rem', color: 'white', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      {!accessToken && (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
          <button onClick={() => login()} className="glass-panel" style={{ padding: '0.5rem 1rem', color: 'white', cursor: 'pointer' }}>
            Sign In
          </button>
        </div>
      )}
      <Excalidraw
        initialData={fileData}
        onChange={handleChange}
        theme="dark" // Matches our dark aesthetics
        UIOptions={{
          canvasActions: {
            loadScene: false, // Hide built-in load
            saveToActiveFile: false // Hide built-in save
          }
        }}
      />
    </div>
  );
};

export default App;
