# ComplianceOS (PraxisOne)

ComplianceOS is a robust, multi-tenant B2B SaaS platform designed to streamline corporate compliance, document management, and workflow automation. Built with modern web technologies, it empowers consultancy firms to manage their clients' regulatory obligations efficiently while providing clients with a secure portal to track their compliance status.

## 🚀 Key Features

*   **Multi-Tenant Architecture:** Strict data isolation utilizing NextAuth and Prisma to ensure operations managers, consultants, and clients only access authorized data.
*   **Automated OCR Pipeline:** Server-side PDF text extraction automatically processes uploaded regulatory documents (like COR14.3 and Tax Certificates), updates client profiles, and resolves pending compliance alerts upon staff approval.
*   **SLA-Driven Workflows:** Customizable, multi-step workflow engines allow operations managers to define and track client onboarding and service processes against strict Service Level Agreements.
*   **Omnichannel Inbox:** Direct integration with the Meta Graph API allows consultants to send and receive WhatsApp messages directly from the platform without exposing personal numbers.
*   **Comprehensive Audit Trail:** An immutable ledger that tracks every significant state mutation (`CREATE`, `UPDATE`, `DELETE`) performed across the platform for full administrative transparency.

## 🛠 Tech Stack

*   **Framework:** Next.js 15+ (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (v4) with global CSS variables for a premium, glassmorphic theme.
*   **Database ORM:** Prisma (v5)
*   **Database Engine:** PostgreSQL (Supabase)
*   **Authentication:** NextAuth.js (v4) with credentials provider.
*   **File Storage:** UploadThing
*   **Document Processing:** pdf-parse

## 📂 Project Structure

*   `src/app/dashboard/*`: Contains all frontend views for the administrative application (e.g., clients, documents, compliance, workflows, inbox).
*   `src/app/api/*`: The serverless backend composed of Next.js Route Handlers.
*   `src/components/*`: Reusable UI components.
*   `src/lib/*`: Core utility functions, including the WhatsApp API integration (`whatsapp.ts`) and Audit Logger (`auditLogger.ts`).
*   `prisma/schema.prisma`: The central database schema defining all relations and models.

## ⚙️ Getting Started

### Prerequisites

Ensure you have the following installed:
*   Node.js (v20+)
*   npm or yarn

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```

2.  Set up your environment variables. You will need:
    *   `DATABASE_URL` (PostgreSQL connection string)
    *   `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
    *   `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID`
    *   `WHATSAPP_API_TOKEN` and related Meta Graph API keys.

3.  Generate the Prisma Client and push the schema to your database:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

4.  Start the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔒 Security & Roles

The platform enforces strict Role-Based Access Control (RBAC):
*   **Administrator & Operations Manager:** Full platform access and global visibility across the tenant.
*   **Consultant:** Restricted access; can only view and modify clients, tasks, and workflows explicitly assigned to them.
*   **Client:** Highly restricted; can only access their specific company profile and upload required compliance documentation.
