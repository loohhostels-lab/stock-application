import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { addUserSchema, getUserSchema } from "./index";

export const registry = new OpenAPIRegistry();

registry.register("GetUser", getUserSchema);
registry.register("AddUserRequest", addUserSchema);
registry.register("User", addUserSchema);

const generator = new OpenApiGeneratorV3(registry.definitions);

export const document = generator.generateDocument({
    openapi: "3.0.0",
    info: {
        title: "Stock Management API",
        version: "1.0.0",
    },
});
