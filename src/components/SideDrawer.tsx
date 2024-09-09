"use client"
import React, { useEffect, useState, useRef, useCallback } from "react";
import { FaBell, FaSearch, FaChevronDown } from "react-icons/fa";
import styles from "./SideDrawer.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProfileModal from "./ProfileModal";
import { useQuery, gql, ApolloClient, InMemoryCache, useLazyQuery } from "@apollo/client";

interface User {
  id: number;
  name: string;
  email: string;
  profilePic?: string;
}

const client = new ApolloClient({
  uri: "http://localhost:8000/graphql",
  cache: new InMemoryCache(),
});

const GET_USER = gql`
  query GetUserById($id: Int!) {
    getUserById(id: $id) {
      id
      name
      email
      profilePic
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

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notification: any[] = [];

  const { data, loading, error } = useQuery(GET_USER, {
    client,
    variables: { id: user?.id },
    skip: !user,
  });

  const [searchUsers, { data: searchData, loading: searchLoading, error: searchError }] = useLazyQuery(
    SEARCH_USERS, { client }
  );

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    if (value.trim()) {
      searchUsers({ variables: { name: value } });
    } else {
      setSearchResults([]);
    }
  };

  const logoutHandler = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert("Logged out successfully!");
    router.push("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    console.log(userData)

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  }, [router]);

  useEffect(() => {
    if (data && data.getUserById) {
      setUser(data.getUserById);
    }
  }, [data]);

  useEffect(() => {
    if (searchData && searchData.searchUsersByName) {
      setSearchResults(searchData.searchUsersByName);
    }
  }, [searchData]);

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
    setDropdownVisible(false);
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setDropdownVisible(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleSearchClick = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSearch("");
    setSearchResults([]);
  };

  const handleUserClick = (userId: number) => {
    console.log("User clicked:", userId);
  };

  return (
    <div className={styles.sideDrawer}>
      <div className={styles.searchContainer} onClick={handleSearchClick}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          value={search}
          onChange={handleSearchInputChange}
          className={styles.searchInput}
          placeholder="Search..."
        />
      </div>

      <h2 className={styles.title}>J Chatz</h2>

      <div className={styles.iconContainer}>
        <div className={styles.notification}>
          <FaBell className={styles.icon} />
          {notification.length > 0 && (
            <span className={styles.badge}>{notification.length}</span>
          )}
        </div>
        <div className={styles.userMenu} onClick={toggleDropdown}>
          {user && user.profilePic ? (
            <img src={user.profilePic} className={styles.avatar} alt="User Avatar" />
          ) : (
            <div className={styles.avatarPlaceholder}>{user ? user.name[0] : "U"}</div>
          )}
          <FaChevronDown className={styles.icon} />
          <div
            className={`${styles.dropdown} ${dropdownVisible ? styles.dropdownVisible : ""}`}
            ref={dropdownRef}
          >
            <a href="#" className={styles.menuItem} onClick={handleProfileClick}>
              Profile
            </a>
            <Link href="/login" className={styles.menuItem} onClick={logoutHandler}>
              Logout
            </Link>
          </div>
        </div>
      </div>

      {showModal && user && (
        <ProfileModal userId={user.id} onClose={() => setShowModal(false)} />
      )}

      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={closeDrawer}>
          <div
            className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <h3>Search Users</h3>
              <button onClick={closeDrawer} className={styles.closeButton}>
                X
              </button>
            </div>
            <div className={styles.drawerBody}>
              <input
                type="text"
                placeholder="Search by name"
                value={search}
                onChange={handleSearchInputChange}
                className={styles.drawerInput}
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
                      className={styles.resultItem}
                      onClick={() => handleUserClick(user.id)}
                    >
                      <img src={user.profilePic || "/default-avatar.png"} alt={user.name} className={styles.resultAvatar} />
                      <div className={styles.resultDetails}>
                        <div className={styles.resultName}>{user.name}</div>
                        <div className={styles.resultEmail}>{user.email}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SideDrawer;
