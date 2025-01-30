"use server"
import axios from "axios";
import { fetchProductDataFromDrive } from "./googleDrive";
import { ProductData } from "@/app/types/products";

export const uploadProductFromDrive = async (accessToken: string, fileId: string) => {
  try {
    const productData: ProductData = await fetchProductDataFromDrive(fileId);

    const { title, description, price, quantity, taxonomy_id, shipping_profile_id } = productData;

    const shopId = process.env.ETSY_SHOP_ID;
    const response = await axios.post(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings`,
      {
        title,
        description,
        price,
        quantity,
        who_made: "i_did",
        is_supply: false,
        when_made: "made_to_order",
        taxonomy_id,
        shipping_profile_id,
        should_auto_renew: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "x-api-key": process.env.ETSY_CLIENT_ID,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error uploading product:", error.response?.data || error);
    throw new Error("Failed to create Etsy listing.");
  }
};
