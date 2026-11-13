import { useState, useEffect } from "react";
import axios from "axios";
import AuthContext from "./AuthContext";
import BACKEND_URL from "../../Config/index.js";

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await axios.get(
          `${BACKEND_URL}/api/v1/users/current-user`,
          { headers, withCredentials: true }
        );
        if (res.data?.data) {
          setUser(res.data.data);
          const firmId = res.data.data.firm?._id || res.data.data.firm;
          if (firmId) {
            localStorage.setItem("activeFirmId", firmId);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (userData) => {
    const userObj = userData?.user || (userData?.data?.user) || userData;
    const token = userData?.accessToken || (userData?.data?.accessToken);
    if (token) {
      localStorage.setItem("accessToken", token);
    }
    if (userObj) {
      localStorage.setItem("user", JSON.stringify(userObj));
      const firmId = userObj.firm?._id || userObj.firm;
      if (firmId) {
        localStorage.setItem("activeFirmId", firmId);
      }
    }
    setUser(userObj);
  };

  const logout = async () => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/v1/users/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      // console.error("Logout failed:", err);
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("activeFirmId");
    localStorage.removeItem("activeClientId");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
