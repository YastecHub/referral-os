import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Send,
    Inbox,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { api } from '../services/api';

export default function AppShell({
    user,
    children,
    admin = false
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const navigationItems = [
        {
            to: '/dashboard',
            label: 'Facility Dashboard',
            icon: LayoutDashboard
        },
        {
            to: '/sending',
            label: 'Sending',
            icon: Send
        },
        {
            to: '/receiving',
            label: 'Receiving',
            icon: Inbox
        }
    ];

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setMenuOpen(false);
            }
        }

        if (menuOpen) {
            document.addEventListener(
                'mousedown',
                handleClickOutside
            );
        }

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
    }, [menuOpen]);

    function handleSignOut() {
        setMenuOpen(false);
        api.auth.signOut();
        navigate('/signin');
    }

    function handleNavigation() {
        setMenuOpen(false);
    }

    return (
        <div className="app-shell">

            {/* =========================
                STICKY HEADER
            ========================= */}
            <header className="topbar">

                <div className="topbar-brand">
                    ReferralOS
                </div>

                {/* Normal healthcare user context */}
                {!admin && (
                    <div className="topbar-context">
                        <span>REFERRALOS WORKSPACE</span>

                        <strong>
                            {user.facilityName}
                        </strong>
                    </div>
                )}

                {/* Admin context */}
                {admin && (
                    <div className="topbar-context admin-context">
                        <strong>
                            Network Command Centre
                        </strong>
                    </div>
                )}

                {/* Desktop user information */}
                <div className="topbar-user">
                    <strong>
                        {user.name}
                    </strong>

                    <span>
                        {user.profession || user.role}
                    </span>
                </div>

                {/* Mobile navigation trigger */}
                {!admin && (
                    <div
                        className="mobile-navigation"
                        ref={menuRef}
                    >
                        <button
                            className="mobile-menu"
                            type="button"
                            onClick={() =>
                                setMenuOpen(
                                    (current) => !current
                                )
                            }
                            aria-label={
                                menuOpen
                                    ? 'Close navigation'
                                    : 'Open navigation'
                            }
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? (
                                <X size={24} />
                            ) : (
                                <Menu size={24} />
                            )}
                        </button>

                        {/* =========================
                            MOBILE DROPDOWN
                        ========================= */}
                        {menuOpen && (
                            <div className="mobile-nav-dropdown">

                                <div className="mobile-nav-header">
                                  

                                    <strong>
                                        {user.facilityName}
                                    </strong>
                                </div>

                                <nav className="mobile-nav-links">
                                    {navigationItems.map(
                                        ({
                                            to,
                                            label,
                                            icon: Icon
                                        }) => (
                                            <NavLink
                                                key={to}
                                                to={to}
                                                onClick={
                                                    handleNavigation
                                                }
                                                className={({
                                                    isActive
                                                }) =>
                                                    `mobile-nav-link ${
                                                        isActive
                                                            ? 'active'
                                                            : ''
                                                    }`
                                                }
                                            >
                                                <Icon size={18} />

                                                <span>
                                                    {label}
                                                </span>
                                            </NavLink>
                                        )
                                    )}
                                </nav>

                                <div className="mobile-nav-divider" />

                                <button
                                    className="mobile-nav-signout"
                                    type="button"
                                    onClick={handleSignOut}
                                >
                                    <LogOut size={17} />

                                    <span>
                                        Sign out
                                    </span>
                                </button>

                            </div>
                        )}
                    </div>
                )}


            </header>

            {/* =========================
                APP BODY
            ========================= */}
            <div className="app-body">

                {/* =========================
                    DESKTOP SIDEBAR
                    NORMAL USERS ONLY
                ========================= */}
                {!admin && (
                    <aside className="sidebar">

                       

                        <div className="facility-summary">
                            <span className="eyebrow">
                                YOUR FACILITY
                            </span>

                            <strong>
                                {user.facilityName}
                            </strong>

                            <span>
                                Healthcare workspace
                            </span>
                        </div>

                        <nav className="side-nav">
                            {navigationItems.map(
                                ({
                                    to,
                                    label,
                                    icon: Icon
                                }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        className={({
                                            isActive
                                        }) =>
                                            `side-link ${
                                                isActive
                                                    ? 'active'
                                                    : ''
                                            }`
                                        }
                                    >
                                        <Icon size={18} />

                                        <span>
                                            {label}
                                        </span>
                                    </NavLink>
                                )
                            )}
                        </nav>

                        <div className="sidebar-account">
                            <span className="eyebrow">
                                SIGNED IN AS
                            </span>

                            <strong>
                                {user.name}
                            </strong>

                            <span>
                                {user.role}
                            </span>
                        </div>

                        <button
                            className="sidebar-logout"
                            type="button"
                            onClick={handleSignOut}
                        >
                            <LogOut size={16} />

                            <span>
                                Sign out
                            </span>
                        </button>

                    </aside>
                )}

                {/* =========================
                    PAGE CONTENT
                ========================= */}
                <main
                    className={`page-content ${
                        admin
                            ? 'admin-page-content'
                            : ''
                    }`}
                >
                    {children}
                </main>

            </div>

        </div>
    );
}