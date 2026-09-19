import React from 'react';
import {
    Routes,
    Route,
    Navigate
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

import {
    currentUser
} from './data/mockData';


const H = ({ children }) => (
    <AppShell user={currentUser}>
        {children}
    </AppShell>
);

const A = ({ children }) => (
    <AppShell
        user={{
            ...currentUser,
            name: 'Admin Operations',
            role: 'Admin',
            profession: 'Network Admin'
        }}
        admin
    >
        {children}
    </AppShell>
);


export default function App() {
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
                        <Dashboard user={currentUser} />
                    </H>
                }
            />

            <Route
                path="/sending"
                element={
                    <H>
                        <Sending user={currentUser} />
                    </H>
                }
            />

            <Route
                path="/receiving"
                element={
                    <H>
                        <Receiving user={currentUser} />
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