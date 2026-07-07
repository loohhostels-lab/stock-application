import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, userTable } from "db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: "ADMIN" | "USER";
            };
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: "Missing or invalid Authorization header",
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Token not provided",
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            email: string;
            role: "ADMIN" | "USER";
        };

        // Check if user still exists in DB
        const [user] = await db
            .select({ id: userTable.id, email: userTable.email, role: userTable.role })
            .from(userTable)
            .where(eq(userTable.id, decoded.id))
            .limit(1);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User no longer exists",
            });
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
};
