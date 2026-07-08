"use client";

import { ReactNode } from "react";
import AppShell from "../AppShell";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
