import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";
import MotionEnhancer from "./components/MotionEnhancer.jsx";
import Loading from "./components/Loading.jsx";

const Home = lazy(() => import("./pages/public/home"));
const About = lazy(() => import("./pages/public/about"));
const Contact = lazy(() => import("./pages/public/Contact"));
const Services = lazy(() => import("./pages/public/Services"));
const AuthLanding = lazy(() => import("./pages/public/AuthLanding"));
const Team = lazy(() => import("./pages/public/Team"));
const Support = lazy(() => import("./pages/public/Support"));
const Privacy = lazy(() => import("./pages/public/Privacy"));
const Terms = lazy(() => import("./pages/public/Terms"));
const RedirectDashboard = lazy(() => import("./pages/RedirectDashboard"));
const PartnerList = lazy(() => import("./pages/customer/PartnerList.jsx"));
const CustomerLogin = lazy(() => import("./pages/customer/CustomerLogin"));
const CustomerSignup = lazy(() => import("./pages/customer/CustomerSignup"));
const CustomerDashboard = lazy(() => import("./pages/customer/CustomerDashboard"));
const PartnerLogin = lazy(() => import("./pages/partner/PartnerLogin"));
const PartnerSignup = lazy(() => import("./pages/partner/PartnerSignup"));
const PartnerDashboard = lazy(() => import("./pages/partner/PartnerDashboard"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminPartnerReview = lazy(() => import("./pages/admin/AdminPartnerReview.jsx"));
const NotFound = lazy(() => import("./pages/notFound"));

export default function App() {
  return (
    <>
      <Navbar />
      <MotionEnhancer />
      <Suspense fallback={<div className="container section-pad"><Loading /></div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/services" element={<Services />} />
        <Route path="/team" element={<Team />} />
        <Route path="/support" element={<Support />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/auth" element={<AuthLanding />} />

        <Route path="/auth/customer/login" element={<CustomerLogin />} />
        <Route path="/auth/customer/signup" element={<CustomerSignup />} />
        <Route path="/dashboard" element={<RedirectDashboard />} />
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute role="CUSTOMER">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners"
          element={
            <ProtectedRoute role="CUSTOMER">
              <PartnerList />
            </ProtectedRoute>
          }
        />

          <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/partners/:userId"
          element={
            <AdminProtectedRoute>
              <AdminPartnerReview />
            </AdminProtectedRoute>
          }
        />

        <Route path="/auth/partner/login" element={<PartnerLogin />} />
        <Route path="/auth/partner/signup" element={<PartnerSignup />} />
        <Route
          path="/partner/dashboard"
          element={
            <ProtectedRoute role="PARTNER">
              <PartnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <Footer />
    </>
  );
}
