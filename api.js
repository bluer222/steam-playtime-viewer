/**
 * Vercel Serverless Function Handler
 * This function will be accessible at the /api/steam-proxy endpoint.
 * * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
export default async function handler(req, res) {
    // 1. SECURELY ACCESS THE KEY
    // The STEAM_API_KEY must be set in your Vercel project's Environment Variables.
    const STEAM_API_KEY = process.env.STEAM_API_KEY;

    if (!STEAM_API_KEY) {
        // Return an error if the key isn't set (prevents unauthorized access)
        return res.status(500).json({
            error: "Server configuration error. API key is missing.",
        });
    }

    // 2. EXTRACT PARAMETER FROM CLIENT REQUEST (e.g., ?steamid=...)
    const steamUsername = req.query.user;
    let steamId = null;

    if (isNaN(steamUsername)) {
        //it is probably the username
        //fetch the steamid from the username
        const vanityUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${steamUsername}`;
        steamId = await callSteamApi(vanityUrl).steamid;
    } else {
        //it is probably the steamid
        steamId = steamUsername;
    }


    if (!steamId) {
        return res.status(400).json({ error: "Missing 'steamid' query parameter." });
    }

    // 3. CONSTRUCT THE REAL STEAM API URL
    // We use the key here on the secure server.
    const steamApiUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamids=${steamId}&include_played_free_games=true&include_appinfo=true&format=json`;
    try {
        const data = await callSteamApi(steamApiUrl);
        res.status(200).json({
            success: true,
            data: data // Extract the player object
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to fetch data from Steam API."
        });
    }
}

async function callSteamApi(url) {
    try {
        const steamResponse = await fetch(url);
        const data = await steamResponse.json();
        if (!steamResponse.ok) {
            throw new Error("Steam API request failed");
        }
        return data.response;
    } catch (error) {
        console.error("Error calling Steam API:", error);
        throw error;
    }
}