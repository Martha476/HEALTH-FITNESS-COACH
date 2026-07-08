"use client";

import { AuthProvider } from "../context/AuthContext";

export default function LayoutProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}