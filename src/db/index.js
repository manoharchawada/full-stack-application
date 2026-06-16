import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log("====================================");
    console.log(
      `\n MongoDB connection !! DB HOST: ${connectionInstance.connection.host}`
    );
    console.log("====================================");
  } catch (error) {
    console.log("====================================");
    console.log("DB CONNECTION ERROR", error);
    console.log("====================================");
    process.exit(1);
  }
};

export default connectDB;
