import { Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from './AuthContext'
import { db, updateUser } from "./firebase";

import Navbar from './components/Navbar/Navbar';
import Loader from './components/Loader/Loader';
import Footer from './components/Footer/Footer';

import Home from './pages/Home';
import AdminTips from "./pages/AdminTips";
import { Login } from "./pages/Login";
import Register from "./pages/Register";
import Error from './pages/Error';
import EditTip from "./pages/EditTip";
import UserProfile from "./pages/userProfile/UserProfile";
import ListUsers from "./pages/ListUsers";
import EditUser from "./pages/EditUser";
import KoraPaymentsV1 from "./pages/Payments/KoraPaymentsV1";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (loading) {
      if (window.document.readyState === "complete") {
        setLoading(!loading)
      } else {
        setLoading(false);
      }
    }
  }, [loading]);

  useEffect(() => {
    const fetchUserDataWithRetry = async () => {
      const email = currentUser?.email;
      if (!email) return;

      let retries = 0;
      while (retries < 5) {
        const userRef = doc(db, "users", email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data());
          break;
        }

        retries++;
        await new Promise((res) => setTimeout(res, 500));
      }

      if (retries === 5) {
        console.warn("User document still not found after retries");
      }
    };

    if (currentUser) {
      fetchUserDataWithRetry();
    }
  }, [currentUser]);

  useEffect(() => {
    if (userData && userData.isPremium) {
      const currentTime = new Date();
      const previousTime = new Date(userData.subDate);
      const { subscription } = userData;
      const timeDifference = currentTime - previousTime;

      const checkTimeAndUpdate = (timeLimitInMs) => {
        if (timeDifference >= timeLimitInMs) {
          updateUser(currentUser.email, false, null, null);
        }
      };

      switch (subscription) {
        case "Daily":
          checkTimeAndUpdate(24 * 60 * 60 * 1000);
          break;
        case "Weekly":
          checkTimeAndUpdate(7 * 24 * 60 * 60 * 1000);
          break;
        case "Monthly":
          if (currentTime.getFullYear() > previousTime.getFullYear() ||
            (currentTime.getFullYear() === previousTime.getFullYear() && currentTime.getMonth() > previousTime.getMonth())) {
            updateUser(currentUser.email, false, null, null);
          }
          break;
        case "Yearly":
          if (currentTime.getFullYear() > previousTime.getFullYear() ||
            (currentTime.getFullYear() === previousTime.getFullYear() && currentTime.getMonth() > previousTime.getMonth()) ||
            (currentTime.getFullYear() === previousTime.getFullYear() && currentTime.getMonth() === previousTime.getMonth() && currentTime.getDate() > previousTime.getDate())) {
            updateUser(currentUser.email, false, null, null);
          }
          break;
        default:
          return;
      }
    }
  }, [userData, currentUser]);

  return (
    <HelmetProvider>
      <div className="App">
        {loading && <Loader />}
        {!loading && <>
          <Navbar />
          <Routes>
            <Route path='/' element={<Home userData={userData} />} />
            <Route path='pay' element={currentUser ? <KoraPaymentsV1 setUserData={setUserData} /> : <Login />} />
            <Route path='admin/tips' element={currentUser ? <AdminTips /> : <Login />} />
            <Route path='edit' element={currentUser ? <EditTip /> : <Login />} />
            <Route path='users' element={currentUser ? <ListUsers /> : <Login />} />
            <Route path='users/:id' element={currentUser ? <UserProfile data={userData} /> : <Login />} />
            <Route path='users-edit' element={currentUser ? <EditUser userData={userData} setUserData={setUserData} /> : <Login />} />
            <Route path='login' element={<Login />} />
            <Route path='register' element={<Register />} />
            <Route path='*' element={<Error />} />
          </Routes>
          <Footer user={currentUser} />
        </>}
      </div>
    </HelmetProvider>
  );
}

export default App;
