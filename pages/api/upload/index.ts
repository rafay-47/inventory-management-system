import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import formidable from "formidable";
import fs from "fs";
import { uploadImage, deleteImage } from "@/lib/supabaseStorage";
import { prisma } from "@/prisma/client";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function updateImageReference(
  type: string,
  entityId: string,
  imageUrl: string | null,
  userId: string
) {
  if (type === "product") {
    const product = await prisma.product.findUnique({ where: { id: entityId } });
    if (!product || product.userId !== userId) {
      throw new Error("Product not found");
    }
    await prisma.product.update({
      where: { id: entityId },
      data: { imageUrl },
    });
    return;
  }

  if (type === "variant") {
    const variant = await prisma.productVariant.findUnique({
      where: { id: entityId },
      include: { product: true },
    });
    if (!variant || variant.product.userId !== userId) {
      throw new Error("Variant not found");
    }
    await prisma.productVariant.update({
      where: { id: entityId },
      data: { imageUrl },
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method } = req;

  switch (method) {
    case "POST":
      try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);

        const file = files.file?.[0];
        if (!file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Read file
        const fileBuffer = fs.readFileSync(file.filepath);
        const arrayBuffer = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        ) as ArrayBuffer;
        const fileBlob = new Blob([arrayBuffer], { type: file.mimetype || 'image/jpeg' });
        const fileToUpload = new File([fileBlob], file.originalFilename || 'image.jpg', {
          type: file.mimetype || 'image/jpeg',
        });

        // Determine path based on type (product or variant)
        const type = (fields.type?.[0] as string) || 'product';
        const entityId = fields.entityId?.[0];
        const path = entityId ? `${type}s/${entityId}` : `${type}s`;

        // Upload to Supabase
        const imageUrl = await uploadImage(fileToUpload, 'product-images', path);

        // Clean up temp file
        fs.unlinkSync(file.filepath);

        // Persist image reference if entityId provided
        if (entityId) {
          try {
            await updateImageReference(type, entityId, imageUrl, session.id);
          } catch (err: any) {
            console.error("Error updating image reference:", err);
            return res.status(404).json({ error: err.message || "Entity not found" });
          }
        }

        res.status(200).json({ imageUrl });
      } catch (error: any) {
        console.error("Error uploading image:", error);
        res.status(500).json({ error: error.message || "Failed to upload image" });
      }
      break;

    case "DELETE":
      try {
        const { url, type = 'product', entityId } = req.query;

        if (!url || typeof url !== "string") {
          return res.status(400).json({ error: "Image URL is required" });
        }

        await deleteImage(url);

        if (entityId && typeof entityId === 'string') {
          try {
            await updateImageReference(
              typeof type === 'string' ? type : 'product',
              entityId,
              null,
              session.id
            );
          } catch (err: any) {
            console.error("Error clearing image reference:", err);
            return res.status(404).json({ error: err.message || "Entity not found" });
          }
        }

        res.status(200).json({ message: "Image deleted successfully" });
      } catch (error: any) {
        console.error("Error deleting image:", error);
        res.status(500).json({ error: error.message || "Failed to delete image" });
      }
      break;

    default:
      res.setHeader("Allow", ["POST", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
