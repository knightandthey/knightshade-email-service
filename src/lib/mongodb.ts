import { MongoClient, MongoClientOptions, Db, Collection } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "knightshade-email-service";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  const options: MongoClientOptions = {};
  const client = new MongoClient(uri, options);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const client = await getMongoClient();
  const db = client.db(dbName);
  cachedDb = db;
  return db;
}

export async function getCollection<T = unknown>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export type EmailLog = {
  _id?: string;
  to: string;
  cc?: string;
  bcc?: string;
  from: string;
  subject: string;
  template: string;
  variables?: Record<string, unknown>;
  status: "queued" | "sent" | "failed";
  error?: string;
  createdAt: Date;
  messageId?: string;
};


