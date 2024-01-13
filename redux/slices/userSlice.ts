import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MyUser {
    uid: string;
    email: string | null;
}

type UserState = {
    user: MyUser | null;
};

const initialState: UserState = {
    user: null,
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<MyUser>) => {
            state.user = action.payload;
          },          
        logout: (state) => {
            state.user = null;
        },
    },
});

export const { login, logout } = userSlice.actions;

export default userSlice.reducer;
