# Fiap - DevSecOps Agent - Challenge Zup

## Grupo Kilo

### Members
- **Gabriel Sant Ana Pereira** – RM559796
- **Leonardo Santos de Oliveira** – RM560288
- **Leonardo Schroder** – RM558796
- **Eduardo Servilieri** – RM560717
- **Rodrigo Olivato Ribeiro** – RM559534

---

## Project Overview
Kilo Agent is an AI-powered code scanner designed to be integrated into GitHub Actions pipelines. It analyzes code changes (diffs) using Gemini AI to identify security vulnerabilities, focusing on OWASP Top 10 and common pitfalls.

### Features
- **Web Dashboard:** Visualize security findings across projects and branches.
- **Pipeline Integration:** Automatically scan PRs and commits.
- **AI Analysis:** Leverages Gemini Flash for fast and accurate vulnerability detection.
- **Blocking PRs:** Prevents merging if High or Critical vulnerabilities are found.

## Setup

### Environment Variables
Configure the following in your environment or `.env` file:
- `GEMINI_API_KEY`: Your Google GenAI API Key.
- `SCAN_API_KEY`: A secret key for authenticating pipeline triggers.

### Running Locally
1. `npm install`
2. `npm run dev`

### Building for Production
`npm run build`

-----
some small change
