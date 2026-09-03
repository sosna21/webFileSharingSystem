const fs = require("fs");

const [sourceFile, targetFile] = process.argv.slice(2);

if (!sourceFile || !targetFile) {
  console.error(
    "Usage: node scripts/merge-xlf.js <new-source.xlf> <existing-target.xlf>",
  );
  process.exit(1);
}

if (!fs.existsSync(sourceFile)) {
  console.error(`Source file not found: ${sourceFile}`);
  process.exit(1);
}

if (!fs.existsSync(targetFile)) {
  console.error(`Target file not found: ${targetFile}`);
  process.exit(1);
}

const sourceXml = fs.readFileSync(sourceFile, "utf8");
const targetXml = fs.readFileSync(targetFile, "utf8");

function extractTransUnits(xml) {
  const matches = xml.match(/<trans-unit\b[\s\S]*?<\/trans-unit>/g) || [];

  return matches.map((xml) => {
    const idMatch = xml.match(/\bid="([^"]+)"/);

    if (!idMatch) {
      throw new Error(`trans-unit without id:\n${xml}`);
    }

    return {
      id: idMatch[1],
      xml,
    };
  });
}

function insertBeforeClosingBody(xml, units) {
  const closingBody = xml.lastIndexOf("</body>");

  if (closingBody === -1) {
    throw new Error("Could not find </body> in target XLIFF.");
  }

  const insertion = "\n" + units.join("\n") + "\n";

  return xml.slice(0, closingBody) + insertion + xml.slice(closingBody);
}

// ------------------------------------------------------------
// Extract translation units
// ------------------------------------------------------------

const sourceUnits = extractTransUnits(sourceXml);
const targetUnits = extractTransUnits(targetXml);

const sourceIds = new Set(sourceUnits.map((unit) => unit.id));
const targetIds = new Set(targetUnits.map((unit) => unit.id));

// ------------------------------------------------------------
// Find new translations
// ------------------------------------------------------------

const newUnits = sourceUnits.filter((unit) => !targetIds.has(unit.id));

// ------------------------------------------------------------
// Find obsolete translations
// ------------------------------------------------------------

const obsoleteUnits = targetUnits.filter((unit) => !sourceIds.has(unit.id));

// ------------------------------------------------------------
// Append new translations
// ------------------------------------------------------------

let mergedXml = targetXml;

if (newUnits.length > 0) {
  mergedXml = insertBeforeClosingBody(
    mergedXml,
    newUnits.map((unit) => unit.xml),
  );

  fs.writeFileSync(targetFile, mergedXml, "utf8");
}

// ------------------------------------------------------------
// Report result
// ------------------------------------------------------------

console.log("");
console.log("Translation merge complete.");
console.log("--------------------------------");

if (newUnits.length > 0) {
  console.log(`Added ${newUnits.length} new translation(s):`);

  for (const unit of newUnits) {
    console.log(`  + ${unit.id}`);
  }
} else {
  console.log("No new translations.");
}

console.log("");

if (obsoleteUnits.length > 0) {
  console.log(`Potentially obsolete translation(s): ${obsoleteUnits.length}`);

  for (const unit of obsoleteUnits) {
    console.log(`  - ${unit.id}`);
  }

  console.log("");
  console.log("These translations were NOT deleted.");
} else {
  console.log("No obsolete translations.");
}

console.log("");
