import { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { Product } from "@/app/types/products";
// import { ProductData } from "@/app/types/products";

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { sheetId, range, accessToken } = JSON.parse(req.body);
        if (!sheetId || !range || !accessToken) {
            return res.status(400).json({ error: "Missing required fields." });
        }
        const sheets = google.sheets("v4");
        const response = await sheets.spreadsheets.values.get({
            key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
            spreadsheetId: sheetId,
            range,
            auth: accessToken,
        });
        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            return res.status(400).json({ error: "No product data found in sheet." });
        }
        const headers: (keyof Product)[] = rows[0];
        const sheetData: Product[] = rows.slice(1).map(row => {
            const obj: Partial<Product> = {};
            headers.forEach((header, idx) => {
                obj[header] = row[idx];
            });
            if (!(obj.title && obj.price))
                return null;

            return {
                title: obj.title,
                description: obj.description,
                price: obj.price,
                quantity: obj.quantity,
                who_made: obj.who_made,
                when_made: obj.when_made,
                taxonomy_id: obj.taxonomy_id,
                is_digital: obj.is_digital
            } as Product;
        }).filter(product => product !== null);

        return res.status(200).json({ sheetData });
    } catch (error) {
        console.error("Error fetching product data from Google Sheet:", error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return res.status(500).json({ error: `${(error as any).response.statusText}: ${(error as any).message}` });
    }
}