import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";

const DB_FILE = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(process.cwd(), "database.json");

async function readDB() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return { scans: [] };
    }
    throw error;
  }
}

async function writeDB(data: any) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Global request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.originalUrl}`);
    next();
  });

  // Middleware to check API Key for scan trigger
  const apiKeyMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const providedKey = req.headers["x-api-key"];
    if (providedKey !== process.env.SCAN_API_KEY) {
      console.warn(`[${new Date().toISOString()}] Invalid Request: ${req.method} ${req.originalUrl} - Reason: Invalid or missing API Key (provided: ${providedKey || "none"})`);
      return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    }
    next();
  };

  // API Scan Trigger
  app.post("/api/scan", apiKeyMiddleware, async (req, res) => {
    const { diff, author, commitInfo, owner, repo, branch } = req.body;

    if (!diff || !owner || !repo || !branch) {
      console.warn(`[${new Date().toISOString()}] Invalid Request: ${req.method} ${req.originalUrl} - Reason: Missing required parameters (diff present: ${!!diff}, owner: ${owner}, repo: ${repo}, branch: ${branch})`);
      return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
      const prompt = `You are a DevSecOps Expert. Analyze the following code diff for security vulnerabilities.
      Focus on OWASP Top 10 and common security pitfalls (SQL Injection, XSS, Secret Exposure, Insecure Auth, etc.).

      CONTEXT:
      Owner: ${owner}
      Project: ${repo}
      Branch: ${branch}
      Author: ${author}
      Commit: ${commitInfo}

      CODE DIFF:
      ${diff}

      Provide your findings in JSON format according to the requested schema.
      Each finding must have a severity (Low, Medium, High, Critical).`;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    filePath: { type: Type.STRING },
                    lineNumber: { type: Type.INTEGER },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
                    category: { type: Type.STRING },
                  },
                  required: ["filePath", "description", "severity"],
                },
              },
            },
          },
        },
      });

      const result = JSON.parse(geminiResponse.text);
      const findings = result.findings || [];

      // Calculate counts
      const counts = findings.reduce((acc: any, f: any) => {
        acc[f.severity.toLowerCase()] = (acc[f.severity.toLowerCase()] || 0) + 1;
        return acc;
      }, { low: 0, medium: 0, high: 0, critical: 0 });

      // Save to JSON DB
      const scanId = uuidv4();

      const enrichedFindings = findings.map((finding: any) => ({
        ...finding,
        id: uuidv4(),
        scanId,
        githubUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${finding.filePath}${finding.lineNumber ? `#L${finding.lineNumber}` : ""}`
      }));

      const scanData = {
        id: scanId,
        owner,
        repo,
        branch,
        author: author || "Unknown",
        commitHash: commitInfo || "Unknown",
        timestamp: new Date().toISOString(),
        findingsCount: findings.length,
        criticalCount: counts.critical,
        highCount: counts.high,
        summary: {
          filesChanged: new Set(findings.map((f: any) => f.filePath)).size,
          riskScore: counts.critical > 0 || counts.high > 0 ? "High Risk" : "Stable",
        },
        findings: enrichedFindings,
      };

      const dbData = await readDB();
      dbData.scans.push(scanData);
      await writeDB(dbData);

      res.json({
        scanId,
        findings,
        summary: scanData.summary,
        blocking: counts.high > 0 || counts.critical > 0,
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Server Error: ${req.method} ${req.originalUrl} - Scan error:`, error);
      res.status(500).json({ error: "Failed to process scan" });
    }
  });

  // Data endpoints for the frontend
  app.get("/api/projects", async (req, res) => {
    try {
      const dbData = await readDB();
      const sortedScans = dbData.scans.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const projects: any[] = [];
      const seen = new Set();

      sortedScans.forEach((data: any) => {
        const key = `${data.owner}/${data.repo}`;
        if (!seen.has(key)) {
          projects.push({
            owner: data.owner,
            repo: data.repo,
          });
          seen.add(key);
        }
      });
      res.json(projects.slice(0, 100));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Server Error: ${req.method} ${req.originalUrl} -`, error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:owner/:repo", async (req, res) => {
    const { owner, repo } = req.params;
    try {
      const dbData = await readDB();
      const scans = dbData.scans
        .filter((scan: any) => scan.owner === owner && scan.repo === repo)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const scansWithoutFindings = scans.map((scan: any) => {
        const { findings, ...rest } = scan;
        return rest;
      });

      res.json(scansWithoutFindings);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Server Error: ${req.method} ${req.originalUrl} -`, error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  app.get("/api/projects/:owner/:repo/:branch", async (req, res) => {
    const { owner, repo, branch } = req.params;
    try {
      const dbData = await readDB();
      const scans = dbData.scans
        .filter((scan: any) => scan.owner === owner && scan.repo === repo && scan.branch === branch)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const scansWithoutFindings = scans.map((scan: any) => {
        const { findings, ...rest } = scan;
        return rest;
      });

      res.json(scansWithoutFindings);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Server Error: ${req.method} ${req.originalUrl} -`, error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  app.get("/api/scans/:scanId", async (req, res) => {
    const { scanId } = req.params;
    try {
      const dbData = await readDB();
      const scan = dbData.scans.find((s: any) => s.id === scanId);
      if (!scan) {
        console.warn(`[${new Date().toISOString()}] Invalid Request: ${req.method} ${req.originalUrl} - Reason: Scan not found (id: ${scanId})`);
        return res.status(404).json({ error: "Scan not found" });
      }

      res.json(scan);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Server Error: ${req.method} ${req.originalUrl} -`, error);
      res.status(500).json({ error: "Failed to fetch scan details" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const dbData = await readDB();
      const sortedScans = dbData.scans
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

      const stats = sortedScans.map((data: any) => ({
        timestamp: data.timestamp,
        findingsCount: data.findingsCount || 0,
        criticalCount: data.criticalCount || 0,
        highCount: data.highCount || 0,
      }));
      res.json(stats);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Server Error: ${req.method} ${req.originalUrl} -`, error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Vite and Static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} - API KEY: ${process.env.SCAN_API_KEY}`);
  });
}

startServer();
