const fs = require("fs");
const path = require("path");
const dns = require("dns");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;
      const index = trimmed.indexOf("=");
      if (index === -1) return env;
      env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
      return env;
    }, {});
}

const rootDir = path.resolve(__dirname, "../../..");
const env = {
  ...readEnvFile(path.join(rootDir, ".env.example")),
  ...readEnvFile(path.join(rootDir, ".env")),
  ...process.env
};

const mongoUri = env.MONGODB_URI;
const password = env.ADMIN_SEED_PASSWORD || "BharatPayU@2026";

const admins = [
  {
    name: env.SUPER_ADMIN_NAME || "BharatPayU Super Admin",
    businessName: "BharatPayU",
    mobile: env.SUPER_ADMIN_MOBILE || "8696270007",
    email: env.SUPER_ADMIN_EMAIL || "superadmin@bharatpayu.com",
    role: "super_admin"
  },
  {
    name: env.ADMIN_NAME || "BharatPayU Admin",
    businessName: "BharatPayU",
    mobile: env.ADMIN_MOBILE || "8696270008",
    email: env.ADMIN_EMAIL || "admin@bharatpayu.com",
    role: "admin"
  }
];

async function seed() {
  if (!mongoUri) throw new Error("MONGODB_URI is required");
  if (admins[0].mobile === admins[1].mobile) {
    throw new Error("Admin and super admin cannot use the same mobile because users.mobile is unique");
  }

  await mongoose.connect(mongoUri);
  const passwordHash = await bcrypt.hash(password, 12);
  const users = mongoose.connection.collection("users");
  const now = new Date();

  for (const admin of admins) {
    await users.updateOne(
      { email: admin.email.toLowerCase() },
      {
        $set: {
          ...admin,
          email: admin.email.toLowerCase(),
          passwordHash,
          isActive: true,
          approvalStatus: "approved",
          emailVerified: true,
          kycStatus: "verified",
          loginOtpEnabled: false,
          address: {},
          kyc: {},
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  const seeded = await users
    .find({ email: { $in: admins.map((admin) => admin.email.toLowerCase()) } })
    .project({ passwordHash: 0 })
    .toArray();

  console.table(
    seeded.map((user) => ({
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      approvalStatus: user.approvalStatus,
      loginOtpEnabled: user.loginOtpEnabled
    }))
  );
  console.log(`Seed password: ${password}`);
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
