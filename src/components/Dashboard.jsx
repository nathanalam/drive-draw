import React, { useState } from 'react';

// eslint-disable-next-line no-unused-vars
const Dashboard = ({ accessToken, onCreate, onOpenPicker, onLogout, userProfile }) => {
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        setIsCreating(true);
        await onCreate();
        setIsCreating(false);
    };

    return (
        <div className="fade-in" style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img
                        src={`${import.meta.env.BASE_URL}logo.jpg`}
                        alt="Drive Draw Logo"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            objectFit: 'cover'
                        }}
                    />
                    <h1 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#f8fafc'
                    }}>
                        Drive Draw
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {userProfile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img
                                src={userProfile.picture}
                                alt="Profile"
                                style={{ width: 32, height: 32, borderRadius: '50%' }}
                            />
                        </div>
                    )}
                    <button
                        onClick={onLogout}
                        className="glass-button"
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{
                        fontSize: '2.5rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        What would you like to create?
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>
                        Create beautiful hand-drawn diagrams directly in Google Drive
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="glass-card-button"
                        style={{
                            width: '200px',
                            height: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            cursor: isCreating ? 'wait' : 'pointer'
                        }}
                    >
                        <div style={{
                            fontSize: '3rem',
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '1rem',
                            borderRadius: '50%',
                            color: '#38bdf8'
                        }}>
                            +
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#f8fafc' }}>
                            {isCreating ? 'Creating...' : 'New Drawing'}
                        </span>
                    </button>

                    <button
                        onClick={onOpenPicker}
                        className="glass-card-button"
                        style={{
                            width: '200px',
                            height: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            fontSize: '3rem',
                            background: 'rgba(129, 140, 248, 0.1)',
                            padding: '1rem',
                            borderRadius: '50%',
                            color: '#818cf8'
                        }}>
                            📂
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#f8fafc' }}>
                            Open from Drive
                        </span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
