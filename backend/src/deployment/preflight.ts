import mongoose from "mongoose";
import { FetchRequest, JsonRpcProvider } from "ethers";
import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import * as models from "../models/index.js";

const canonicalContract = "0x87beca5241e43607ce2983608b1d479f97cd9a05";

async function main() {
  if (env.EXPECTED_CHAIN_ID !== 11155111 || env.CONTRACT_ADDRESS.toLowerCase() !== canonicalContract) {
    throw new Error("CANONICAL_SEPOLIA_CONFIGURATION_REQUIRED");
  }
  if (!env.MONGODB_DATABASE || ["admin", "local", "config"].includes(env.MONGODB_DATABASE)) {
    throw new Error("EXPLICIT_APPLICATION_DATABASE_REQUIRED");
  }
  const request = new FetchRequest(env.ETHEREUM_RPC_URL);
  request.timeout = 15000;
  const provider = new JsonRpcProvider(request);
  try {
    if (BigInt(await provider.send("eth_chainId", [])) !== 11155111n) throw new Error("WRONG_RPC_CHAIN");
    const code = await provider.getCode(env.CONTRACT_ADDRESS);
    if (!code || code === "0x") throw new Error("CONTRACT_BYTECODE_MISSING");
    console.log("Sepolia chain ID and canonical contract bytecode verified.");
  } finally {
    provider.destroy();
  }

  await connectDatabase();
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("DATABASE_UNAVAILABLE");
    await db.command({ ping: 1 });
    const topology = await db.admin().command({ hello: 1 });
    if (!topology.setName && topology.msg !== "isdbgrid") {
      throw new Error("REPLICA_SET_REQUIRED_FOR_STRONG_REVOCATION");
    }
    if (process.argv.includes("--prepare")) {
      // Additive and idempotent. Never syncIndexes/drop collections or seed data.
      for (const model of Object.values(models)) {
        await model.createCollection();
        await model.createIndexes();
      }
      await db.collection(`${env.GRIDFS_BUCKET_NAME}.files`).createIndex({ filename: 1, uploadDate: 1 });
      await db.collection(`${env.GRIDFS_BUCKET_NAME}.files`).createIndex({ "metadata.storageId": 1 });
      await db.collection(`${env.GRIDFS_BUCKET_NAME}.chunks`).createIndex({ files_id: 1, n: 1 }, { unique: true });
      console.log("Application collections, schema indexes and GridFS indexes prepared; no application records seeded.");
    } else {
      for (const model of Object.values(models)) {
        const difference = await model.diffIndexes();
        if (difference.toCreate.length) throw new Error("APPLICATION_INDEXES_MISSING_RUN_DB_PREPARE");
      }
      const chunks = await db.collection(`${env.GRIDFS_BUCKET_NAME}.chunks`).listIndexes().toArray();
      if (!chunks.some(index => index.unique && index.key.files_id === 1 && index.key.n === 1)) {
        throw new Error("GRIDFS_INDEX_MISSING_RUN_DB_PREPARE");
      }
      console.log("Database connectivity, transaction-capable topology and required indexes verified.");
    }
  } finally {
    await disconnectDatabase();
  }
}

main().catch(() => {
  // Driver/provider error messages can contain credential-bearing URLs.
  console.error("Deployment preflight failed. Check canonical Sepolia settings, RPC connectivity, Atlas network access, database permissions and indexes. No credentials or driver errors were printed.");
  process.exitCode = 1;
});
