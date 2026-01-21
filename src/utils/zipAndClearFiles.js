const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

async function zipAndClearFiles(filePaths) {
  const zipName = `qr_templates_${Date.now()}.zip`;
  const zipPath = path.join(__dirname, "../../uploads", zipName);

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);

  for (let filePath of filePaths) {
    filePath = normalize(filePath); // 👈 important
    const absPath = path.join(__dirname, "../../", filePath);

    console.log("Zipping:", absPath);

    if (fs.existsSync(absPath)) {
      archive.file(absPath, { name: path.basename(absPath) });
    } else {
      console.log("File not found for zip:", absPath);
    }
  }

  await archive.finalize();

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      for (let filePath of filePaths) {
        filePath = normalize(filePath);
        const absPath = path.join(__dirname, "../../", filePath);

        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
          console.log("Deleted:", absPath);
        } else {
          console.log("Not found for delete:", absPath);
        }
      }
      resolve(`/uploads/${zipName}`);
    });
    archive.on("error", reject);
  });
}

function normalize(p) {
  return p.startsWith("/") ? p.slice(1) : p;
}

module.exports = zipAndClearFiles;
