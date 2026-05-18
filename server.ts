import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { v4 as uuidv4 } from "uuid";

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

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

  // Middleware to check API Key for scan trigger
  const apiKeyMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const providedKey = req.headers["x-api-key"];
    if (providedKey !== process.env.SCAN_API_KEY) {
      return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    }
    next();
  };

  // API Scan Trigger
  app.post("/api/scan", apiKeyMiddleware, async (req, res) => {
    const { diff, author, commitInfo, owner, repo, branch } = req.body;

    if (!diff || !owner || !repo || !branch) {
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

      // Save to Firestore
      const scanId = uuidv4();
      const scanData = {
        id: scanId,
        owner,
        repo,
        branch,
        author: author || "Unknown",
        commitHash: commitInfo || "Unknown",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        findingsCount: findings.length,
        criticalCount: counts.critical,
        highCount: counts.high,
        summary: {
          filesChanged: new Set(findings.map((f: any) => f.filePath)).size,
          riskScore: counts.critical > 0 || counts.high > 0 ? "High Risk" : "Stable",
        },
      };

      const batch = db.batch();
      const scanRef = db.collection("scans").doc(scanId);
      batch.set(scanRef, scanData);

      findings.forEach((finding: any) => {
        const findingId = uuidv4();
        const githubUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${finding.filePath}${finding.lineNumber ? `#L${finding.lineNumber}` : ""}`;
        const findingData = {
          ...finding,
          scanId,
          githubUrl,
        };
        batch.set(scanRef.collection("findings").doc(findingId), findingData);
      });

      await batch.commit();

      res.json({
        scanId,
        findings,
        summary: scanData.summary,
        blocking: counts.high > 0 || counts.critical > 0,
      });
    } catch (error) {
      console.error("Scan error:", error);
      res.status(500).json({ error: "Failed to process scan" });
    }
  });

  // Data endpoints for the frontend
  app.get("/api/projects", async (req, res) => {
    try {
      const snapshot = await db.collection("scans").orderBy("timestamp", "desc").limit(100).get();
      const projects: any[] = [];
      const seen = new Set();

      snapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.owner}/${data.repo}/${data.branch}`;
        if (!seen.has(key)) {
          projects.push({
            owner: data.owner,
            repo: data.repo,
            branch: data.branch,
          });
          seen.add(key);
        }
      });
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:owner/:repo/:branch", async (req, res) => {
    const { owner, repo, branch } = req.params;
    try {
      const snapshot = await db.collection("scans")
        .where("owner", "==", owner)
        .where("repo", "==", repo)
        .where("branch", "==", branch)
        .orderBy("timestamp", "desc")
        .get();

      const scans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(scans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  app.get("/api/scans/:scanId", async (req, res) => {
    const { scanId } = req.params;
    try {
      const scanDoc = await db.collection("scans").doc(scanId).get();
      if (!scanDoc.exists) return res.status(404).json({ error: "Scan not found" });

      const findingsSnapshot = await db.collection("scans").doc(scanId).collection("findings").get();
      const findings = findingsSnapshot.docs.map(doc => doc.data());

      res.json({
        ...scanDoc.data(),
        findings,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scan details" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const snapshot = await db.collection("scans").orderBy("timestamp", "desc").limit(50).get();
      const stats = snapshot.docs.map(doc => {
        const data = doc.data();
        let timestamp = new Date();
        if (data.timestamp && typeof data.timestamp.toDate === "function") {
          timestamp = data.timestamp.toDate();
        }
        return {
          timestamp,
          findingsCount: data.findingsCount || 0,
          criticalCount: data.criticalCount || 0,
          highCount: data.highCount || 0,
        };
      });
      res.json(stats);
    } catch (error) {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
