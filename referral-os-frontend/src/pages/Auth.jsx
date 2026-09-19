import React, { useState } from 'react';
import {
    Link,
    useNavigate
} from 'react-router-dom';

import { api } from '../services/api';


function Layout({
    title,
    copy,
    children
}) {
    return (
        <div className="auth-layout">
            <header className="mobile-auth-header">
                <Link
                    to="/"
                    className="mobile-auth-logo"
                >
                    ReferralOS
                </Link>
            </header>

            <div className="auth-page">
                <section className="auth-brand-panel">
                    <Link
                        to="/"
                        className="brand"
                    >
                        ReferralOS
                    </Link>

                    <div>
                        <span className="eyebrow">
                            CONNECTED CARE
                        </span>

                        <h1>
                            Move referrals.
                            <br />
                            Coordinate care.
                        </h1>

                        <p>
                            A real-time referral network
                            for healthcare facilities.
                        </p>
                    </div>

                    <span className="auth-footnote">
                        One network. One live referral journey.
                    </span>
                </section>

                <section className="auth-form-panel">
                    <div className="auth-header">
                        <h2>{title}</h2>
                        <p>{copy}</p>
                    </div>

                    {children}
                </section>
            </div>
        </div>
    );
}


function Field({
    label,
    children
}) {
    return (
        <label className="field">
            <span>{label}</span>
            {children}
        </label>
    );
}


export function SignIn() {
    const [form, setForm] = useState({
        email: '',
        password: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();


    const updateForm = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value
        }));

        if (error) {
            setError('');
        }
    };


    const handleSubmit = async (event) => {
        event.preventDefault();

        setError('');
        setLoading(true);

        try {
            const result = await api.auth.signIn(form);

            if (!result) {
                throw new Error(
                    'Unable to sign in. Please try again.'
                );
            }

            if (result.isAdmin) {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(
                err?.message ||
                'Invalid email or password.'
            );
        } finally {
            setLoading(false);
        }
    };


    return (
        <Layout
            title="Welcome back"
            copy="Sign in to continue coordinating referrals."
        >
            <form
                className="auth-form"
                onSubmit={handleSubmit}
            >
                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <Field label="EMAIL">
                    <input
                        required
                        type="email"
                        placeholder="name@facility.org"
                        value={form.email}
                        onChange={(event) =>
                            updateForm(
                                'email',
                                event.target.value
                            )
                        }
                    />
                </Field>

                <Field label="PASSWORD">
                    <input
                        required
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(event) =>
                            updateForm(
                                'password',
                                event.target.value
                            )
                        }
                    />
                </Field>

                <div className="form-row-between">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                        />

                        Remember me
                    </label>

                    <button
                        type="button"
                        className="text-button"
                    >
                        Forgot password?
                    </button>
                </div>

                <button
                    type="submit"
                    className="button primary full"
                    disabled={loading}
                >
                    {loading
                        ? 'Signing in...'
                        : 'Sign in'}
                </button>

                <button
                    type="button"
                    className="button secondary full"
                    onClick={() => navigate('/admin')}
                >
                    Sign in as Admin
                </button>

                <p className="auth-switch">
                    New to ReferralOS?{' '}
                    <Link to="/signup">
                        Create an account
                    </Link>
                </p>
            </form>
        </Layout>
    );
}


export function SignUp() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        gender: '',
        profession: 'Doctor',
        facility: 'Mushin PHC',
        password: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();


    const updateForm = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value
        }));

        if (error) {
            setError('');
        }
    };


    const handleSubmit = async (event) => {
        event.preventDefault();

        setError('');
        setLoading(true);

        try {
            const result = await api.auth.signUp(form);

            if (!result) {
                throw new Error(
                    'Unable to create your account. Please try again.'
                );
            }

            navigate('/dashboard');
        } catch (err) {
            setError(
                err?.message ||
                'Unable to create your account.'
            );
        } finally {
            setLoading(false);
        }
    };


    return (
        <Layout
            title="Create your account"
            copy="Set up your facility access in a few steps."
        >
            <form
                className="auth-form signup-form"
                onSubmit={handleSubmit}
            >
                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <div className="form-grid two">
                    <Field label="FULL NAME">
                        <input
                            required
                            placeholder="Amina Yusuf"
                            value={form.name}
                            onChange={(event) =>
                                updateForm(
                                    'name',
                                    event.target.value
                                )
                            }
                        />
                    </Field>

                    <Field label="FACILITY">
                        <select
                            required
                            value={form.facility}
                            onChange={(event) =>
                                updateForm(
                                    'facility',
                                    event.target.value
                                )
                            }
                        >
                            <option>
                                Mushin PHC
                            </option>

                            <option>
                                Surulere PHC
                            </option>

                            <option>
                                Lagos General
                            </option>

                            <option>
                                Ebute Metta CHC
                            </option>
                        </select>
                    </Field>
                </div>

                <div className="form-grid two">
                    <Field label="PHONE NUMBER">
                        <input
                            required
                            type="tel"
                            placeholder="0800 000 0000"
                            value={form.phone}
                            onChange={(event) =>
                                updateForm(
                                    'phone',
                                    event.target.value
                                )
                            }
                        />
                    </Field>

                    <Field label="GENDER">
                        <select
                            required
                            value={form.gender}
                            onChange={(event) =>
                                updateForm(
                                    'gender',
                                    event.target.value
                                )
                            }
                        >
                            <option value="">
                                Select
                            </option>

                            <option>
                                Male
                            </option>

                            <option>
                                Female
                            </option>
                        </select>
                    </Field>
                </div>

                <div className="form-grid two">
                    <Field label="PROFESSION">
                        <select
                            required
                            value={form.profession}
                            onChange={(event) =>
                                updateForm(
                                    'profession',
                                    event.target.value
                                )
                            }
                        >
                            <option>
                                Doctor
                            </option>

                            <option>
                                Nurse
                            </option>

                            <option>
                                Midwife
                            </option>

                            <option>
                                Other
                            </option>
                        </select>
                    </Field>

                    <Field label="EMAIL">
                        <input
                            required
                            type="email"
                            placeholder="name@facility.org"
                            value={form.email}
                            onChange={(event) =>
                                updateForm(
                                    'email',
                                    event.target.value
                                )
                            }
                        />
                    </Field>
                </div>

                <Field label="PASSWORD">
                    <input
                        required
                        minLength="8"
                        type="password"
                        placeholder="Create a password"
                        value={form.password}
                        onChange={(event) =>
                            updateForm(
                                'password',
                                event.target.value
                            )
                        }
                    />
                </Field>

                <button
                    type="submit"
                    className="button primary full"
                    disabled={loading}
                >
                    {loading
                        ? 'Creating account...'
                        : 'Create account'}
                </button>

                <p className="auth-switch">
                    Already have an account?{' '}
                    <Link to="/signin">
                        Sign in
                    </Link>
                </p>
            </form>
        </Layout>
    );
}