/** @format */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentFirm, listClients, createClient } from "../../services/apiClient";
import AuthContext from "./AuthContext";

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  const [firm, setFirm] = useState(null);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const loadTenantData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch current firm
      try {
        const firmRes = await getCurrentFirm();
        if (firmRes.data?.data?.firm) {
          const firmData = firmRes.data.data.firm;
          setFirm(firmData);
          localStorage.setItem("activeFirmId", firmData._id);
        }
      } catch (fErr) {
        console.warn("Firm resolution warning:", fErr?.message);
      }

      // 2. Fetch clients
      const clientsRes = await listClients();
      const clientList = clientsRes.data?.data || [];
      setClients(clientList);

      // 3. Restore or select active client
      const savedClientId = localStorage.getItem("activeClientId");
      const matched = clientList.find((c) => c._id === savedClientId);

      if (matched) {
        setActiveClient(matched);
      } else if (clientList.length > 0) {
        setActiveClient(clientList[0]);
        localStorage.setItem("activeClientId", clientList[0]._id);
      } else {
        setActiveClient(null);
        localStorage.removeItem("activeClientId");
      }
    } catch (err) {
      console.error("Tenant resolution error:", err);
      setError("Failed to load firm or clients context.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token || user) {
      loadTenantData();
    } else {
      setIsLoading(false);
    }
  }, [user, loadTenantData]);

  const switchClient = (client) => {
    setActiveClient(client);
    if (client?._id) {
      localStorage.setItem("activeClientId", client._id);
    } else {
      localStorage.removeItem("activeClientId");
    }
  };

  const handleCreateClient = async (clientData) => {
    const res = await createClient(clientData);
    const newClient = res.data?.data;
    if (newClient) {
      setClients((prev) => [newClient, ...prev]);
      switchClient(newClient);
    }
    return newClient;
  };

  return (
    <TenantContext.Provider
      value={{
        firm,
        clients,
        activeClient,
        isLoading,
        error,
        switchClient,
        refreshClients: loadTenantData,
        createClient: handleCreateClient,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};

export default TenantContext;

