import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const f = createUploadthing();

export const ourFileRouter = {
  documentUploader: f({ 
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "16MB", maxFileCount: 5 }
  })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session?.user) throw new UploadThingError("Unauthorized");
      
      const tenantId = (session.user as { tenantId: string }).tenantId;
      if (!tenantId) throw new UploadThingError("No tenant profile");

      return { userId: (session.user as { id: string }).id, tenantId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
