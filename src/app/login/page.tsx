"use client";
import { SetStateAction, useState } from "react";
import styles from "./LoginRegister.module.css";
import { ApolloClient, InMemoryCache, gql, useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";

const CREATE_USER = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $password: String!
    $profilePic: Upload
  ) {
    createUser(
      name: $name
      email: $email
      password: $password
      profilePic: $profilePic
    ) {
      id
      name
      email
      profilePic
    }
  }
`;

const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

const client = new ApolloClient({
  uri: "http://localhost:8000/graphql",
  cache: new InMemoryCache(),
});

const LoginRegister = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    profilePic: File | null; 
  }>({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    profilePic: null,
  });
  
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    profilePic: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loginUser] = useMutation(LOGIN_USER, { client });
  const [createUser] = useMutation(CREATE_USER, { client });
  const [loading, setLoading] = useState(false);
  const [pic, setPic] = useState<string | null>(null);
  const router = useRouter();

  const handleTabChange = (tab: SetStateAction<string>) => {
    setActiveTab(tab);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      profilePic: null,
    });
    setErrors({
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      profilePic: "",
    });
    setIsSubmitted(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (isSubmitted) {
      validate(); 
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLoading(true);

    if (!file) {
      alert("Please select an image.");
      setLoading(false);
      return;
    }

    if (file.type === "image/jpeg" || file.type === "image/png") {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "chatapp");
      data.append("cloud_name", "ddumx2wgr");

      try {
        const res = await fetch(
          "https://api.cloudinary.com/v1_1/ddumx2wgr/image/upload",
          {
            method: "POST",
            body: data,
          }
        );

        const result = await res.json();
        setPic(result.url.toString());
        setLoading(false);
      } catch (err) {
        console.error("Error uploading the image:", err);
        setLoading(false);
      }
    } else {
      alert("Select a valid image file (JPEG or PNG).");
      setLoading(false);
    }

    setFormData({ ...formData, profilePic: file });
    setErrors({ ...errors, profilePic: "" });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validate = () => {
    const newErrors = {
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      profilePic: "",
    };
    let isValid = true;

    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    }

    if (activeTab === "register") {
      if (!formData.username) {
        newErrors.username = "Username is required";
        isValid = false;
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirm password is required";
        isValid = false;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setIsSubmitted(true);

    if (validate()) {
      try {
        if (activeTab === "login") {
          const { data } = await loginUser({
            variables: {
              email: formData.email,
              password: formData.password,
            },
          });

          if (data.loginUser.token) {
            localStorage.setItem("token", data.loginUser.token);
            localStorage.setItem("user", JSON.stringify(data.loginUser.user));
            alert("Login successful!");
            router.push("/chats");
          }
        } else {
          const variables: {
            name: string;
            email: string;
            password: string;
            profilePic?: string;
          } = {
            name: formData.username,
            email: formData.email,
            password: formData.password,
          };

          if (pic) {
            variables.profilePic = pic;
          }

          await createUser({
            variables,
          });
          alert("Registration successful! Please log in.");
          handleTabChange("login");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleBox}>
        <h1 className={styles.h1}>Welcome to J Chatz</h1>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabButton} ${
              activeTab === "login" ? styles.activeTab : ""
            }`}
            onClick={() => handleTabChange("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${
              activeTab === "register" ? styles.activeTab : ""
            }`}
            onClick={() => handleTabChange("register")}
          >
            Register
          </button>
        </div>
        {activeTab === "register" && (
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
            />
            {isSubmitted && errors.username && (
              <span className={styles.error}>{errors.username}</span>
            )}
          </div>
        )}
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
          />
          {isSubmitted && errors.email && (
            <span className={styles.error}>{errors.email}</span>
          )}
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {isSubmitted && errors.password && (
            <span className={styles.error}>{errors.password}</span>
          )}
        </div>
        {activeTab === "register" && (
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
            />
            {isSubmitted && errors.confirmPassword && (
              <span className={styles.error}>{errors.confirmPassword}</span>
            )}
          </div>
        )}
        {activeTab === "register" && (
          <div className={styles.inputGroup}>
            <label htmlFor="profilePic">Profile Picture</label>
            <input
              type="file"
              id="profilePic"
              name="profilePic"
              onChange={handleFileChange}
            />
            {isSubmitted && errors.profilePic && (
              <span className={styles.error}>{errors.profilePic}</span>
            )}
            {loading && <span>Uploading image...</span>}
          </div>
        )}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? "Submitting..." : activeTab === "login" ? "Login" : "Register"}
        </button>
      </form>
    </div>
  );
};

export default LoginRegister;
