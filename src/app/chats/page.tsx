"use client"
import React, { useState, useEffect } from "react";
import MyChats from "@/components/MyChats";
import ChatBox from "@/components/ChatBox";
import SideDrawer from "@/components/SideDrawer";
import styles from "./Chats.module.css";
import io from "socket.io-client";

interface User {
  id: string;
  name: string;
  email: string;
  profilePic?: string;
}

interface Message {
  id: string;
  text: string;
  sender: User;
}

interface Chat {
  id: string;
  users: User[];
  messages: Message[];
}

function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const socketInstance = io("http://localhost:8000");
    setSocket(socketInstance);
  
    
    return () => {
      socketInstance.disconnect();
    };
  }, []); 
  
  

  const handleChatSelection = (chat: Chat | null, user: User | null) => {
    setSelectedChat(chat);
    setSelectedUser(user);
  };

  return (
    <div className={styles.chat}>
      <div className={styles.sidedrawer}>
        <SideDrawer />
      </div>
      <div className={styles.mainpage}>
        <div>
          <MyChats onChatSelect={handleChatSelection} />
        </div>
        <div className={styles.right}>
          <ChatBox selectedChat={selectedChat} selectedUser={selectedUser} socket={socket} />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
