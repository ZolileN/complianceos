import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComplianceOS — SA Compliance Operating System",
  description: "The Operating System for South African Compliance, Accounting & Advisory Firms. Manage clients, documents, workflows, and communications from one platform.",
  keywords: ["compliance", "south africa", "accounting", "tax", "SARS", "CIPC", "BEE", "workflow"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
