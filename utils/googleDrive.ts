import { google } from "googleapis";
import { ProductData } from "@/app/types/products";

const drive = google.drive({
  version: "v3",
  auth: new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  }),
});

export const fetchProductDataFromDrive = async (fileId: string): Promise<ProductData> => {
  try {
    const response = await drive.files.get({
      fileId,
      alt: "media",
    });

    // Ensure the response contains the expected product fields
    const productData = response.data as ProductData;
    return productData;
  } catch (error) {
    console.error("Error fetching file from Google Drive:", error);
    throw new Error("Failed to fetch product data.");
  }
};
