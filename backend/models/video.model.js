import supabase from '../services/supabase.service.js';

class Video {
    static tableCandidates() {
        return ['video', 'videos'];
    }

    static isMissingTableError(error) {
        const msg = String(error?.message || '').toLowerCase();
        return msg.includes('does not exist') || msg.includes('relation') || msg.includes('not found');
    }

    static async create(data) {
        const errors = [];

        for (const table of this.tableCandidates()) {
            try {
                const { error } = await supabase.client
                    .from(table)
                    .insert(data);

                if (error) {
                    errors.push(`[${table}] ${error.message}`);
                    if (this.isMissingTableError(error)) {
                        continue;
                    }
                    throw new Error(error.message);
                }

                // Return minimal payload even when SELECT/RETURNING is restricted.
                return { ...data };
            } catch (err) {
                errors.push(`[${table}] ${err.message}`);
                if (this.isMissingTableError(err)) {
                    continue;
                }
                throw err;
            }
        }

        throw new Error(`Aucune table video utilisable. Details: ${errors.join(' | ')}`);
    }

    static async getByEstablishment(establishmentId) {
        const errors = [];

        for (const table of this.tableCandidates()) {
            try {
                const { data, error } = await supabase.client
                    .from(table)
                    .select('*')
                    .eq('establishment_id', establishmentId)
                    .order('created_at', { ascending: false });

                if (error) {
                    errors.push(`[${table}] ${error.message}`);
                    if (this.isMissingTableError(error)) {
                        continue;
                    }
                    throw new Error(error.message);
                }

                return Array.isArray(data) ? data : [];
            } catch (err) {
                errors.push(`[${table}] ${err.message}`);
                if (this.isMissingTableError(err)) {
                    continue;
                }
                throw err;
            }
        }

        throw new Error(`Aucune table video utilisable. Details: ${errors.join(' | ')}`);
    }

    static async getById(id) {
        const errors = [];

        for (const table of this.tableCandidates()) {
            try {
                const { data, error } = await supabase.client
                    .from(table)
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    errors.push(`[${table}] ${error.message}`);
                    if (this.isMissingTableError(error)) {
                        continue;
                    }
                    throw new Error(error.message);
                }

                return data || null;
            } catch (err) {
                errors.push(`[${table}] ${err.message}`);
                if (this.isMissingTableError(err)) {
                    continue;
                }
                throw err;
            }
        }

        throw new Error(`Aucune table video utilisable. Details: ${errors.join(' | ')}`);
    }
}

export default Video;
