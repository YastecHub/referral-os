import React from 'react';
import {
    Activity,
    ArrowRight,
    Check,
    Radio,
    Route
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
    const workflowItems = [
        [
            Activity,
            'Connected care',
            'Send structured referral information between facilities.'
        ],
        [
            Check,
            'Clear information',
            'Keep requirements, urgency and status visible to care teams.'
        ],
        [
            Route,
            'Real-time visibility',
            'Track the referral journey as it moves through the network.'
        ]
    ];

    const previewItems = [
        [
            'NEW REFERRAL',
            'Suspected obstetric emergency',
            'Requirements structured by AI',
            'URGENT'
        ],
        [
            'MATCH FOUND',
            'Lagos General Hospital',
            'Theatre • Blood • Specialist',
            'AVAILABLE'
        ],
        [
            'ROUTE STATUS',
            'Receiving facility notified',
            'Referral is actively moving',
            'LIVE'
        ]
    ];

    return (
        <div className="marketing">
            <nav className="marketing-nav">
                <Link to="/" className="brand">
                    ReferralOS
                </Link>

                <div className="marketing-links">
                    <a href="#how">How it works</a>
                    <a href="#about">About</a>

                    <Link
                        to="/signin"
                        className="nav-signin"
                    >
                        Sign in
                    </Link>
                </div>
            </nav>

            <section className="hero">
                <div className="hero-copy">
                    <span className="eyebrow">
                        LIVE REFERRAL NETWORK
                    </span>

                    <h1>
                        Referrals that move with the patient.
                    </h1>

                    <p>
                        ReferralOS connects referring facilities
                        with receiving hospitals in real time.
                    </p>

                    <div className="hero-actions">
                        <Link
                            className="button primary"
                            to="/signup"
                        >
                            Get started
                            <ArrowRight size={17} />
                        </Link>

                        <a
                            className="button secondary"
                            href="#how"
                        >
                            See how it works
                        </a>
                    </div>

                    <span className="supporting-line">
                        Built for PHCs, hospitals and live coordination.
                    </span>
                </div>

                <div className="network-preview">
                    <div className="preview-head">
                        <div>
                            <strong>ReferralOS</strong>
                            <span>
                                LIVE REFERRAL NETWORK
                            </span>
                        </div>

                        <Radio size={18} />
                    </div>

                    {previewItems.map((item) => (
                        <div
                            className="preview-item"
                            key={item[0]}
                        >
                            <span>{item[0]}</span>

                            <strong>{item[1]}</strong>

                            <small>{item[2]}</small>

                            <b className="mini-badge">
                                {item[3]}
                            </b>
                        </div>
                    ))}
                </div>
            </section>

            <section
                className="workflow"
                id="how"
            >
                <span className="eyebrow">
                    ONE CONNECTED WORKFLOW
                </span>

                <h2>
                    From referral creation to receiving care.
                </h2>

                <div className="workflow-grid">
                    {workflowItems.map(
                        ([Icon, title, description], index) => (
                            <div
                                className="workflow-card"
                                key={title}
                            >
                                <span>
                                    0{index + 1}
                                </span>

                                <Icon size={20} />

                                <h3>{title}</h3>

                                <p>{description}</p>
                            </div>
                        )
                    )}
                </div>
            </section>

            <section
                className="about-section"
                id="about"
            >
                <div>
                    <span className="eyebrow">
                        ABOUT REFERRALOS
                    </span>

                    <h2>
                        A shared referral workspace for connected care.
                    </h2>

                    <p>
                        ReferralOS gives healthcare workers
                        a structured way to send, receive and
                        monitor referrals across participating
                        Nigerian facilities.
                    </p>
                </div>

                <div className="about-points">
                    <span>
                        <Check size={16} />
                        One connected workflow
                    </span>

                    <span>
                        <Check size={16} />
                        Structured clinical requirements
                    </span>

                    <span>
                        <Check size={16} />
                        Live referral visibility
                    </span>
                </div>
            </section>
        </div>
    );
}