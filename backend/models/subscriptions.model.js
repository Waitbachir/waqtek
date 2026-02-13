// subscriptions.model.js — version compatible SupabaseService
import supabase from '../services/supabase.service.js';

class SubscriptionModel {

    // CREATE
    static async create(data) {
        return await supabase.createSubscription({
            establishmentId: data.establishmentId,
            plan: data.plan,
            startDate: data.startDate || new Date().toISOString(),
            endDate: data.endDate || null,
            active: data.active ?? true
        });
    }

    // FIND BY ESTABLISHMENT
    static async findByEstablishment(estId) {
        return await supabase.getSubscriptionsByEstablishment(estId);
    }

    // FIND BY ID
    static async findById(id) {
        return await supabase.findById("subscriptions", id);
    }

    // UPDATE
    static async update(id, updates) {
        return await supabase.update("subscriptions", id, updates);
    }

    // DELETE
    static async delete(id) {
        return await supabase.delete("subscriptions", id);
    }
}

export default SubscriptionModel;

