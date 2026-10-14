import axiosClient from "./axiosClient";

export type DestinyFeedbackItem = {
  id: string;
  displayName: string;
  rating: number;
  message: string;
  mainElement: string;
  missingElement: string;
  createdAtUtc: string;
};

export type CreateDestinyFeedbackPayload = {
  displayName: string;
  rating: number;
  message: string;
  mainElement?: string;
  missingElement?: string;
};

export const destinyFeedbackApi = {
  getLatest: async () => {
    const response = await axiosClient.get(
      "/api/destiny-feedbacks"
    );

    return response.data as {
      feedbacks: DestinyFeedbackItem[];
      total: number;
    };
  },

  create: async (
    payload: CreateDestinyFeedbackPayload
  ) => {
    const response = await axiosClient.post(
      "/api/destiny-feedbacks",
      payload
    );

    return response.data as {
      success: boolean;
      feedback: DestinyFeedbackItem;
    };
  },
};