import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Operators from "./pages/Operators";
import Reports from "./pages/Reports";
import MapView from "./pages/MapView";
import Chat from "./pages/Chat";
import History from "./pages/History";
import MissingPersons from "./pages/MissingPersons";
import Layout from "./components/Layout";

export default function App() {
  const [user,    setUser]    = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setIsAdmin(snap.data()?.role === "super_admin");
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0d1117" }}>
      <div style={{ color:"#EF4444", fontSize:24, fontWeight:700 }}>Cargando WILLAY Admin...</div>
    </div>
  );

  if (!user || !isAdmin) return <Login />;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/operators" element={<Operators />} />
          <Route path="/reports"   element={<Reports />} />
          <Route path="/map"       element={<MapView />} />
          <Route path="/chat"      element={<Chat />} />
          <Route path="/history"   element={<History />} />
          <Route path="/missing"   element={<MissingPersons />} />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}