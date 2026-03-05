export type UserSessionRow = {
    id: string;
    user_id: string;
    expires_at: string;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
}