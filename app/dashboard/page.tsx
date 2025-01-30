"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { uploadProductFromDrive } from "@/utils/etsy";

export default function Dashboard() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string>("");

  const handleUpload = async () => {
    if (!(session as any)?.accessToken) {
      setStatus("You must be logged in.");
      return;
    }

    try {
      setStatus("Uploading...");
      const response = await uploadProductFromDrive((session as any).accessToken, fileId);
      setStatus(`Product uploaded! Listing ID: ${response.listing_id}`);
    } catch (error) {
      setStatus("Failed to upload product.");
    }
  };

  return (
    <div>
      <h1>Welcome to Dashboard</h1>
      {session ? (
        <>
          <p>Logged in as {session.user?.name}</p>
          <input
            type="text"
            placeholder="Enter Google Drive File ID"
            value={fileId}
            onChange={(e) => setFileId(e.target.value)}
          />
          <button onClick={handleUpload}>Upload Product from Google Drive</button>
          {status && <p>{status}</p>}
        </>
      ) : (
        <p>Please log in.</p>
      )}
    </div>
  );
}
