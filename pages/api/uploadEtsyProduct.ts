import { NextApiRequest, NextApiResponse } from "next";

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid authorization header." });
        }
        const etsyAccessToken = authHeader.replace("Bearer ", "").trim();
        const product = req.body;

        // Replace with actual Etsy API endpoint and logic
        const etsyApiUrl = "https://openapi.etsy.com/v3/application/listings";
        const etsyRes = await fetch(etsyApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${etsyAccessToken}`
            },
            body: product
        });

        if (!etsyRes.ok) {
            const error = await etsyRes.json().catch(() => ({}));
            return res.status(etsyRes.status).json({ error: error || "Failed to upload product to Etsy." });
        }
        const data = await etsyRes.json();
        return res.status(200).json(data);
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return res.status(500).json({ error: (error as any).message });
    }
}