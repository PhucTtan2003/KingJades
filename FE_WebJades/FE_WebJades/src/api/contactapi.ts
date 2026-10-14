import axiosClient from "./axiosClient";

export type PreferredContactChannel = "zalo" | "phone" | "email";

export type CreateContactLeadPayload = {
  fullName: string;
  phone: string;
  email?: string;
  productId?: string;
  productName?: string;
  productSlug?: string;
  need?: string;
  preferredContactChannel?: PreferredContactChannel;
  message?: string;
  source?: string;
};

export type ContactLeadStatus =
  | "new"
  | "contacted"
  | "quoted"
  | "closed"
  | "cancelled";

export type ContactLead = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  productId: string;
  productName: string;
  productSlug: string;
  need: string;
  preferredContactChannel?: PreferredContactChannel;
  message: string;
  source: string;
  status: ContactLeadStatus;
  internalNote: string;
  handledBy: string;
  handledAtUtc?: string | null;
  ipAddress: string;
  userAgent: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export const contactApi = {
  createContactLead: async (payload: CreateContactLeadPayload) => {
    const response = await axiosClient.post("/api/contact-leads", payload);
    return response.data;
  },

  getAdminContactLeads: async (params: {
    skip?: number;
    take?: number;
    status?: string;
    search?: string;
    fromUtc?: string;
    toUtc?: string;
  }) => {
    const response = await axiosClient.get("/api/admin/contact-leads", {
      params,
    });

    return response.data;
  },

  updateContactLeadStatus: async (
    id: string,
    payload: {
      status: ContactLeadStatus;
      internalNote?: string;
    }
  ) => {
    const response = await axiosClient.patch(
      `/api/admin/contact-leads/${id}/status`,
      payload
    );

    return response.data;
  },
};
