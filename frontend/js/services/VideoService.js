class VideoService {
    static normalizeVideo(video) {
        const item = video && typeof video === "object" ? video : {};
        const id = item.id || item.video_id || item.videoId || item.uuid || "";
        const name = item.nom || item.name || item.title || "";
        const url = item.lien || item.url || item.link || "";

        return {
            ...item,
            id: String(id || "").trim(),
            nom: String(name || "").trim(),
            lien: String(url || "").trim()
        };
    }

    static async getVideoById(id) {
        const response = await apiClient.getVideo(id);
        const video = response?.video || response || null;
        return video ? this.normalizeVideo(video) : null;
    }

    static async getVideosByEstablishment(establishmentId) {
        const response = await apiClient.getVideosByEstablishment(establishmentId);
        const videos = response?.videos || response;
        const list = Array.isArray(videos) ? videos : [];
        return list.map((video) => this.normalizeVideo(video)).filter((video) => video.id || video.lien);
    }

    static async createVideo(establishmentId, nom, lien) {
        const response = await apiClient.createVideo({
            establishment_id: establishmentId,
            nom,
            lien
        });
        const video = response?.video || response;
        return this.normalizeVideo(video);
    }
}

window.VideoService = VideoService;
