"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import useDrivePicker from "react-google-drive-picker";
import etsyIcon from "../public/Etsy_E_Icon.svg";
import googleDriveIcon from "../public/Google_Drive_Icon.svg";
import { Product } from "./types/products";

const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center min-w-[320px] max-w-lg px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md bg-[#23232a]/80 border border-gray-700 gap-4 animate-fade-in">
            <div className="w-1.5 h-10 rounded-l-xl bg-gradient-to-b from-red-500 to-pink-500 mr-3 shadow-md"></div>
            <span className="flex-1 font-medium text-base text-gray-100 tracking-wide" style={{ fontFamily: 'Inter,Segoe UI,sans-serif' }}>{message}</span>
            <button onClick={onClose} aria-label="Close" className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="10" fill="#23232a" />
                    <path d="M7 7l6 6M13 7l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
};

const Spinner = () => (
    <svg className="animate-spin ml-2" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" />
        <path className="opacity-75" fill="#22c55e" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
);

const columns: {
    key: keyof Product;
    label: string;
    sticky?: boolean;
}[] = [{
    key: "title",
    label: "Title",
    sticky: true
}, {
    key: "description",
    label: "Description"
}, {
    key: "price",
    label: "Price"
}, {
    key: "quantity",
    label: "Quantity"
}, {
    key: "who_made",
    label: "Who Made"
}, {
    key: "when_made",
    label: "When Made"
}, {
    key: "taxonomy_id",
    label: "Taxonomy ID"
}, {
    key: "is_digital",
    label: "Is Digital"
}];

export default function Uploader() {
    const { data: session, update: updateSession, status } = useSession();
    const googleAccessToken = session?.google?.accessToken;
    const etsyAccessToken = session?.etsy?.accessToken || "etsyToken";
    const [openPicker] = useDrivePicker();
    const [sheetData, setSheetData] = useState<(Product & {
        status: 'not_listed' | 'listing' | 'listed' | 'listing_failed'
    })[]>([]);
    const [googleSignInInProgress, setGoogleSignInInProgress] = useState<boolean>(false);
    const [etsySignInInProgress, setEtsySignInInProgress] = useState<boolean>(false);
    const [sheetDataLoading, setSheetDataLoading] = useState<boolean>(false);
    const [listingInProgress, setListingInProgress] = useState<boolean>(false);
    const [toast, setToast] = useState<string>("");

    const sessionLoading = status === "loading";

    useEffect(() => {
        if (sessionLoading) return;
        if (!googleAccessToken) return;
        if (!session.google?.accessTokenExpires) return;

        const emptyGoogleSession = () => {
            updateSession({
                ...session,
                google: undefined
            });
        };
        const expiresIn = session.google.accessTokenExpires - Date.now();
        if (expiresIn < 0)
            return emptyGoogleSession();

        console.log(`Token expires in ${expiresIn / 60000}m`);
        const timeout = setTimeout(emptyGoogleSession, expiresIn);

        return () => clearTimeout(timeout);
    }, [sessionLoading, session, googleAccessToken, updateSession]);

    const openDrivePicker = () => {
        openPicker({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
            token: googleAccessToken,
            viewId: "SPREADSHEETS",
            viewMimeTypes: "application/vnd.google-apps.spreadsheet",
            supportDrives: true,
            callbackFunction(data) {
                if (data.action !== "picked") return;

                setSheetDataLoading(true);
                fetch("/api/fetchSheetData", {
                    method: "POST",
                    body: JSON.stringify({
                        sheetId: data.docs[0].id,
                        range: "Sheet1",
                        accessToken: googleAccessToken
                    })
                }).then(res => res.json())
                    .then(data => {
                        if (data.error)
                            setToast(data.error);
                        else
                            setSheetData((data.sheetData as Product[])
                                .map(product => ({ ...product, status: 'not_listed' }))
                            );

                        setSheetDataLoading(false);
                    });
            },
        });
    };

    const handleUploadToEtsy = async () => {
        if (!etsyAccessToken) return;
        if (!sheetData.length) return;

        setListingInProgress(true);
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${etsyAccessToken}`);

        setSheetData(sheetData.map(p => (p.status === 'listed'? p : {
            ...p,
            status: 'listing'
        })));
        const listedProducts = await Promise.all(sheetData.map(p => (
            p.status === 'listed'? p :
                fetch("/api/uploadEtsyProduct", {
                    method: "POST",
                    headers,
                    body: JSON.stringify(p)
                }).then(res => res.json())
                .then(data => {
                        if (data.error) {
                            setToast(data.error);
                            return {
                                ...p,
                                status: 'listing_failed'
                            };
                        } else {
                            return {
                                ...p,
                                status: 'listed'
                            };
                        }
                    }
                )
                // new Promise(resolve => {
                //     setTimeout(() => {
                //         resolve({
                //             ...p,
                //             status: 'listed'
                //         });
                //     }, 1000);
                // })
        )));

        setSheetData(listedProducts as typeof sheetData);
        setListingInProgress(false);
    };

    const googleButtonLoading = sessionLoading || googleSignInInProgress || sheetDataLoading;
    const googleButtonDisabled = etsySignInInProgress || listingInProgress;
    const etsyButtonLoading = sessionLoading || etsySignInInProgress || listingInProgress;
    const etsyButtonDisabled = googleSignInInProgress || sheetDataLoading;

    return (
        <div className="h-full px-8 py-6 flex flex-col gap-4">
            {toast && <Toast message={toast} onClose={() => setToast("")} />}
            <div className="flex justify-between items-center">
                <h1
                    className="text-3xl font-bold bg-gradient-to-r from-gray-600 via-zinc-500 to-stone-500 bg-clip-text text-transparent"
                    style={{ letterSpacing: '0.03em' }}
                >
                    Etsy Lister
                </h1>
                <button
                    onClick={(googleButtonLoading || googleButtonDisabled) ? undefined :
                        googleAccessToken ? openDrivePicker :
                            async () => {
                                setGoogleSignInInProgress(true);
                                await signIn("google")
                            }
                    }
                    disabled={(googleButtonDisabled)}
                    className={`
                        flex items-center w-72 px-4 py-2
                        rounded-xl border border-gray-700 shadow-sm
                        transition-colors bg-[#26272b] disabled:bg-zinc-900
                        ${(googleButtonLoading || googleButtonDisabled) ? 'cursor-default' : 'hover:bg-[#31323a]'}
                        text-md text-gray-100 text-left disabled:opacity-50
                    `.trim()}
                >
                    <Image src={googleDriveIcon} alt="Google Drive" width={20} className="mr-3 h-auto" />
                    <span className="flex-1">
                        {googleAccessToken ? "Select from Google Drive" : "Connect to Google Drive"}
                    </span>
                    {googleButtonLoading && <Spinner />}
                </button>
            </div>
            <div className="overflow-auto thin-scrollbar rounded-lg border border-gray-700">
                <table className="w-full text-sm text-gray-200">
                    <thead className="sticky top-0 z-[1]">
                        <tr>
                            <th className="p-4 bg-[#23232a] whitespace-nowrap">Sr. No.</th>
                            {columns.map(c =>
                                <th key={c.key}
                                    className={`p-4 bg-[#23232a] whitespace-nowrap text-left ${c.sticky ? 'sticky left-0' : ''}`}>
                                    {c.label}
                                </th>
                            )}
                            <th className="p-4 bg-[#23232a] sticky right-0">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sheetData.length ? sheetData.map((row, i) => (
                            <tr key={i}>
                                <td className="p-4 bg-[#18181b] even:bg-[#1c1c21]">
                                    {i + 1}
                                </td>
                                {columns.map(c =>
                                    <td key={c.key}
                                        className={`p-4 bg-[#18181b] even:bg-[#1c1c21] whitespace-nowrap ${c.sticky ? 'sticky left-0' : ''}`}>
                                        {row[c.key]}
                                    </td>
                                )}
                                <td className={`p-4 bg-[#18181b] even:bg-[#1c1c21] sticky right-0
                                    ${row.status === 'listed'? 'text-green-500' :
                                        row.status === 'listing_failed'? 'text-red-500' :
                                        'text-gray-400'
                                    }`}>
                                    {row.status === 'listed' ? 'Listed' :
                                        row.status === 'listing_failed'? 'Listing failed' :
                                        row.status === 'listing'? <Spinner /> : 'Not listed'
                                    }
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length + 2}>
                                    <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                                        <svg className="w-24 h-24 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M8.5 10H15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M8.5 14H15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M8.5 18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                        <p className="text-lg font-medium">No data selected</p>
                                        <p className="text-sm opacity-75">Select a spreadsheet to view your product listings</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="sticky left-0 bottom-0 w-full bg-[#23232a] px-3 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <button className="px-3 py-2 rounded-lg border border-gray-700" onClick={() => signOut()}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block mr-2" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                            </svg>
                            Sign out
                        </button>
                        <button className="px-3 py-2 rounded-lg border border-gray-700" onClick={() => setSheetData(prev => prev.filter(item => item.status !== "listed"))}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="inline-block mr-2" width="20" height="20" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l8 8M6 14L14 6" />
                            </svg>
                            Clear listed
                        </button>
                    </div>
                    <button
                        onClick={(etsyButtonLoading || etsyButtonDisabled) ? undefined :
                            etsyAccessToken ? handleUploadToEtsy :
                                async () => {
                                    setEtsySignInInProgress(true);
                                    await signIn("etsy");
                                }
                        }
                        disabled={etsyButtonDisabled}
                        className={`
                            flex items-center w-72 px-4 py-2
                            rounded-xl border border-gray-700
                            disabled:bg-zinc-900 disabled:opacity-50
                            ${(etsyButtonLoading || etsyButtonDisabled) ? 'cursor-default' : 'hover:bg-[#31323a]'}
                            text-md text-gray-100 text-left
                        `.trim()}
                    >
                        <Image src={etsyIcon} alt="Etsy" width={16} className="mr-3 h-auto" />
                        <span className="flex-1">
                            {etsyAccessToken ? "Upload to Etsy" : "Sign in to Etsy"}
                        </span>
                        {etsyButtonLoading && <Spinner />}
                    </button>
                </div>
            </div>
        </div>
    );
};
