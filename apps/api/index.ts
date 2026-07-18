import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiLimiter } from "./middleware/rate-limit";
import routes from "./routes/index";

const app = express();

app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.use("/", routes);

app.listen("8080", () => {
    console.log("server is working on port 8080")
});