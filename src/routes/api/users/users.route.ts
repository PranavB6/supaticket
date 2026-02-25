import { type FastifyPluginAsyncTypebox, type Static, Type } from "@fastify/type-provider-typebox";
import type postgres from "postgres";
import bcrypt from 'bcrypt';

const CreateUserSchema = Type.Object({
    displayName: Type.String(),
    email: Type.String(),
    password: Type.String(),
})

const routes: FastifyPluginAsyncTypebox = async (app) => {
    app.post("/",
        {
            schema: {
                body: CreateUserSchema,
            }
        }, async (req, reply) => {

            const hashedPassword = await hashPassword(req.body.password);

            const [userRow] = await app.sql`
            insert into users (display_name, email, password_hash)
            values (${req.body.displayName}, ${req.body.email}, ${hashedPassword})
            returning *;
        `;


            const userResponse = toUserResponse(userRow);

            reply.status(201).send(userResponse);
        })
}


const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}

const toUserResponse = (user: any) => {
    return {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
    }
}




export default routes;



