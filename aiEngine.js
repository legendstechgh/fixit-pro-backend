import axios from "axios";

async function runAIAnalysis(device, symptom, ruleResult) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return {
                improvedDiagnosis: "AI analysis unavailable (no API key configured yet).",
                extraAdvice: "Using offline diagnosis engine.",
                riskLevel: "Low"
            };
        }

        const prompt = `
You are an expert repair AI.

Device: ${device}
Problem: ${symptom}

Existing diagnosis:
${JSON.stringify(ruleResult, null, 2)}

Return ONLY valid JSON:
{
  "improvedDiagnosis": "",
  "extraAdvice": "",
  "riskLevel": "Low"
}
`;

        const response = await axios.post(
            "https://api.anthropic.com/v1/messages",
            {
                model: "claude-3-haiku-20240307",
                max_tokens: 300,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01"
                }
            }
        );

        const text = response.data.content[0].text;

        return JSON.parse(text);

    } catch (err) {
        console.error("❌ AI ERROR:", err.message);

        return {
            improvedDiagnosis: "AI enhancement unavailable.",
            extraAdvice: "Proceed with standard troubleshooting.",
            riskLevel: "Medium"
        };
    }
}

export { runAIAnalysis };