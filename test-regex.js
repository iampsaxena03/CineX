const testCases = [
  "S01E01", "S1E1", "s02e08", "ep1", "Ep 02", "Episode 3", "Episode04", "Season 1 (Episode",
  "Download episode", "E01", "E1", "e05"
];

const oldRegex = /\b(episode|episodes|ep\s*\d+|e\d{1,3})\b/i;
const newRegex = /\b(episode|episodes|ep\s*\d+|e\d{1,3})\b/i; // I will modify this
const betterRegex = /(episode|ep\s*\d+|s\d{1,2}e\d{1,3}|(?<!s\d{2})e\d{1,3})/i;

console.log("OLD REGEX RESULTS:");
for (let t of testCases) {
   console.log(t, "->", oldRegex.test(t));
}

console.log("\nBETTER REGEX RESULTS:");
for (let t of testCases) {
   console.log(t, "->", betterRegex.test(t));
}
