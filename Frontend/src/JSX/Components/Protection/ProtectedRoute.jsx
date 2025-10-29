/** @format */

import AuthContext from "../../Contexts/AuthContext";
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  //   console.log("user from protect route", user);
  //   console.log("loading from protect route", loading);

  // Wait until auth check finishes
  if (loading) {
    return <div>Loading...</div>; // or custom loader
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
