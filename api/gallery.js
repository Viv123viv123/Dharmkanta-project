// api/gallery.js — Vercel Serverless Function
// Proxies Cloudinary Admin API so credentials stay server-side

const CLOUD_NAME = 'ds8kpcnwh';
const API_KEY    = '588798746189524';
const API_SECRET = 'MK3MgiuOHF_dEp5qRDyjoTvzP3U';
const FOLDER     = 'dharmkanta-gallery';

export default async function handler(req, res) {
    // Allow CORS from your own site
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const action = req.query.action || (req.body && req.body.action);

    // ── LIST images in folder ─────────────────────────────────────────
    if (req.method === 'GET' && action === 'list') {
        try {
            const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
            const url  = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image?prefix=${FOLDER}/&max_results=500&type=upload`;
            const cldRes = await fetch(url, {
                headers: { Authorization: `Basic ${auth}` }
            });
            const data = await cldRes.json();
            const files = (data.resources || []).map(r => ({
                id:  r.public_id,
                url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_600/${r.public_id}`
            }));
            return res.status(200).json({ files });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ── DELETE image ──────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'delete') {
        try {
            const { public_id } = req.body;
            if (!public_id) return res.status(400).json({ error: 'public_id required' });

            const auth      = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
            const timestamp = Math.floor(Date.now() / 1000);
            // Generate signature
            const crypto    = await import('crypto');
            const sigStr    = `public_id=${public_id}&timestamp=${timestamp}${API_SECRET}`;
            const signature = crypto.createHash('sha256').update(sigStr).digest('hex');

            const formData  = new URLSearchParams();
            formData.append('public_id', public_id);
            formData.append('timestamp', timestamp);
            formData.append('api_key', API_KEY);
            formData.append('signature', signature);

            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
                method: 'POST',
                body: formData
            });
            const data = await cldRes.json();
            return res.status(200).json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(400).json({ error: 'Unknown action' });
}
