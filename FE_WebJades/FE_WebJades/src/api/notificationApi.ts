import apiClient from "./apiClient";

import {
    Notification
} from "../types/notification";



export const notificationApi = {


    // lấy danh sách notification

    getAll: async (): Promise<Notification[]> => {

        const response =
            await apiClient.get<Notification[]>(
                "/api/notifications"
            );


        return response.data;
    },




    // lấy số lượng chưa đọc

    getUnreadCount:
        async (): Promise<number> => {

        const response =
            await apiClient.get(
                "/api/notifications/unread-count"
            );


        return response.data.count;
    },





    // đánh dấu đã đọc

    markRead:
        async (
            id: string
        ) => {

        await apiClient.patch(
            `/api/notifications/${id}/read`
        );

    }

};