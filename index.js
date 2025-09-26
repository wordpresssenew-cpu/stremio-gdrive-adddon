const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

// Load env variables
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
const folderId = process.env.FOLDER_ID;
const apiKey = process.env.API_KEY;

// Google Drive auth
const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

// Manifest
const manifest = {
    id: "org.stremio.gdrive",
    version: "1.0.0",
    name: "Google Drive (Service Account)",
    description: "Stream videos directly from Google Drive using Service Account",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [{ id: "gdrive", type: "movie", name: "Google Drive Movies" }]
};

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ type, id }) => {
    if (id !== "gdrive") return { metas: [] };

    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'video/'`,
        fields: "files(id, name)"
    });

    const metas = res.data.files.map((f) => ({
        id: f.id,
        type: "movie",
        name: f.name,
        poster: "https://i.imgur.com/NLO1b8h.png"
    }));

    return { metas };
});

// Stream handler
builder.defineStreamHandler(async ({ id }) => {
    return {
        streams: [
            {
                url: `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`,
                title: "Google Drive"
            }
        ]
    };
});

// Build addon interface
const addonInterface = builder.getInterface();

// Express server
const app = express();
app.use(cors());

// ✅ Mount addon interface directly
app.use("/", addonInterface);

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Addon running at http://localhost:${PORT}`);
});
