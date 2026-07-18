import express from "express";
import { db, productTable, insertProductSchema } from "db";
import { eq } from "drizzle-orm";
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

// Admin-only: edit products details
router.put("/edit-product/:productId", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can edit products",
        });
    }

    const { productId } = req.params;
    if (!productId || typeof productId !== "string") {
        return res.status(400).json({
            success: false,
            error: "Invalid product ID",
        });
    }

    const result = insertProductSchema.partial().safeParse(req.body);

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
        const [existingProduct] = await db
            .select()
            .from(productTable)
            .where(eq(productTable.id, productId))
            .limit(1);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                error: "Product not found",
            });
        }

        await db
            .update(productTable)
            .set(result.data)
            .where(eq(productTable.id, productId));

        const [updatedProduct] = await db
            .select()
            .from(productTable)
            .where(eq(productTable.id, productId))
            .limit(1);

        return res.json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: delete a product
router.delete("/delete-product/:productId", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can delete products",
        });
    }

    const { productId } = req.params;
    if (!productId || typeof productId !== "string") {
        return res.status(400).json({
            success: false,
            error: "Invalid product ID",
        });
    }

    try {
        const [existingProduct] = await db
            .select()
            .from(productTable)
            .where(eq(productTable.id, productId))
            .limit(1);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                error: "Product not found",
            });
        }

        await db
            .delete(productTable)
            .where(eq(productTable.id, productId));

        return res.json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

export default router;
