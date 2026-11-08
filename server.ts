import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware for parsing JSON and text
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'TULJAI PHATAKA Billing Server',
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Test Supabase Connection & Table Check
  app.post('/api/supabase/test-connection', async (req, res) => {
    try {
      const { url, anonKey, projectId } = req.body;
      const targetUrl = (url || 'https://qmkhqxgmfjuidgxqcznw.supabase.co').trim();
      const targetKey = (anonKey || 'sb_publishable_Zq3Q0ppOizmxF_mVJVfNgw_mnJynokf').trim();
      const targetProject = (projectId || 'qmkhqxgmfjuidgxqcznw').trim();

      const client = createClient(targetUrl, targetKey);
      const { data: _data, error } = await client.from('bills').select('bill_no').limit(1);

      if (!error) {
        return res.json({
          success: true,
          tablesExist: true,
          message: `Connected! Supabase project '${targetProject}' is online and 'bills' table is verified.`,
        });
      }

      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return res.json({
          success: true,
          tablesExist: false,
          message: `Connected to Supabase project '${targetProject}', but the 'bills' table is not created yet. Please execute the provided SQL setup script in your Supabase SQL Editor.`,
          error: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        tablesExist: false,
        message: `Supabase query error (${error.code || 'UNKNOWN'}): ${error.message}`,
        error: error.message,
      });
    } catch (err: any) {
      console.error('Server Supabase test error:', err);
      return res.status(500).json({
        success: false,
        tablesExist: false,
        message: err?.message || 'Internal server error checking Supabase connection',
      });
    }
  });

  // API Route: Store bill and items into Supabase backend tables
  app.post('/api/supabase/sync-bill', async (req, res) => {
    try {
      const { config, bill, items } = req.body;
      if (!bill || !bill.bill_no) {
        return res.status(400).json({
          success: false,
          message: 'Valid bill data is required',
        });
      }

      const targetUrl = (config?.url || 'https://qmkhqxgmfjuidgxqcznw.supabase.co').trim();
      const targetKey = (config?.anonKey || 'sb_publishable_Zq3Q0ppOizmxF_mVJVfNgw_mnJynokf').trim();

      const client = createClient(targetUrl, targetKey);

      // 1. Upsert bill in 'bills' table
      const { error: billError } = await client
        .from('bills')
        .upsert(bill, { onConflict: 'bill_no' });

      if (billError) {
        if (billError.code === 'PGRST205' || billError.message?.includes('schema cache')) {
          return res.status(400).json({
            success: false,
            tablesMissing: true,
            message: `Supabase 'bills' table not found. Please run the SQL schema in your Supabase SQL Editor.`,
            error: billError.message,
          });
        }

        return res.status(400).json({
          success: false,
          message: `Supabase bills table error: ${billError.message}`,
          error: billError.message,
        });
      }

      // 2. Insert line items in 'bill_items' table
      if (items && Array.isArray(items) && items.length > 0) {
        try {
          await client.from('bill_items').delete().eq('bill_no', bill.bill_no);
        } catch {
          // ignore
        }

        const { error: itemsError } = await client
          .from('bill_items')
          .insert(items);

        if (itemsError) {
          console.warn('Server Supabase bill_items insert error:', itemsError);
        }
      }

      return res.json({
        success: true,
        message: `Bill ${bill.bill_no} successfully saved to Supabase backend tables`,
        billNo: bill.bill_no,
      });
    } catch (err: any) {
      console.error('Server Supabase sync-bill error:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Server error syncing bill to Supabase',
      });
    }
  });


  // API Route: Test GET connection to Google Apps Script
  app.post('/api/test-sync', async (req, res) => {
    try {
      const { scriptUrl } = req.body;
      if (!scriptUrl || typeof scriptUrl !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Google Apps Script URL is required',
        });
      }

      const cleanUrl = scriptUrl.trim();
      const separator = cleanUrl.includes('?') ? '&' : '?';
      const testUrl = `${cleanUrl}${separator}format=json&t=${Date.now()}`;

      const response = await fetch(testUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      const responseText = await response.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Plain text response
      }

      if (response.ok) {
        return res.json({
          status: 'success',
          httpStatus: response.status,
          message: responseJson?.message || responseText || 'Connected to Google Apps Script',
        });
      } else {
        return res.status(response.status).json({
          status: 'error',
          httpStatus: response.status,
          message: `HTTP ${response.status}: ${responseText || response.statusText}`,
        });
      }
    } catch (err: any) {
      console.error('Test connection error:', err);
      return res.status(500).json({
        status: 'error',
        message: err?.message || 'Failed to reach Google Apps Script URL',
      });
    }
  });

  // API Route: Proxy Google Sheet bill sync (eliminates browser CORS & 302 redirect blocking)
  app.post('/api/sync-bill', async (req, res) => {
    try {
      const { scriptUrl, payload } = req.body;
      if (!scriptUrl || typeof scriptUrl !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Google Apps Script URL is required',
        });
      }

      if (!payload || !payload.billNo) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid bill payload is required',
        });
      }

      const cleanUrl = scriptUrl.trim();

      // Forward request to Google Apps Script using server-side fetch with follow redirects
      const scriptResponse = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const responseText = await scriptResponse.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Non-JSON response
      }

      // Check if Google Apps Script returned a JSON error
      if (responseJson && responseJson.status === 'error') {
        return res.status(400).json({
          status: 'error',
          message: responseJson.message || 'Google Apps Script returned an error',
          details: responseText,
        });
      }

      if (scriptResponse.ok) {
        return res.json({
          status: 'success',
          message: responseJson?.message || 'Bill recorded successfully in Google Sheet',
          isDuplicate: Boolean(responseJson?.isDuplicate),
          billNo: responseJson?.billNo || payload.billNo,
          details: responseJson || responseText,
        });
      } else {
        return res.status(scriptResponse.status).json({
          status: 'error',
          message: `Google Apps Script returned HTTP ${scriptResponse.status}`,
          details: responseText,
        });
      }
    } catch (err: any) {
      console.error('Server sync-bill error:', err);
      return res.status(500).json({
        status: 'error',
        message: err?.message || 'Server error proxying bill to Google Apps Script',
      });
    }
  });

  // Dev mode: Mount Vite middlewares for SPA
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TULJAI PHATAKA Billing Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
