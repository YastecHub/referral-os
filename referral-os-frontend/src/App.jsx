import React, { useState, useEffect } from 'react';
import {
    Routes,
    Route,
    Navigate,
    useLocation
} from 'react-router-dom';

import AppShell from './components/AppShell';

import Landing from './pages/Landing';
import {
    SignIn,
    SignUp
} from './pages/Auth';

import Dashboard from './pages/Dashboard';
import Sending from './pages/Sending';
import Receiving from './pages/Receiving';
import Admin from './pages/Admin';

import { api } from './services/api';

export default function App() {
    const [user, setUser] = useState(() => api.auth.getCurrentUser());
    const location = useLocation();

    // Sync current user state on route transitions (e.g. after login or logout)
    useEffect(() => {
        const active = api.auth.getCurrentUser();
        setUser(active);
    }, [location.pathname]);

    const H = ({ children }) => (
        <AppShell user={user}>
            {children}
        </AppShell>
    );

    const A = ({ children }) => (
        <AppShell
            user={{
                ...user,
                name: user?.isAdmin ? user.name : 'Admin Operations',
                role: 'Admin',
                profession: 'Network Admin'
            }}
            admin
        >
            {children}
        </AppShell>
    );

    return (
        <Routes>
            <Route
                path="/"
                element={<Landing />}
            />

            <Route
                path="/signin"
                element={<SignIn />}
            />

            <Route
                path="/signup"
                element={<SignUp />}
            />

            <Route
                path="/dashboard"
                element={
                    <H>
                        <Dashboard user={user} />
                    </H>
                }
            />

            <Route
                path="/sending"
                element={
                    <H>
                        <Sending user={user} />
                    </H>
                }
            />

            <Route
                path="/receiving"
                element={
                    <H>
                        <Receiving user={user} />
                    </H>
                }
            />

            <Route
                path="/admin"
                element={
                    <A>
                        <Admin />
                    </A>
                }
            />

            <Route
                path="*"
                element={
                    <Navigate
                        to="/"
                        replace
                    />
                }
            />
        </Routes>
    );
}