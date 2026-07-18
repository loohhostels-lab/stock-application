import express from "express";
import { db, categorySelect, insertCategorySelectSchema, productInformationTable } from "db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { handleDrizzleError } from "../lib/db-error";

const router = express.Router();

// Mapping from display labels (stored in category_select.field) to
// actual column names in the product_information table.
// Keys are lowercased for case-insensitive matching.
const fieldLabelToColumn: Record<string, string> = {
    "company": "company_name",
    "category": "product_type",
    "size": "size",
    "series": "series",
    "ram / rom": "ram_rom",
    "android version": "version",
    "model number": "model_number",
    "processor": "processor",
    "generation": "generation",
    "ai chip / npu": "ai_chip",
    "supplier / vendor": "vendor",
    "camera / video resolution": "camera",
    "product name": "product_names",
    "power consumption": "power_consumption",
    "power supply": "power_supply",
    "length": "product_length",
};

// Admin-only: get all category-select rows
router.get("/get-all-category-select", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view category select",
        });
    }

    try {
        const categories = await db
            .select()
            .from(categorySelect);

        // Parse JSON string fields into actual arrays
        const parsed = categories.map(row => ({
            ...row,
            field: typeof row.field === "string" ? JSON.parse(row.field) : (row.field || []),
        }));

        return res.json({
            success: true,
            categories: parsed,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: get all details for a category by name
// Query: ?category_name=Laptop
// Returns the fields defined in category_select for that category,
// with their values pulled from the product_information table.
router.get("/get-category-details", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view category details",
        });
    }

    const categoryName = req.query.category_name;

    if (!categoryName || typeof categoryName !== "string") {
        return res.status(400).json({
            success: false,
            error: "category_name query parameter is required",
        });
    }

    try {
        // 1. Find the category in category_select
        const [category] = await db
            .select()
            .from(categorySelect)
            .where(eq(categorySelect.category_name, categoryName))
            .limit(1);

        if (!category) {
            return res.status(404).json({
                success: false,
                error: `Category "${categoryName}" not found`,
            });
        }

        // Parse the field array (display labels from category_select)
        const fieldLabels: string[] = typeof category.field === "string"
            ? JSON.parse(category.field)
            : (category.field || []);

        if (fieldLabels.length === 0) {
            return res.json({
                success: true,
                category_name: categoryName,
                details: {},
            });
        }

        // 2. Map display labels to actual column names (case-insensitive)
        const resolvedFields: { label: string; column: string }[] = [];
        const unmappedLabels: string[] = [];

        for (const label of fieldLabels) {
            const column = fieldLabelToColumn[label.toLowerCase().trim()];
            if (column) {
                resolvedFields.push({ label, column });
            } else {
                unmappedLabels.push(label);
            }
        }

        if (unmappedLabels.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Unrecognized field label(s): ${unmappedLabels.join(", ")}. Valid labels include: ${Object.keys(fieldLabelToColumn).join(", ")}`,
            });
        }

        // 3. Get the singleton product information row
        const [productInfo] = await db
            .select()
            .from(productInformationTable)
            .limit(1);

        if (!productInfo) {
            return res.json({
                success: true,
                category_name: categoryName,
                details: Object.fromEntries(
                    resolvedFields.map(f => [f.label, []])
                ),
            });
        }

        // 4. Extract only the requested fields and their values
        // Keys use the original display label, values come from the mapped column
        const details: Record<string, string[]> = {};
        for (const { label, column } of resolvedFields) {
            const rawValue = (productInfo as any)[column];
            details[label] = typeof rawValue === "string"
                ? JSON.parse(rawValue)
                : (rawValue || []);
        }

        return res.json({
            success: true,
            category_name: categoryName,
            details,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: add a new category-select row
// Body: { category_name: "Laptop", field: ["RAM", "Size", "Brand"] }
router.post("/add-category-select", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can modify category select",
        });
    }

    const result = insertCategorySelectSchema.safeParse(req.body);

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

    const { category_name, field } = result.data;

    try {
        // Check if category already exists
        const [existing] = await db
            .select()
            .from(categorySelect)
            .where(eq(categorySelect.category_name, category_name))
            .limit(1);

        if (existing) {
            return res.status(409).json({
                success: false,
                error: `Category "${category_name}" already exists`,
            });
        }

        await db.insert(categorySelect).values({
            category_name,
            field: field ?? [],
        });

        return res.status(201).json({
            success: true,
            message: `Created category "${category_name}"`,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: upsert a category-select row
// Body: { category_name: "Color", field: ["Red", "Blue", "Green"] }
router.put("/upsert-category-select", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can modify category select",
        });
    }

    const result = insertCategorySelectSchema.safeParse(req.body);

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

    const { category_name, field } = result.data;

    try {
        // Check if a row with this category_name already exists
        const [existing] = await db
            .select()
            .from(categorySelect)
            .where(eq(categorySelect.category_name, category_name))
            .limit(1);

        if (!existing) {
            // Create a new row
            await db.insert(categorySelect).values({
                category_name,
                field: field ?? [],
            });

            return res.status(201).json({
                success: true,
                message: `Created category "${category_name}" with field values`,
            });
        }

        // Update the existing row's field array
        await db
            .update(categorySelect)
            .set({ field: field ?? [] })
            .where(eq(categorySelect.id, existing.id));

        return res.json({
            success: true,
            message: `Updated field values for category "${category_name}"`,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

export default router;
