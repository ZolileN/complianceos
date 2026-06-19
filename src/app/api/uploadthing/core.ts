import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

export const ourFileRouter = {
  documentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user) throw new UploadThingError("Unauthorized");

      const user = session.user as { id: string; tenantId: string };
      if (!user.tenantId) throw new UploadThingError("No tenant profile");

      // Read clientId and category from custom request header set by the dropzone
      const clientId = req.headers.get("x-client-id") ?? "";
      const category = req.headers.get("x-category") ?? "other";

      return {
        userId: user.id,
        tenantId: user.tenantId,
        clientId,
        category,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId, "file:", file.name);

      try {
        const fileUrl =
          (file as unknown as { ufsUrl?: string }).ufsUrl ??
          (file as unknown as { url?: string }).url ??
          "";

        const document = await prisma.document.create({
          data: {
            tenantId: metadata.tenantId,
            clientId: metadata.clientId,
            name: file.name,
            filePath: fileUrl,
            fileType: file.type,
            category: metadata.category,
            fileSize: BigInt(Math.round(file.size)),
            uploadedById: metadata.userId,
          },
        });

        // Compliance automation
        const complianceMapping: Record<string, { cat: string; name: string }> = {
          vat_certificate: { cat: "SARS", name: "VAT" },
          bee_certificate: { cat: "BEE", name: "Certificate Expiry" },
          tax_certificate: { cat: "SARS", name: "Income Tax" },
          cor_document: { cat: "CIPC", name: "Annual Returns" },
        };

        const match = complianceMapping[metadata.category];
        if (match) {
          const itemToUpdate = await prisma.complianceItem.findFirst({
            where: {
              tenantId: metadata.tenantId,
              clientId: metadata.clientId,
              category: match.cat,
              name: match.name,
              status: { in: ["action_required", "critical"] },
            },
          });

          if (itemToUpdate) {
            await prisma.complianceItem.update({
              where: { id: itemToUpdate.id },
              data: {
                status: "compliant",
                lastChecked: new Date(),
                notes:
                  (itemToUpdate.notes ? itemToUpdate.notes + "\n\n" : "") +
                  `Status automatically updated via document upload: ${document.name}`,
              },
            });
          }
        }

        return { documentId: document.id, success: true };
      } catch (err) {
        console.error("DB registration failed in onUploadComplete:", err);
        return { success: false, documentId: "" };
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
