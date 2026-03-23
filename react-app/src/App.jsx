import React, { useState } from 'react';
import { useChat } from './context/ChatContext';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import CallOverlay from './components/CallOverlay';
import IncomingCallModal from './components/IncomingCallModal';
import SettingsModal from './components/SettingsModal';
import ProfileModal from './components/ProfileModal';

function App() {
  const {
    currentUser,
    isSidebarOpen,
    setIsSidebarOpen,
    currentChat,
    activeTab,
    setActiveTab,
    isSettingsOpen,
    setIsSettingsOpen,
    isProfileOpen,
    setIsProfileOpen,
    logout
  } = useChat();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (!currentUser) {
    return (
      <div className="app-container">
        <Auth />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. Far Left Vertical Nav (Inspired by reference) */}
      <nav className="vertical-nav">
        <div className="nav-logo-wrapper">
          <img src="/logo.svg" alt="logo" style={{ width: '40px', height: '40px' }} />
        </div>
        <div className={`nav-item ${activeTab === 'FRIENDS' ? 'active' : ''}`} onClick={() => { setActiveTab('FRIENDS'); setIsSidebarOpen(true); }}>
          <i className="fas fa-user-friends"></i>
        </div>
        <div className={`nav-item ${activeTab === 'CHATS' ? 'active' : ''}`} onClick={() => { setActiveTab('CHATS'); setIsSidebarOpen(true); }} title="Messages">
          <i className="fas fa-comment-alt"></i>
        </div>
        <div className={`nav-item ${activeTab === 'GROUPS' ? 'active' : ''}`} onClick={() => { setActiveTab('GROUPS'); setIsSidebarOpen(true); }} title="Groups">
          <i className="fas fa-layer-group"></i>
        </div>
        <div className={`nav-item ${activeTab === 'CALLS' ? 'active' : ''} call-fx`} onClick={() => { setActiveTab('CALLS'); setIsSidebarOpen(true); }} title="Calls">
          <i className="fas fa-phone-alt"></i>
        </div>
        <div className={`nav-item ${activeTab === 'MEETINGS' ? 'active' : ''}`} onClick={() => { setActiveTab('MEETINGS'); setIsSidebarOpen(true); }} title="Meetings">
          <i className="fas fa-video"></i>
        </div>
        <div className="nav-item" onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(true); }}>
          <i className="fas fa-cog"></i>
        </div>

        <div className="nav-bottom">
          <div className="nav-profile" onClick={() => setIsProfileOpen(true)} style={{ cursor: 'pointer' }}>
            <img src={currentUser?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} alt="profile" />
          </div>
        </div>
      </nav>

      {/* 2. Main Sidebar and Chat Area */}
      <div id="main-interface" className={`main-layout ${!currentChat.target ? 'no-chat-selected' : ''}`}>
        <Sidebar />
        <ChatWindow />
      </div>

      <CallOverlay />
      <IncomingCallModal />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}

export default App;
