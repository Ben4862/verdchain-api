import express    from "express";
import cors      from "cors";
import helmet    from "helmet";
import morgan    from "morgan";
import { anchorRouter }      from "./routes/anchor.js";
import { anchorFileRouter }  from "./routes/anchorFile.js";
import { anchorAgentRouter } from "./routes/anchorAgent.js";
import { verifyRouter }      from "./routes/verify.js";
import { healthRouter }      from "./routes/health.js";
import { issuersRouter }     from "./routes/issuers.js";
import { authRouter }        from "./routes/auth.js";
import { agentsRouter }      from "./routes/agents.js";
import { adminRouter }       from "./routes/admin.js";
import { auditRouter }       from "./routes/audit.js";
import { errorHandler }      from "./middleware/errorHandler.js";
import { rateLimiter }       from "./middleware/rateLimiter.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimiter);

// Low-level anchoring routes (hash in, proof out)
app.use("/api/health",       healthRouter);
app.use("/api/anchor",       anchorRouter);
app.use("/api/anchor-file",  anchorFileRouter);
app.use("/api/anchor-agent", anchorAgentRouter);
app.use("/api/verify",       verifyRouter);
app.use("/api/issuers",      issuersRouter);

// JWT-based API — AI agent identity certification
app.use("/api/auth",         authRouter);
app.use("/api/agents",       agentsRouter);
app.use("/api/admin",        adminRouter);
app.use("/api/audit",        auditRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
