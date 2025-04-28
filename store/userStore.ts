import { create } from "zustand";
import { getAuthToken, deleteAuthToken } from "@/utils/authHelper";
import { getUserData } from "@/utils/getUser";

export interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    phone: number;
    email: string;
}

interface UserState {
    user: UserData | null;
    isAuthenticate: boolean;
    loading: boolean;
    setUser: (user: UserData | null) => void;
    logout: () => void;
    fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    isAuthenticate: false,
    loading: true,

    setUser: (user) => {
        set({
            user,
            isAuthenticate: !!user, // ✅ Dynamically set authentication state
            loading: false,
        });
    },

    logout: () => {
        deleteAuthToken(); // ✅ Remove token first
        set(() => ({ user: null, isAuthenticate: false, loading: false })); // ✅ Reset store state
    },

    fetchUser: async () => {
        const token = getAuthToken();
        if (!token) {
            set({ loading: false });
            return;
        }
        try {
            set({ loading: true });
            console.log("Fetching user data... in");

            const userData = await getUserData(token);


            set({
                user: {
                    id: userData.personalInfo._id,
                    firstName: userData.personalInfo.firstName,
                    lastName: userData.personalInfo.lastName,
                    phone: userData.personalInfo.phone || 121212,
                    email: userData.personalInfo.email,
                },
                isAuthenticate: !!userData,
                loading: false,
            });
        } catch (error) {
            console.error("❌ Error fetching user:", error);
            set({ loading: false });
        }
    },
}));
