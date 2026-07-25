import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { auth } from "./auth";

const f = createUploadthing();
export const utapi = new UTApi();

export const ourFileRouter = {
  ssmDocument: f({
    image: { maxFileSize: "4MB", maxFileCount: 1, acl: "private" },
    pdf: { maxFileSize: "4MB", maxFileCount: 1, acl: "private" },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        throw new Error("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, key: file.key };
    }),
  eventBanner: f({ image: { maxFileSize: "8MB", maxFileCount: 1, acl: "public-read" } })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session || !["ORGANIZER", "ADMIN", "DEVELOPER"].includes(session.user.role || "")) {
        throw new Error("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      url: file.ufsUrl,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
