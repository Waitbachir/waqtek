class VideoService {
    static async getVideoById(id) {
        const response = await apiClient.getVideo(id);
        return response?.video || response || null;
    }

    static async getVideosByEstablishment(establishmentId) {
        const response = await apiClient.getVideosByEstablishment(establishmentId);
        const videos = response?.videos || response;
        return Array.isArray(videos) ? videos : [];
    }

    static async createVideo(establishmentId, nom, lien) {
        const response = await apiClient.createVideo({
            establishment_id: establishmentId,
            nom,
            lien
        });
        return response?.video || response;
    }
}

window.VideoService = VideoService;
