class StatsService {
    static async getStats() {
        try {
            stateManager.setLoading(true);
            return await apiClient.getStats();
        } finally {
            stateManager.setLoading(false);
        }
    }

    static async getQueueStats(queueId) {
        return apiClient.getQueueStats(queueId);
    }

    static async getEstablishmentStats(establishmentId) {
        return apiClient.getEstablishmentStats(establishmentId);
    }

    static async getRevenueDaily(params = {}) {
        return apiClient.getRevenueDaily(params);
    }

    static async getRevenueMonthly(params = {}) {
        return apiClient.getRevenueMonthly(params);
    }

    static async getVipCount(params = {}) {
        return apiClient.getVipCount(params);
    }

    static async loadDashboard() {
        try {
            stateManager.setLoading(true);

            const [establishmentsRes, queuesRes, ticketsRes, dailyRes, monthlyRes, vipRes] = await Promise.all([
                apiClient.getEstablishments(),
                apiClient.getQueues(),
                apiClient.getTickets(),
                apiClient.getRevenueDaily(),
                apiClient.getRevenueMonthly(),
                apiClient.getVipCount()
            ]);

            const establishments = establishmentsRes.establishments || [];
            const queues = queuesRes.queues || [];
            const tickets = ticketsRes.tickets || [];

            const dailyRevenue = dailyRes?.totals?.revenue || 0;
            const monthlyRevenue = monthlyRes?.totals?.revenue || 0;
            const vipCount = vipRes?.total_vip_tickets || 0;

            const today = new Date().toDateString();
            const ticketsToday = tickets.filter((t) => new Date(t.created_at).toDateString() === today).length;

            return {
                establishmentCount: establishments.length,
                queueCount: queues.length,
                ticketCount: tickets.length,
                ticketsToday,
                dailyRevenue,
                monthlyRevenue,
                vipCount,
                revenueDailySeries: dailyRes?.data || [],
                revenueMonthlySeries: monthlyRes?.data || []
            };
        } finally {
            stateManager.setLoading(false);
        }
    }
}

window.StatsService = StatsService;
