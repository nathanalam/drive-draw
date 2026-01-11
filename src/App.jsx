import { useEffect, useState, useRef, useCallback } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useGoogleLogin } from '@react-oauth/google';
import Dashboard from './components/Dashboard';
import FilePicker from './components/FilePicker';

// Simple debounce utility
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
  const [fileName, setFileName] = useState("Untitled");
  const [fileData, setFileData] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [status, setStatus] = useState("Initializing"); // 'Initializing' | 'Auth' | 'Dashboard' | 'Loading' | 'Ready' | 'Error' | 'Standalone'
  const [showPicker, setShowPicker] = useState(false);

  const headRevisionIdRef = useRef(null);

  // Update page title
  useEffect(() => {
    if (fileId) {
      document.title = fileName;
    } else {
      document.title = "Drive Draw";
    }
  }, [fileName, fileId]);

  // 1. Auth Setup
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      const expiry = new Date().getTime() + (tokenResponse.expires_in || 3599) * 1000;
      localStorage.setItem('drive_draw_token', tokenResponse.access_token);
      localStorage.setItem('drive_draw_token_expiry', expiry.toString());

      // Fetch User Profile
      fetchUserProfile(tokenResponse.access_token);

      // Determine next state
      if (fileId) {
        setStatus("Loading");
      } else {
        setStatus("Dashboard");
      }
    },
    onError: (error) => {
      console.error("Login Failed:", error);
      setStatus("Error: Login Failed");
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install profile email',
  });

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setUserProfile(profile);
      }
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUserProfile(null);
    localStorage.removeItem('drive_draw_token');
    localStorage.removeItem('drive_draw_token_expiry');
    setStatus("Standalone");
    setFileId(null);
  };

  // Restore token
  useEffect(() => {
    const storedToken = localStorage.getItem('drive_draw_token');
    const storedExpiry = localStorage.getItem('drive_draw_token_expiry');

    if (storedToken && storedExpiry) {
      if (new Date().getTime() < parseInt(storedExpiry)) {
        setAccessToken(storedToken);
        fetchUserProfile(storedToken);
      } else {
        localStorage.removeItem('drive_draw_token');
        localStorage.removeItem('drive_draw_token_expiry');
      }
    }
  }, []);

  // Parse URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get('state');

    if (stateParam) {
      try {
        const state = JSON.parse(stateParam);
        if (state.action === 'open' && state.ids.length > 0) {
          setFileId(state.ids[0]);
          setStatus(accessToken ? "Loading" : "Auth");
        } else if (state.action === 'create') {
          // Handle create intent from Drive UI
          setStatus(accessToken ? "Dashboard" : "Auth");
        }
      } catch (e) {
        console.error("Failed to parse state", e);
      }
    } else {
      if (accessToken) {
        setStatus("Dashboard");
      } else {
        setStatus("Standalone");
      }
    }
  }, [accessToken]);


  // Load Content
  useEffect(() => {
    if (!accessToken || !fileId) return;

    const loadFile = async () => {
      setStatus("Loading");
      try {
        // Fetch Metadata
        const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=headRevisionId,name`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const metaData = await metaRes.json();
        setFileName(metaData.name || "Untitled");
        headRevisionIdRef.current = metaData.headRevisionId;

        // Fetch Content
        const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!contentRes.ok) throw new Error("Failed to fetch file content");

        const blob = await contentRes.blob();
        if (blob.size > 0) {
          const text = await blob.text();
          try {
            const json = JSON.parse(text);
            if (json.appState && json.appState.collaborators) {
              delete json.appState.collaborators;
            }
            setFileData(json);
          } catch (e) {
            // If not JSON, empty
            setFileData({ elements: [], appState: {} });
          }
        } else {
          setFileData({ elements: [], appState: {} });
        }
        setStatus("Ready");
      } catch (err) {
        console.error(err);
        setStatus("Error: Load Failed");
      }
    };

    loadFile();
  }, [fileId, accessToken]); // Intentionally removed 'accessToken' from dependency to avoid loop if it refreshes, but actually we need it. Protected by status checks.


  // Save Logic
  const saveToDrive = async (elements, appState) => {
    if (!accessToken || !fileId) return;

    try {
      const { collaborators, ...restAppState } = appState;
      const payload = JSON.stringify({ elements, appState: restAppState });

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
        if (data.headRevisionId) {
          headRevisionIdRef.current = data.headRevisionId;
        }
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

  // Create New File
  const handleCreate = async () => {
    if (!accessToken) return;
    try {
      const metadata = {
        name: `Drawing ${new Date().toLocaleDateString()}.excalidraw`,
        mimeType: 'application/json'
      };

      // 1. Create file (metadata only)
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!createRes.ok) throw new Error("Failed to create file");
      const fileData = await createRes.json();
      const newFileId = fileData.id;

      // 2. Upload initial Empty Content
      const initialContent = JSON.stringify({ elements: [], appState: { viewBackgroundColor: "#ffffff" } });
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: initialContent
      });

      setFileId(newFileId);
      setFileName(metadata.name);
      setFileData({ elements: [], appState: { viewBackgroundColor: "#ffffff" } });
      setStatus("Ready");

    } catch (e) {
      console.error("Creation failed", e);
      alert("Failed to create new file");
    }
  };

  // Rename File
  const handleRename = async (newName) => {
    setFileName(newName);
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
    } catch (e) {
      console.error("Rename failed", e);
    }
  };

  // Render States

  if (status === "Initializing") {
    return <div className="loader-container"><div className="loader"></div><h3>Initializing...</h3></div>;
  }

  if (status === "Auth") {
    return (
      <div className="loader-container fade-in">
        <h1 style={{ fontSize: '2rem' }}>🔐 Auth Required</h1>
        <button onClick={() => login()} className="glass-panel" style={{ padding: '1rem 2rem', marginTop: '1rem', cursor: 'pointer' }}>Authorize Drive Access</button>
      </div>
    );
  }

  if (status === "Dashboard") {
    return (
      <>
        <Dashboard
          accessToken={accessToken}
          userProfile={userProfile}
          onCreate={handleCreate}
          onOpenPicker={() => setShowPicker(true)}
          onLogout={logout}
        />
        {showPicker && (
          <FilePicker
            accessToken={accessToken}
            onSelect={(id) => {
              setFileId(id);
              setShowPicker(false);
              setStatus("Loading");
            }} // This triggers loading
            onCancel={() => setShowPicker(false)}
          />
        )}
      </>
    );
  }

  if (status === "Standalone" && !accessToken) {
    // Landing Page
    return (
      <div className="loader-container fade-in">
        <h1 style={{ fontSize: '3rem', background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Drive Draw
        </h1>
        <p style={{ color: '#94a3b8' }}>Connect your Google Drive to start drawing</p>
        <button
          onClick={() => login()}
          className="glass-panel"
          style={{
            marginTop: '1rem',
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            color: 'white',
            border: 'none'
          }}
        >
          🚀 Connect Drive
        </button>
      </div>
    );
  }

  if (status === "Loading") {
    return <div className="loader-container"><div className="loader"></div><h3>Loading Drawing...</h3></div>;
  }

  if (status === "Ready") {
    return (
      <div style={{ height: "100vh", width: "100vw", display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        {/* Top Bar */}
        <div className="editor-navbar">
          <div className="editor-navbar-left">
            <button
              onClick={() => {
                setFileId(null);
                setStatus("Dashboard");
              }}
              className="back-button"
              title="Back to Dashboard"
            >
              ← <span>Back</span>
            </button>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onBlur={(e) => handleRename(e.target.value)}
              className="editor-title-input"
            />
          </div>

          <button
            onClick={() => {
              // Open share dialog in new tab
              window.open(`https://drive.google.com/file/d/${fileId}?usp=sharing`, '_blank');
            }}
            className="glass-button share-btn"
          >
            <span>👤</span>
            <span className="share-text">Share</span>
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <Excalidraw
            initialData={fileData}
            onChange={handleChange}
            theme="dark"
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
                export: { saveFileToDisk: true } // Allow export to disk
              }
            }}
          />
        </div>
      </div>
    );
  }

  return <div>Error: Unknown State</div>;
};

export default App;
