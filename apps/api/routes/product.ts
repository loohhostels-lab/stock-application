import express from "express";
import { db, productTable, insertProductSchema } from "db";
import { authMiddleware } from "../middleware/auth";
import { handleDrizzleError } from "../lib/db-error";

const router = express.Router();

// Admin-only: create a new product
router.post("/create-product", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can create products",
        });
    }

    const result = insertProductSchema.safeParse(req.body);

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
        await db.insert(productTable).values(result.data);

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: get all products
router.get("/get-all-products", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view products",
        });
    }

    try {
        const products = await db
            .select()
            .from(productTable)
            .orderBy(productTable.createdAt);

        return res.json({
            success: true,
            products,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

export default router;
