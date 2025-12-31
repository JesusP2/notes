import { env } from "cloudflare:workers";
import crypto from "node:crypto";
import { createUploadConfig } from "pushduck/server";
import { storage } from "./async-storage";

const { s3 } = createUploadConfig()
	.provider("cloudflareR2", {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		region: env.R2_REGION as "auto",
		endpoint: env.R2_ENDPOINT,
		bucket: env.R2_BUCKET,
		accountId: env.R2_ACCOUNT_ID,
	})
	.build();

export const uploadRouter = s3.createRouter({
	imageUpload: s3.image().maxFileSize("1MB"),
	documentUpload: s3
		.file()
		.maxFileSize("1MB")
		.middleware((options) => {
			const userId = storage.getStore();
			return {
				...options.metadata,
				userId: userId ?? "anonymous",
			};
		})
		.paths({
			prefix: "media",
			generateKey: ({ metadata, file }) => {
				const id = crypto.randomUUID();
				return `media/${metadata.userId}/${id}/${file.name}`;
			},
		})
		.onUploadError(({ error }) => {
			console.error("Failed to upload file:", error);
		}),
});

export type AppUploadRouter = typeof uploadRouter;
