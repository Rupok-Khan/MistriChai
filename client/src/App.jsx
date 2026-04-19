import React from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import RedirectDashboard from "./pages/RedirectDashboard";
import PartnerList from "./pages/customer/PartnerList.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminPartnerReview from "./pages/admin/AdminPartnerReview.jsx";
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";

import Home from "./pages/public/home";
import About from "./pages/public/about";
import Contact from "./pages/public/Contact";
import Services from "./pages/public/Services";
import AuthLanding from "./pages/public/AuthLanding";
import Team from "./pages/public/Team";
import Support from "./pages/public/Support";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";

import CustomerLogin from "./pages/customer/CustomerLogin";
import CustomerSignup from "./pages/customer/CustomerSignup";
import CustomerDashboard from "./pages/customer/CustomerDashboard";

import PartnerLogin from "./pages/partner/PartnerLogin";
import PartnerSignup from "./pages/partner/PartnerSignup";
import PartnerDashboard from "./pages/partner/PartnerDashboard";

import NotFound from "./pages/notFound";

export default function App() {
  return (
    <>
      <Navbar />
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
      <Footer />
    </>
  );
}
