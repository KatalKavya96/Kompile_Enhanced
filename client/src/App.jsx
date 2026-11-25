import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense, useContext } from "react";
import { Toaster } from "react-hot-toast";
import { useTodayContestToasts } from "./components/hooks/useTodayContestToasts.jsx";
import { UserContext } from "./context/UserContext.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

// Every page is its own chunk, so a visitor downloads only the code for the
// page they open. The workspace shell stays small and pages stream in.
const Home = lazy(() => import("./pages/app/Home.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage/LandingPage.jsx"));
const Login = lazy(() => import("./pages/auth/Login.jsx"));
const Register = lazy(() => import("./pages/auth/Register.jsx"));
const EmailVerification = lazy(() => import("./pages/auth/EmailVerification.jsx"));
const Forgotpassword = lazy(() => import("./pages/auth/Forgotpassword.jsx"));
const OAuthSuccess = lazy(() => import("./pages/auth/OAuthSuccess.jsx"));
const Profile = lazy(() => import("./pages/profile/Profile.jsx"));
const CompanyDashboard = lazy(() => import("./pages/CompanyWiseKit/CompanyDashboard.jsx"));
const Contest = lazy(() => import("./pages/event/Contest.jsx"));
const Workspace = lazy(() => import("./pages/Workspace/Workspace.jsx"));
const WorkspaceHome = lazy(() => import("./pages/Workspace/WorkspaceHome.jsx"));
const WorkspaceCompanyKit = lazy(() => import("./pages/Workspace/WorkspaceCompanyKit.jsx"));
const UserData = lazy(() => import("./components/Profile/UserData.jsx"));
const Mysheets = lazy(() => import("./components/workspace/mysheets/Mysheets.jsx"));
const LoveBabbarSheet = lazy(() => import("./components/workspace/sheetsDash/LoveBabbarSheet.jsx"));
const PracticeSheet = lazy(() => import("./components/workspace/sheetsDash/PracticeSheet.jsx"));
const StriversA2ZSheet = lazy(() => import("./components/workspace/sheetsDash/StriversA2ZSheet.jsx"));
const LoveBabbartopic = lazy(() => import("./components/workspace/sheetsDash/LoveBabbartopic.jsx"));
const Community = lazy(() => import("./components/workspace/community/Community.jsx"));
const Room = lazy(() => import("./components/workspace/room/Room.jsx"));
const RoomSpace = lazy(() => import("./components/workspace/room/RoomSpace.jsx"));
const Bookmarks = lazy(() => import("./components/workspace/Bookmarks.jsx"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, isAuthLoading } = useContext(UserContext);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Not logged in at all — send to login
  if (!user || !user.email) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but email not verified — send to verification page
  // Google OAuth users are always verified; skip this check for them
  if (!user.isEmailVerified && user.authProvider !== "google") {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, isAuthLoading } = useContext(UserContext);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (user && user.email) {
    return <Navigate to="/workspace" replace />;
  }
  return children;
};

const RedirectToWorkspaceCompanyKit = () => {
  const { companySlug } = useParams();
  return <Navigate to={`/workspace/company-kit/${companySlug}`} replace />;
};

function App() {
  useTodayContestToasts();

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{ top: 70, right: 16 }}
        toastOptions={{
          duration: 6000,
          style: {
            background: "#1a1a1a",
            color: "#e5e7eb",
            border: "1px solid #2d2d2d",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            maxWidth: "240px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          },
        }}
      />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/company" element={<Navigate to="/workspace/company-kit" replace />} />
        <Route
          path="/company/:companySlug"
          element={
            <ProtectedRoute>
              <RedirectToWorkspaceCompanyKit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/events" element={<Contest />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/verify-email/:token" element={<EmailVerification />} />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <Forgotpassword />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password/:token"
          element={
            <PublicRoute>
              <Forgotpassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <PublicRoute>
              <Forgotpassword />
            </PublicRoute>
          }
        />

        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/profile/:username" element={<Profile />} />
        <Route
          path="/user_data"
          element={
            <ProtectedRoute>
              <UserData />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          }
        >
          <Route index element={<WorkspaceHome />} />
          <Route path="sheets" element={<Mysheets />} />
          <Route path="sheets/love-babbar-450" element={<LoveBabbarSheet />} />
          <Route
            path="sheets/love-babbar-450/:topicSlug"
            element={<LoveBabbartopic />}
          />
          <Route path="sheets/strivers-a2z" element={<StriversA2ZSheet />} />
          <Route path="sheets/:slug" element={<PracticeSheet />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="community" element={<Community />} />
          <Route path="room" element={<Room />} />
          <Route path="room/:roomId" element={<RoomSpace />} />
          <Route path="company-kit" element={<WorkspaceCompanyKit />} />
          <Route
            path="company-kit/:companySlug"
            element={<CompanyDashboard />}
          />
          <Route path="bookmarks" element={<Bookmarks />} />
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}

export default App;
