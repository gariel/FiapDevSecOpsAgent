import fs from "fs";
import { execSync } from "child_process";
import { Octokit } from "@octokit/rest";

/**
 * AI Code Scanner - GitHub Actions Pipeline Script
 * Created by Grupo Kilo (Fiap DevSecOps Agent)
 */

async function run() {
  const API_URL = process.env.KILO_SCANNER_API_URL;
  const API_KEY = process.env.KILO_SCANNER_API_KEY;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const prNumber = process.env.GITHUB_EVENT_PATH ? 
    JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).number : null;

  if (!API_URL || !API_KEY) {
    console.error("❌ KILO_SCANNER_API_URL or KILO_SCANNER_API_KEY not configured.");
    process.exit(1);
  }

  console.log("🚀 Starting AI Security Scan...");

  // Get Diff
  let diff = "";
  try {
    // For PRs, compare with the base branch
    const baseRef = process.env.GITHUB_BASE_REF || "main";
    diff = execSync(`git diff origin/${baseRef}...HEAD`).toString();
  } catch (e) {
    console.warn("⚠️ Failed to get diff via git. Falling back to simple diff.");
    diff = execSync("git diff HEAD~1 HEAD").toString();
  }

  const commitInfo = execSync("git rev-parse HEAD").toString().trim();
  const author = execSync("git log -1 --pretty=format:'%an'").toString().trim();
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;

  try {
    const response = await fetch(`${API_URL}/api/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({
        diff,
        author,
        commitInfo,
        owner,
        repo,
        branch
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${errorText}`);
    }

    const result = await response.json();
    const { findings, blocking, scanId } = result;

    console.log(`✅ Scan completed. Scan ID: ${scanId}`);
    console.log(`📊 Found ${findings.length} issues.`);

    if (GITHUB_TOKEN && prNumber) {
      const octokit = new Octokit({ auth: GITHUB_TOKEN });
      
      let commentBody = `### 🛡️ Kilo DevSecOps AI Scan Results\n\n`;
      commentBody += `**Execution ID:** [${scanId}](${API_URL}/scans/${scanId})\n`;
      
      if (findings.length === 0) {
        commentBody += `✅ **No vulnerabilities found.** Great job!\n`;
      } else {
        commentBody += `⚠️ **Found ${findings.length} total findings.**\n\n`;
        
        const severityIcons = { Critical: "🔴", High: "🟠", Medium: "🟡", Low: "🔵" };
        
        findings.forEach(f => {
          commentBody += `- ${severityIcons[f.severity] || "⚪"} **${f.severity}**: \`${f.filePath}\` - ${f.description}\n`;
        });

        if (blocking) {
          commentBody += `\n❌ **BLOCKING:** High or Critical vulnerabilities detected. Fix them to merge this PR.\n`;
        }
      }

      commentBody += `\n---\n`;
      commentBody += `#### 🏛️ About this Scan\n`;
      commentBody += `**Fiap - DevSecOps Agent - Challenge Zup**\n`;
      commentBody += `*Grupo Kilo*\n`;
      commentBody += `- Gabriel Sant Ana Pereira – RM559796\n`;
      commentBody += `- Leonardo Santos de Oliveira – RM560288\n`;
      commentBody += `- Leonardo Schroder – RM558796\n`;
      commentBody += `- Eduardo Servilieri – RM560717\n`;
      commentBody += `- Rodrigo Olivato Ribeiro – RM559534\n`;

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
    }

    if (blocking) {
      console.error("❌ High/Critical vulnerabilities found. Failing the pipeline.");
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Pipeline Scan Failed:", error.message);
    process.exit(1);
  }
}

run();
