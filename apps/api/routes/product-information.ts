import express from "express";
import { db, productInformationTable, z } from "db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { handleDrizzleError } from "../lib/db-error";

const router = express.Router();

const validProductFields = [
    "company_name", "product_type", "size", "series", "ram_rom",
    "version", "model_number", "processor", "generation", "ai_chip",
    "vendor", "camera", "product_names", "power_consumption",
    "power_supply", "product_length",
] as const;

const addProductInfoSchema = z.object({
    field: z.enum(validProductFields),
    value: z.string().min(1),
});

// Admin-only: get all product information
router.get("/get-all-product-information", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view product information",
        });
    }

    try {
        const rows = await db
            .select()
            .from(productInformationTable);

        // Parse JSON string fields into actual arrays
        const productInformation = rows.map(row => {
            const parsed: Record<string, any> = { ...row };
            for (const field of validProductFields) {
                const val = (row as any)[field];
                parsed[field] = typeof val === "string" ? JSON.parse(val) : (val || []);
            }
            return parsed;
        });

        return res.json({
            success: true,
            productInformation,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: add a value to a product information field
// Body: { field: "company_name", value: "Samsung" }
router.post("/add-product-information", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can modify product information",
        });
    }

    const result = addProductInfoSchema.safeParse(req.body);

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

    const { field, value } = result.data;

    try {
        // Get the singleton row (first row)
        const [existing] = await db
            .select()
            .from(productInformationTable)
            .limit(1);

        if (!existing) {
            // No row exists yet — create one with the value in the specified field
            const newRow: Record<string, string[]> = {};
            newRow[field] = [value];
            await db.insert(productInformationTable).values(newRow as any);

            return res.status(201).json({
                success: true,
                message: `Created product information and added "${value}" to ${field}`,
            });
        }

        // Row exists — parse the JSON string from DB into a real array
        const rawValue = (existing as any)[field];
        const currentArray: string[] = typeof rawValue === "string" ? JSON.parse(rawValue) : (rawValue || []);

        if (currentArray.includes(value)) {
            return res.status(409).json({
                success: false,
                error: `"${value}" already exists in ${field}`,
            });
        }

        currentArray.push(value);
        await db
            .update(productInformationTable)
            .set({ [field]: currentArray } as any)
            .where(eq(productInformationTable.id, existing.id));

        return res.json({
            success: true,
            message: `Added "${value}" to ${field}`,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: update (rename) a value in a product information field
// Body: { field: "company_name", oldValue: "Samsung", newValue: "Samsung Electronics" }
const updateProductInfoSchema = z.object({
    field: z.enum(validProductFields),
    oldValue: z.string().min(1),
    newValue: z.string().min(1),
});

router.put("/update-product-information", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can modify product information",
        });
    }

    const result = updateProductInfoSchema.safeParse(req.body);

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

    const { field, oldValue, newValue } = result.data;

    try {
        const [existing] = await db
            .select()
            .from(productInformationTable)
            .limit(1);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: "Product information not found",
            });
        }

        const rawValue = (existing as any)[field];
        const currentArray: string[] = typeof rawValue === "string" ? JSON.parse(rawValue) : (rawValue || []);

        const index = currentArray.indexOf(oldValue);
        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: `"${oldValue}" not found in ${field}`,
            });
        }

        if (currentArray.includes(newValue)) {
            return res.status(409).json({
                success: false,
                error: `"${newValue}" already exists in ${field}`,
            });
        }

        currentArray[index] = newValue;
        await db
            .update(productInformationTable)
            .set({ [field]: currentArray } as any)
            .where(eq(productInformationTable.id, existing.id));

        return res.json({
            success: true,
            message: `Updated "${oldValue}" to "${newValue}" in ${field}`,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: delete a value from a product information field
// Body: { field: "company_name", value: "Samsung" }
router.delete("/delete-product-information", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can modify product information",
        });
    }

    const result = addProductInfoSchema.safeParse(req.body);

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

    const { field, value } = result.data;

    try {
        const [existing] = await db
            .select()
            .from(productInformationTable)
            .limit(1);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: "Product information not found",
            });
        }

        const rawValue = (existing as any)[field];
        const currentArray: string[] = typeof rawValue === "string" ? JSON.parse(rawValue) : (rawValue || []);

        const index = currentArray.indexOf(value);
        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: `"${value}" not found in ${field}`,
            });
        }

        currentArray.splice(index, 1);
        await db
            .update(productInformationTable)
            .set({ [field]: currentArray } as any)
            .where(eq(productInformationTable.id, existing.id));

        return res.json({
            success: true,
            message: `Deleted "${value}" from ${field}`,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

export default router;
