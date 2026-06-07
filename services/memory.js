import fs from "fs";
import path from "path";

const historyPath = path.join(
    process.cwd(),
    "data",
    "history.json"
);

function ensureHistoryFile() {
    if (!fs.existsSync(historyPath)) {
        fs.writeFileSync(historyPath, "[]");
    }
}

function saveHistory(entry) {
    ensureHistoryFile();

    const history = JSON.parse(
        fs.readFileSync(historyPath, "utf8")
    );

    history.push(entry);

    fs.writeFileSync(
        historyPath,
        JSON.stringify(history, null, 2)
    );
}

function getStats() {
    ensureHistoryFile();

    const history = JSON.parse(
        fs.readFileSync(historyPath, "utf8")
    );

    return {
        totalDiagnoses: history.length,
        successfulRepairs: history.filter(h => h.success === true).length,
        failedRepairs: history.filter(h => h.success === false).length,
        latest: history.slice(-5)
    };
}

export {
    saveHistory,
    getStats
};
