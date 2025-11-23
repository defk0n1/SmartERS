import fs from "fs";
import path from "path";

const name = process.argv[2];

if (!name) {
    console.error("❌ Please specify a migration name");
    process.exit(1);
}

const timestamp = Date.now();
const file = `migrations/${timestamp}_${name}.js`;

const template = `
// Migration: ${name}
export async function up(mongoose) {
    // TODO: write migration logic here
}

export async function down(mongoose) {
    // TODO: write rollback logic here
}
`;

fs.writeFileSync(file, template);
console.log(`✅ Created migration: ${file}`);
