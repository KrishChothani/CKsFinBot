/** @format */

import mongoose from "mongoose";
import { DB_NAME } from "../Constants.js";
import dns from "node:dns";

// Ensure reliable DNS resolution for MongoDB Atlas SRV connection strings
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDb Connected Successfully !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Mongodb Connection Error: ", error);
    process.exit(1);
  }
};

export default connectDB;
