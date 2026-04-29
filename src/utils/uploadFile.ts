import fs from 'fs';
import path from 'path';

// Function to save any file (buffer) to local storage and return the URL path
export const uploadFile = async (fileBuffer: Buffer, originalName: string) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(originalName)}`;
    const filePath = path.join(uploadDir, fileName);

    // Write the buffer to the file system
    fs.writeFileSync(filePath, fileBuffer);

    // Return the relative URL path
    return `/uploads/${fileName}`;
  } catch (error: unknown) {
    console.error("Error uploading file locally:", (error as Error).message);
    throw error;
  }
};
