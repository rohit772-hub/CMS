import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AuthCallback from "@/components/auth/AuthCallback";

import LoginSelection from "@/pages/auth/LoginSelection";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import Unauthorized from "@/pages/auth/Unauthorized";

import DashboardLayout from "@/components/layout/DashboardLayout";
import PlaceholderPage from "@/components/dashboard/PlaceholderPage";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminCourses from "@/pages/admin/AdminCourses";
import AdminProfile from "@/pages/admin/AdminProfile";
import AdminSettings from "@/pages/admin/AdminSettings";
import ManageClasses from "@/pages/admin/ManageClasses";
import ManageCourses from "@/pages/admin/ManageCourses";
import ManageSubjects from "@/pages/admin/ManageSubjects";
import ManageChapters from "@/pages/admin/ManageChapters";
import ManageSchools from "@/pages/admin/ManageSchools";
import ManageSchoolAdmins from "@/pages/admin/ManageSchoolAdmins";
import ManageStudents from "@/pages/admin/ManageStudents";

import InstructorDashboard from "@/pages/instructor/InstructorDashboard";
import InstructorCourses from "@/pages/instructor/InstructorCourses";
import InstructorStudents from "@/pages/instructor/InstructorStudents";
import { InstructorClasses, InstructorCoursesView, InstructorSubjects, InstructorChapters } from "@/pages/instructor/InstructorViewOnly";
import { InstructorQuizzes, InstructorQuizResults, InstructorResults } from "@/pages/instructor/InstructorAssessments";

import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentCourses from "@/pages/student/StudentCourses";
import StudentSiteLayout from "@/components/layout/StudentSiteLayout";
import StudentHome from "@/pages/student-site/StudentHome";
import StudentClassroom, { SubjectList, ChapterViewer } from "@/pages/student-site/StudentClassroom";
import StudentSubscription from "@/pages/student-site/StudentSubscription";
import StudentShop from "@/pages/student-site/StudentShop";
import StudentOrders from "@/pages/student-site/StudentOrders";
import StudentFunHub from "@/pages/student-site/StudentFunHub";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

function AppRouter() {
  const location = useLocation();
  // CRITICAL: process OAuth callback before routing to avoid race conditions
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginSelection />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute allow={["admin"]}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="courses" element={<ManageCourses />} />
        <Route path="courses/legacy" element={<AdminCourses />} />
        <Route path="classes" element={<ManageClasses />} />
        <Route path="subjects" element={<ManageSubjects />} />
        <Route path="chapters" element={<ManageChapters />} />
        <Route path="schools" element={<ManageSchools />} />
        <Route path="school-admins" element={<ManageSchoolAdmins />} />
        <Route path="students" element={<ManageStudents />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="classes" element={<ManageClasses />} />
        <Route path="quiz" element={<PlaceholderPage eyebrow="Resources" title="Quizzes" subtitle="Author graded assessments and auto-mark." bullets={["MCQ, short answer, code","Timed mode","Plagiarism flags"]} />} />
        <Route path="plans" element={<PlaceholderPage eyebrow="Store" title="Plans & Subscriptions" subtitle="Configure pricing tiers, trials and coupons." />} />
        <Route path="products" element={<PlaceholderPage eyebrow="Store" title="Products" subtitle="Physical kits, bundles, merchandise." />} />
        <Route path="payments" element={<PlaceholderPage eyebrow="Store" title="Payments" subtitle="Payouts, refunds, and reconciliation." />} />
        <Route path="orders" element={<PlaceholderPage eyebrow="Store" title="Orders" subtitle="Track every checkout and fulfillment." />} />
        <Route path="analytics" element={<PlaceholderPage eyebrow="Analytics" title="Platform analytics" subtitle="Revenue, growth, cohort retention." />} />
        <Route path="notifications" element={<PlaceholderPage eyebrow="Communication" title="Notifications" subtitle="In-app announcements and alerts." />} />
        <Route path="emails" element={<PlaceholderPage eyebrow="Communication" title="Emails" subtitle="Design and schedule marketing & transactional emails." />} />
        <Route path="announcements" element={<PlaceholderPage eyebrow="Communication" title="Announcements" subtitle="Broadcast to instructors or students." />} />
        <Route path="support" element={<PlaceholderPage eyebrow="Support" title="Support center" subtitle="Help content, feedback and tickets." />} />
      </Route>

      {/* Instructor */}
      <Route path="/instructor" element={<ProtectedRoute allow={["instructor", "admin"]}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/instructor/dashboard" replace />} />
        <Route path="dashboard" element={<InstructorDashboard />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="students" element={<InstructorStudents />} />
        <Route path="classes" element={<InstructorClasses />} />
        <Route path="courses" element={<InstructorCoursesView />} />
        <Route path="courses/legacy" element={<InstructorCourses />} />
        <Route path="subjects" element={<InstructorSubjects />} />
        <Route path="chapters" element={<InstructorChapters />} />
        <Route path="quizzes" element={<InstructorQuizzes />} />
        <Route path="quiz-results" element={<InstructorQuizResults />} />
        <Route path="results" element={<InstructorResults />} />
        <Route path="assignments" element={<PlaceholderPage eyebrow="Grading" title="Assignments" subtitle="Create, grade and give feedback." />} />
        <Route path="live" element={<PlaceholderPage eyebrow="Live" title="Live classes" subtitle="Host and schedule live sessions." />} />
        <Route path="analytics" element={<PlaceholderPage eyebrow="Insight" title="Analytics" subtitle="Performance trends across your courses." />} />
        <Route path="announcements" element={<PlaceholderPage eyebrow="Broadcast" title="Announcements" subtitle="Talk to all students at once." />} />
        <Route path="settings" element={<PlaceholderPage eyebrow="You" title="Instructor settings" subtitle="Profile, payouts and notifications." />} />
      </Route>

      {/* Student site — new color-rich layout */}
      <Route path="/student" element={<ProtectedRoute allow={["student", "admin"]}><StudentSiteLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentHome />} />
        <Route path="classroom" element={<StudentClassroom />} />
        <Route path="classroom/:courseId" element={<SubjectList />} />
        <Route path="classroom/:courseId/subjects/:subjectId" element={<ChapterViewer />} />
        <Route path="subscription" element={<StudentSubscription />} />
        <Route path="shop" element={<StudentShop />} />
        <Route path="order" element={<StudentOrders />} />
        <Route path="fun-hub" element={<StudentFunHub />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      {/* Legacy student gamified dashboard (kept for compatibility) */}
      <Route path="/student/legacy" element={<ProtectedRoute allow={["student", "admin"]}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="courses" element={<StudentCourses />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "rgba(11,17,32,0.95)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" } }} />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

