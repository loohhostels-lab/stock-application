import express from "express";
import jwt from "jsonwebtoken";
import { db, userTable, loginSchema } from "db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { handleDrizzleError } from "../lib/db-error";
import { authLimiter } from "../middleware/rate-limit";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({message: "server is working fine"})
});


router.post("/login", authLimiter, async(req, res) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join("."), // which field failed
            type: issue.code,            // e.g. "invalid_type", "too_small", "invalid_string"
            message: issue.message,      // human-readable reason
        }));

        return res.status(400).json({
            message: "Invalid request",
            errors,
        });
    }

    const { email, password } = result.data;
    console.log("before email and password")

    try {
        // Check if account exists with matching email and password
        const [user] = await db
            .select()
            .from(userTable)
            .where(and(eq(userTable.email, email), eq(userTable.password, password)))
            .limit(1);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        // Sign JWT with user info
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.json({
            success: true,
            message: "Login successful",
            token,
        });
    } catch (error: any) {
        console.error("Login route error:", error);
        if (error && typeof error === "object" && "cause" in error) {
            console.error("Login route error cause:", error.cause);
        }
        handleDrizzleError(error, res);
    }
});


// Protected route — example usage of auth middleware
router.get("/me", authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const [user] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, req.user.id))
            .limit(1);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const { password, ...userWithoutPassword } = user;

        return res.json({
            success: true,
            user: userWithoutPassword,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

export default router;
