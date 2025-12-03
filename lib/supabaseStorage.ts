import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload an image to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket
 * @returns The public URL of the uploaded file
 */
export async function uploadImage(
  file: File,
  bucket: string = 'product-images',
  path?: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = path ? `${path}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Delete an image from Supabase Storage
 * @param url - The public URL of the image
 * @param bucket - The storage bucket name
 */
export async function deleteImage(
  url: string,
  bucket: string = 'product-images'
): Promise<void> {
  // Extract path from URL
  const urlParts = url.split(`/${bucket}/`);
  if (urlParts.length < 2) {
    throw new Error('Invalid image URL');
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    throw error;
  }
}

/**
 * Update an image (delete old, upload new)
 * @param file - The new file to upload
 * @param oldUrl - The URL of the old image to delete
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket for the new file
 * @returns The public URL of the new uploaded file
 */
export async function updateImage(
  file: File,
  oldUrl: string | null,
  bucket: string = 'product-images',
  path?: string
): Promise<string> {
  // Delete old image if exists
  if (oldUrl) {
    try {
      await deleteImage(oldUrl, bucket);
    } catch (error) {
      console.error('Error deleting old image:', error);
      // Continue with upload even if delete fails
    }
  }

  // Upload new image
  return uploadImage(file, bucket, path);
}
