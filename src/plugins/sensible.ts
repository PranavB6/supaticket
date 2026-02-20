import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import sensible from "@fastify/sensible";



export const sensiblePlugin: FastifyPluginAsync = fp(
    async (app) => {
        app.register((sensible));
    },
    { name: "sensible" }
);
