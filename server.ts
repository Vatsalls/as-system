import express from 'express';
import path from 'path';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Lazy Initialization of the sheets auth client
  function getSheetsClient() {
    const credsStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credsStr) {
      throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
    }
    
    try {
      const credentials = JSON.parse(credsStr);
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      return google.sheets({ version: 'v4', auth });
    } catch (e: any) {
      throw new Error('Failed to parse service account JSON: ' + e.message);
    }
  }

  // Server-Side Sheets GET Proxy Endpoint
  app.get('/api/sheets/get', async (req, res) => {
    const { spreadsheetId, range } = req.query;
    if (!spreadsheetId || !range) {
      return res.status(400).json({ error: 'Missing spreadsheetId or range parameters' });
    }

    try {
      const sheets = getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId as string,
        range: range as string,
      });
      return res.json({ values: response.data.values || [] });
    } catch (error: any) {
      console.error('Proxy Fetch Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Server-Side Sheets APPEND Proxy Endpoint
  app.post('/api/sheets/append', async (req, res) => {
    const { spreadsheetId, range, values } = req.body;
    if (!spreadsheetId || !range || !values) {
      return res.status(400).json({ error: 'Missing required request body variables' });
    }

    try {
      const sheets = getSheetsClient();
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return res.json({ success: true, updatedRange: response.data.tableRange });
    } catch (error: any) {
      console.error('Proxy Write Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Mount Vite middleware so static files load correctly in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dynamic Sheet Proxy server running on port ${PORT}`);
  });
}

startServer();
