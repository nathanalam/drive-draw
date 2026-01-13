import React, { useEffect, useState } from 'react';

const FilePicker = ({ accessToken, onSelect, onCancel, onAuthError }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                setLoading(true);
                // Search for relevant files. 
                // We look for files with .excalidraw extension or JSONs that might be ours.
                // Best effort: name contains 'excalidraw' or simple JSONs.
                const query = "trashed = false and (name contains 'excalidraw')";

                const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, modifiedTime, thumbnailLink, iconLink)&orderBy=modifiedTime desc&pageSize=20`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                if (res.status === 401 && onAuthError) {
                    onAuthError();
                    return;
                }

                if (!res.ok) throw new Error("Failed to fetch files");

                const data = await res.json();
                setFiles(data.files || []);
            } catch (err) {
                console.error(err);
                setError("Failed to load files");
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [accessToken, onAuthError]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                width: '600px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                background: '#1e293b'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>Open Drawing</h2>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading files...</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>{error}</div>
                ) : files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No excalidraw files found in your Drive.</div>
                ) : (
                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {files.map(file => (
                            <button
                                key={file.id}
                                onClick={() => onSelect(file.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid transparent',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: 'inherit',
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <img src={file.iconLink} alt="" style={{ width: 24, height: 24 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, color: '#f1f5f9' }}>{file.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        Modified {new Date(file.modifiedTime).toLocaleDateString()}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilePicker;
