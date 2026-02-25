import fp from "fastify-plugin";
import sensible from "@fastify/sensible";


export const sensiblePlugin = fp(
    async (app) => {
        app.register(sensible);
    },
    { name: "sensible" }
);
