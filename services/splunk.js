import splunkjs from "splunk-sdk";

export function logToSplunk(event) {
    try {
        console.log("📡 [Splunk Log]", JSON.stringify(event, null, 2));
    } catch (err) {
        console.error("❌ Splunk logging failed:", err.message);
    }
}