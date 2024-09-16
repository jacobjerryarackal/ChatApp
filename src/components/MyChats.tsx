"use client";
import React, { useEffect, useState } from "react";
import styles from "./MyChats.module.css";
import { FaSearch } from "react-icons/fa";
import { ApolloClient, InMemoryCache, useQuery, gql, useLazyQuery } from "@apollo/client";


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

const SEARCH_USERS = gql`
  query SearchUsersByName($name: String!) {
    searchUsersByName(name: $name) {
      id
      name
      email
      profilePic
    }
  }
`;

function MyChats({ onChatSelect }: { onChatSelect: (chat: Chat | null, user: User | null) => void }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const [searchUsers, { data: searchData, loading: searchLoading, error: searchError }] =
    useLazyQuery(SEARCH_USERS, { client });

  const { data, loading, error } = useQuery<{ getUserChats: Chat[] }>(GET_USER_CHATS, {
    variables: { userId },
    skip: !userId,
    client,
    pollInterval: 1500,
  });

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    if (value.trim()) {
      searchUsers({ variables: { name: value } });
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setUserId(parseInt(userData.id, 10));
    }
  }, []);

  useEffect(() => {
    if (searchData && searchData.searchUsersByName) {
      setSearchResults(searchData.searchUsersByName);
    }
  }, [searchData]);

  const handleUserClick = (clickedUserId: number) => {
    const chat = data?.getUserChats.find((chat) =>
      chat.users.some((user) => parseInt(user.id, 10) === clickedUserId)
    );

    if (chat) {
      const receiver = getReceiver(chat);
      console.log("Selected Chat ID:", chat.id);
      console.log("Sender name", user?.name);
      console.log("Receiver Name:", receiver?.name);
      setSelectedChat(chat);
      setSelectedUser(chat.users.find((user) => parseInt(user.id, 10) === clickedUserId) || null);
      onChatSelect(chat, chat.users.find((user) => parseInt(user.id, 10) === clickedUserId) || null);
    } else {
      console.error("No chat found for this user.");
    }
  };

  
  const getReceiver = (chat: Chat): User | null => {
    if (!user) return null;
    return chat.users.find((chatUser) => chatUser.id !== user.id) || null;
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.search}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          value={search}
          onChange={handleSearchInputChange}
          className={styles.searchInput}
          placeholder="Search User"
        />
        {searchLoading ? (
          <p>Loading...</p>
        ) : searchError ? (
          <p>Error fetching data: {searchError.message}</p>
        ) : (
          <ul className={styles.resultsList}>
            {searchResults.map((user) => (
              <li
                key={user.id}
                className={`${styles.resultItem} ${selectedUser?.id === user.id ? styles.selected : ""}`}
                onClick={() => handleUserClick(parseInt(user.id, 10))}
              >
                <img
                  src={user.profilePic || "/default-avatar.png"}
                  alt={user.name}
                  className={styles.resultAvatar}
                />
                <div className={styles.resultDetails}>
                  <div className={styles.resultName}>{user.name}</div>
                  <div className={styles.resultEmail}>{user.email}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.Chat_list}>
        {loading && <p>Loading...</p>}
        {error && <p>Error loading chats: {error.message}</p>}
        {data && data.getUserChats.length === 0 && <p>No chats available</p>}
        {data?.getUserChats
          .filter((chat) => chat.messages.length > 0)
          .map((chat) => {
            const receiver = getReceiver(chat);
            const lastMessage = chat.messages[chat.messages.length - 1]?.text || "";

            return (
              receiver && (
                <div
                  key={chat.id}
                  className={`${styles.Chat_item} ${selectedChat?.id === chat.id ? styles.selectedChat : ""}`}
                  onClick={() => handleUserClick(parseInt(receiver.id, 10))} 
                >
                  <img
                    src={receiver.profilePic || "/default-pic.png"}
                    alt={receiver.name}
                    className={styles.Avatar}
                  />
                  <div className={styles.Chat_details}>
                    <h3 className={styles.Username}>{receiver.name}</h3>
                    <p className={styles.Last_message}>{lastMessage}</p>
                  </div>
                </div>
              )
            );
          })}
      </div>
    </div>
  );
}

export default MyChats;
