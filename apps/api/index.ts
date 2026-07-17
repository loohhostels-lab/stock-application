import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { db, userTable, branchTable, loginSchema, insertUserSchema, insertBranchSchema, productInformationTable, categorySelect, insertCategorySelectSchema, z } from "db";
import { eq, and, ne } from "drizzle-orm";
import { authMiddleware } from "./middleware/auth";
import { handleDrizzleError } from "./lib/db-error";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

const app = express();
app.use(cors());
app.use(express.json());


app.get("/health", (req, res) => {
    res.json({message: "server is working fine"})
});


app.post("/login", async(req, res) => {
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
app.get("/me", authMiddleware, async (req, res) => {
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


// ─── Branch Routes ───────────────────────────────────────────────

// Admin-only: create a new branch
app.post("/admin/create-branch", authMiddleware, async (req, res) => {
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
app.get("/admin/get-all-branches", authMiddleware, async (req, res) => {
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
app.put("/admin/edit-branch/:id", authMiddleware, async (req, res) => {
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
app.get("/admin/get-branch/:id", authMiddleware, async (req, res) => {
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




// ─── User Routes ─────────────────────────────────────────────────

// Admin-only: create a new user
app.post("/admin/create-user-branch", authMiddleware, async (req, res) => {
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

app.get("/get-all-user", authMiddleware, async (req, res) => {
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


// ─── Product Information Routes ──────────────────────────────────

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
app.get("/admin/get-all-product-information", authMiddleware, async (req, res) => {
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

app.post("/admin/add-product-information", authMiddleware, async (req, res) => {
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

app.put("/admin/update-product-information", authMiddleware, async (req, res) => {
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
app.delete("/admin/delete-product-information", authMiddleware, async (req, res) => {
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

// ─── Category Select Routes ──────────────────────────────────

// Admin-only: get all category-select rows
app.get("/admin/get-all-category-select", authMiddleware, async (req, res) => {
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

// Admin-only: get all details for a category by name
// Query: ?category_name=Laptop
// Returns the fields defined in category_select for that category,
// with their values pulled from the product_information table.
app.get("/admin/get-category-details", authMiddleware, async (req, res) => {
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
app.post("/admin/add-category-select", authMiddleware, async (req, res) => {
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
app.put("/admin/upsert-category-select", authMiddleware, async (req, res) => {
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

app.listen("8080", () => {
    console.log("server is working on port 8080")
})