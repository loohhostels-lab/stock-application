import express from "express";
import { db, branchTable, insertBranchSchema } from "db";
import { eq, ne } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { handleDrizzleError } from "../lib/db-error";

const router = express.Router();

// Admin-only: create a new branch
router.post("/create-branch", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can create branches",
        });
    }

    const result = insertBranchSchema.safeParse(req.body);

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
        await db.insert(branchTable).values(result.data);

        return res.status(201).json({
            success: true,
            message: "Branch created successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: get all branches
router.get("/get-all-branches", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view branches",
        });
    }

    try {
        const branches = await db
            .select()
            .from(branchTable)
            .where(ne(branchTable.id, "justdefaultbranchforadminTokeepdataconsistent"));
        return res.json({
            success: true,
            branches,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: edit a branch
router.put("/edit-branch/:id", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can edit branches",
        });
    }

    const { id } = req.params;

    if (!id || typeof id !== "string") {
        return res.status(400).json({
            success: false,
            error: "Invalid branch ID",
        });
    }

    const result = insertBranchSchema.partial().safeParse(req.body);

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
        const [existingBranch] = await db
            .select()
            .from(branchTable)
            .where(eq(branchTable.id, id))
            .limit(1);

        if (!existingBranch) {
            return res.status(404).json({
                success: false,
                error: "Branch not found",
            });
        }

        await db
            .update(branchTable)
            .set(result.data)
            .where(eq(branchTable.id, id));

        return res.json({
            success: true,
            message: "Branch updated successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: get a single branch by ID
router.get("/get-branch/:id", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view branches",
        });
    }

    const { id } = req.params;

    if (!id || typeof id !== "string") {
        return res.status(400).json({
            success: false,
            error: "Invalid branch ID",
        });
    }

    try {
        const [branch] = await db
            .select()
            .from(branchTable)
            .where(eq(branchTable.id, id))
            .limit(1);

        if (!branch) {
            return res.status(404).json({
                success: false,
                error: "Branch not found",
            });
        }

        return res.json({
            success: true,
            branch,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

export default router;
