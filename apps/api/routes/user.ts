import express from "express";
import { db, userTable, branchTable, insertUserSchema } from "db";
import { eq, ne } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { handleDrizzleError } from "../lib/db-error";

const router = express.Router();

// Admin-only: create a new user
router.post("/admin/create-user-branch", authMiddleware, async (req, res) => {
    // Only admins can create users
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can create users",
        });
    }

    const result = insertUserSchema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join("."),
            type: issue.code,
            message: issue.message,
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors,
        });
    }

    try {
        await db.insert(userTable).values(result.data);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

router.get("/get-all-user", authMiddleware, async (req, res) => {
    if(req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can get all users",
        });
    }
    const users = await db
        .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            phone: userTable.phone,
            address: userTable.address,
            role: userTable.role,
            branch_id: userTable.branch_id,
            is_active: userTable.is_active,
            createdAt: userTable.createdAt,
            updatedAt: userTable.updatedAt,
            branch_title: branchTable.title,
            branch_address: branchTable.address,
        })
        .from(userTable)
        .leftJoin(branchTable, eq(userTable.branch_id, branchTable.id))
        .where(ne(userTable.role, "ADMIN"));

    return res.json({
        success: true,
        users,
    });
});

export default router;
