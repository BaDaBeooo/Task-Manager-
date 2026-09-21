import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";


import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyTasks from "./pages/MyTasks";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import SupportOrganization from "./pages/SupportOrganization";
import Notifications from "./pages/Notifications";


function ProtectedRoute({
  children,
}) {
  const token =
    localStorage.getItem(
      "access_token"
    );

  if (!token) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
}


function PublicRoute({
  children,
}) {
  const token =
    localStorage.getItem(
      "access_token"
    );

  if (token) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}


function App() {

  return (
    <BrowserRouter>

      <Routes>

        {/* LOGIN */}

        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />


        {/* DASHBOARD */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />


        {/* MY TASKS */}

        <Route
          path="/my-tasks"
          element={
            <ProtectedRoute>
              <MyTasks />
            </ProtectedRoute>
          }
        />


        {/* ALL TASKS */}

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />


        {/* NOTIFICATIONS */}

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />


        {/* SUPPORT */}

        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          }
        />


        {/* SUPPORT ADMIN */}

        <Route
          path="/support/settings"
          element={
            <ProtectedRoute>
              <SupportOrganization />
            </ProtectedRoute>
          }
        />


        {/* SETTINGS */}

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />


        {/* UNKNOWN */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}


export default App;