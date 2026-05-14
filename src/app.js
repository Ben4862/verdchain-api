import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { anchorRouter } from "./routes/anchor.js";
import { anchorFileRouter } from "./routes/anchorFile.js";
import { anchorDocRouter } from "./routes/anchorDoc.js";
import { verifyRouter } from "./routes/verify.js";
import { healthRouter } from "./routes/health.js";
import { universitiesRouter } from "./routes/universities.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimiter);

app.use("/api/health",       healthRouter);
app.use("/api/anchor",       anchorRouter);
app.use("/api/anchor-file",  anchorFileRouter);
app.use("/api/anchor-doc",   anchorDocRouter);
app.use("/api/verify",       verifyRouter);
app.use("/api/universities", universitiesRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
