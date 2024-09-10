"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./ChatBox.module.css";
import { FaSearch, FaEllipsisV, FaVideo, FaSmile } from "react-icons/fa";
import ProfileModal from "./ProfileModal";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { ApolloClient, InMemoryCache, useMutation, gql } from "@apollo/client";
import VideoCallModal from "../components/VideoCallModal";

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

interface ChatBoxProps {
  selectedChat: Chat | null;
  selectedUser: User | null;
  socket: any;
}

const client = new ApolloClient({
  uri: "http://localhost:8000/graphql",
  cache: new InMemoryCache(),
});

const GET_USER_CHATS = gql`
  query GetUserChats($userId: Int!) {
    getUserChats(userId: $userId) {
      id
      users {
        id
        name
        profilePic
      }
      messages {
        id
        text
        sender {
          id
          name
        }
      }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($text: String!, $chatId: Int!, $senderId: Int!) {
    sendMessage(text: $text, chatId: $chatId, senderId: $senderId) {
      id
      text
      sender {
        id
        name
        profilePic
      }
      chat {
        id
      }
    }
  }
`;

const DELETE_MESSAGE = gql`
  mutation DeleteMessage($deleteMessageId: Int!) {
    deleteMessage(id: $deleteMessageId) {
      id
    }
  }
`;

function ChatBox({ selectedChat, selectedUser, socket }: ChatBoxProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isVideoCallModalOpen, setIsVideoCallModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>(
    selectedChat?.messages || []
  );
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    visible: boolean;
    x: number;
    y: number;
  }>({ messageId: "", visible: false, x: 0, y: 0 });

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");

  const [sendMessage] = useMutation(SEND_MESSAGE, {
    client,
    update(cache, { data: { sendMessage } }) {
      cache.modify({
        fields: {
          getUserChats(existingChats = []) {
            return existingChats.map((chat:Chat) => {
              if (chat.id === sendMessage.chat.id) {
                return {
                  ...chat,
                  messages: [...chat.messages, sendMessage],
                };
              }
              return chat;
            });
          },
        },
      });
    },
    
    onCompleted: (data) => {
      setChatMessages((prevMessages) => [...prevMessages, data.sendMessage]);
      setMessage("");
    },
    onError: (error) => {
      console.error("Error sending message:", error);
    },
    refetchQueries: [{ query: GET_USER_CHATS, variables: { userId: selectedUser?.id } }],
  });

  const [deleteMessage] = useMutation(DELETE_MESSAGE, {
    client,
    update(cache, { data: { deleteMessage } }) {
      cache.modify({
        fields: {
          getUserChats(existingChats = []) {
            return existingChats.map((chat: Chat) => {
              if (chat.id === selectedChat?.id) {
                return {
                  ...chat,
                  messages: chat.messages.filter(
                    (message: Message) => message.id !== deleteMessage.id
                  ),
                };
              }
              return chat;
            });
          },
        },
      });
    },
    onCompleted: () => {
      setChatMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== contextMenu.messageId)
      );
      setContextMenu({ ...contextMenu, visible: false });
    },
    onError: (error) => {
      console.error("Error deleting message:", error);
    },
  });
  



  useEffect(() => {
    if (selectedChat) {
      socket.emit("join-chat", selectedChat.id);
    }
  }, [selectedChat, socket]);

  useEffect(() => {
    if (selectedChat) {
      setChatMessages(selectedChat.messages);
    }
  }, [selectedChat]);
  

  useEffect(() => {
  if (!socket) return;

  const handleMessage = (receivedMessage: Message) => {
    // Check if the message already exists to avoid duplication
    setChatMessages((prevMessages) => {
      const isDuplicate = prevMessages.some((msg) => msg.id === receivedMessage.id);
      if (!isDuplicate) {
        return [...prevMessages, receivedMessage];
      }
      return prevMessages;
    });
  };

  socket.on('receive-message', handleMessage);

  return () => {
    socket.off('receive-message', handleMessage);
  };
}, [socket]);



  

  const handleSend = async () => {
    if (message.trim() === "") {
      console.warn("Cannot send an empty message");
      return;
    }
  
    if (!selectedChat || !selectedUser) {
      console.error("Chat or User information is missing.");
      return;
    }
  
    try {
      const { data } = await sendMessage({
        variables: {
          text: message,
          chatId: selectedChat.id,
          senderId: selectedUser.id,
        },
      });
      
  
      // Emit the message over the WebSocket
      socket.emit('send-message', {
        chatId: selectedChat.id,
        message: data.sendMessage,
      });
  
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  



  const handleAvatarClick = () => {
    setIsModalOpen(true);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prevMessage) => prevMessage + emojiData.emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(event.target.value);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSend();
    }
  };

  const handleContextMenu = (
    event: React.MouseEvent,
    messageId: string
  ) => {
    event.preventDefault();
    setContextMenu({
      messageId,
      visible: true,
      x: event.pageX,
      y: event.pageY,
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({
        variables: { deleteMessageId: parseInt(messageId, 10) },
      });
  
      // Update local state immediately
      setChatMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
  
      // Emit the delete-message event over WebSocket after deletion
      socket.emit('delete-message', {
        chatId: selectedChat?.id,
        messageId: messageId,
      });
  
      setContextMenu({ ...contextMenu, visible: false });
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };
  
  useEffect(() => {
    if (!socket) return;
  
  
    const handleDeletedMessage = (deletedMessageData: { chatId: string; messageId: string }) => {
      if (selectedChat?.id === deletedMessageData.chatId) {
        setChatMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== deletedMessageData.messageId)
        );
      }
    };
  
    socket.on('delete-message', handleDeletedMessage);
  
  
    return () => {
      socket.off('delete-message', handleDeletedMessage);
    };
  }, [socket, selectedChat]);
  
  

  const handleClickMessage = (messageId: string) => {
    console.log("Message clicked:", messageId);
  };
  

  const handleClickOutside = (event: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (selectedChat) {
      setChatMessages(selectedChat.messages);
    }
  }, [selectedChat]);

  const handleSearchClick = () => {
    setIsSearchOpen(!isSearchOpen); 
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredMessages = chatMessages.filter((message) =>
    message.text.toLowerCase().includes(searchTerm.toLowerCase())
  );



  if (!selectedChat || !selectedUser) {
    return <div>No chat selected</div>;
  }

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi')); 
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={index} style={{ backgroundColor: "yellow" }}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };
  

  return (
    <div className={styles.chatBox}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderInfo}>
          <img
            src={selectedUser.profilePic || "/default-avatar.png"}
            alt={selectedUser.name || "User Avatar"}
            className={styles.avatar}
            onClick={handleAvatarClick}
          />
          <div>
            <h3 className={styles.userName}>{selectedUser.name || "Contact Name"}</h3>
            <p className={styles.userStatus}>online</p>
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
        <FaSearch className={styles.icon} onClick={handleSearchClick} />
          {isSearchOpen && (
            <input
              type="text"
              placeholder="Search messages..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={handleSearchInputChange}
            />
          )}
          <FaVideo onClick={() => setIsVideoCallModalOpen(true)} className={styles.icon} />
          <FaEllipsisV className={styles.icon} />
        </div>
      </div>

    

      <div className={styles.chatArea}>
              {filteredMessages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${
              message.sender.id === selectedUser?.id ? styles.messageOwn : ""
            }`}
          >
            <span className={styles.messageText}>
              {highlightSearchTerm(message.text, searchTerm)}
            </span>
          </div>
        ))}

        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${
              message.sender.id === selectedUser?.id ? styles.messageOwn : ""
            }`}
            onClick={() => handleClickMessage(message.id)}
            onContextMenu={(e) => handleContextMenu(e, message.id)}
          >
            <span className={styles.messageText}>{message.text}</span>
          </div>
        ))}
      </div>

      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => handleDeleteMessage(contextMenu.messageId)}>
            Delete Message
          </button>
        </div>
      )}

      <div className={styles.chatInputArea}>
        <FaSmile
          className={styles.icon}
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
        />
        {isEmojiPickerOpen && (
          <div className={styles.emojiPicker}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        <input
          type="text"
          placeholder="Type a message"
          className={styles.input}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
        />
        <button className={styles.sendButton} onClick={handleSend}>
          Send
        </button>
      </div>
      {isVideoCallModalOpen && (
        <VideoCallModal
          isOpen={isVideoCallModalOpen}
          onClose={() => setIsVideoCallModalOpen(false)} socket={socket} userId={selectedUser.id}        />
      )}
      

      {isModalOpen && (
        <ProfileModal userId={parseInt(selectedUser.id, 10)} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

export default ChatBox;
