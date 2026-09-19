import React, {
    useEffect,
    useState
} from 'react';
import { Volume2 } from 'lucide-react';

import { api } from '../services/api';
import { facilities as mockFacilities } from '../data/mockData';

import {
    PageIntro,
    ReferralCard,
    StatCard
} from '../components/UI';


export default function Receiving({ user }) {
    const [refs, setRefs] = useState([]);
    const [facilities, setFacilities] = useState(mockFacilities);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [filterFacility, setFilterFacility] = useState('all');

    const load = async () => {
        setLoading(true);
        try {
            const [referralsData, facilitiesData] = await Promise.all([
                api.referrals.list({
                    facilityId: filterFacility,
                    direction: 'received'
                }),
                api.facilities.list()
            ]);

            if (Array.isArray(referralsData)) setRefs(referralsData);
            if (Array.isArray(facilitiesData) && facilitiesData.length > 0) {
                setFacilities(facilitiesData);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [filterFacility, user?.facilityId]);

    const update = async (id, status) => {
        setActionLoading((prev) => ({ ...prev, [id]: true }));
        // Instant optimistic UI update
        setRefs((prev) => prev.map((r) => (r.id === id || r.backendId === id ? { ...r, status, isNew: false } : r)));
        try {
            await api.referrals.updateStatus(id, status);
        } finally {
            setActionLoading((prev) => ({ ...prev, [id]: false }));
        }
    };

    const playAlert = (referral) => {
        if (!('speechSynthesis' in window)) {
            alert('Web Speech API is not supported in this browser.');
            return;
        }
        window.speechSynthesis.cancel();
        const text = `Emergency alert: Incoming ${referral.urgency} referral for ${referral.patientReference}. Required capabilities: ${referral.requirements.join(', ')}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    };

    const awaiting = refs.filter(
        (referral) => ['Created', 'Facility Identified'].includes(referral.status)
    ).length;

    const urgent = refs.filter(
        (referral) => ['Emergency', 'Urgent'].includes(referral.urgency)
    ).length;

    const accepted = refs.filter(
        (referral) => referral.status === 'Accepted'
    ).length;

    return (
        <div>
            <PageIntro
                eyebrow="RECEIVING"
                title="Incoming referrals"
                subtitle="Review and respond to incoming referrals in real time across the network."
            />

            <div className="stats-grid compact">
                <StatCard
                    value={awaiting}
                    label="Awaiting response"
                />

                <StatCard
                    value={urgent}
                    label="Urgent"
                    tone="danger"
                />

                <StatCard
                    value={accepted}
                    label="Accepted"
                    tone="success"
                />
            </div>

            {/* Quick Facility Filter Selector for Pitch Demo */}
            <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    🏥 Receiving Hospital Filter:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className={`button ${filterFacility === 'all' ? 'primary' : 'secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => setFilterFacility('all')}
                    >
                        🌐 All Network Incoming ({refs.length})
                    </button>
                    <button
                        type="button"
                        className={`button ${filterFacility === 'gbagada-general' ? 'primary' : 'secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => setFilterFacility('gbagada-general')}
                    >
                        🏨 Gbagada General Hospital
                    </button>
                    <button
                        type="button"
                        className={`button ${filterFacility === 'lasuth' ? 'primary' : 'secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => setFilterFacility('lasuth')}
                    >
                        🏥 LASUTH Teaching Hospital
                    </button>
                    <button
                        type="button"
                        className={`button ${filterFacility === 'lagos-island' ? 'primary' : 'secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => setFilterFacility('lagos-island')}
                    >
                        🏥 Lagos Island General
                    </button>
                </div>
            </div>

            <div className="section-heading">
                <div>
                    <h2>Priority queue</h2>
                    <p>
                        {awaiting} awaiting response
                    </p>
                </div>

                <span className="live-indicator">
                    ● LIVE QUEUE
                </span>
            </div>

            <div className="referral-list">
                {refs.length > 0 ? (
                    refs.map((referral) => {
                        const sendingFacility = facilities.find(
                            (f) => f.id === referral.sendingFacilityId || f.name === referral.sendingFacility?.name
                        );
                        const isActing = actionLoading[referral.id];

                        return (
                            <div
                                key={referral.id}
                                style={{
                                    border: referral.isNew ? '2px solid #22c55e' : undefined,
                                    borderRadius: referral.isNew ? '12px' : undefined,
                                    boxShadow: referral.isNew ? '0 0 15px rgba(34, 197, 94, 0.2)' : undefined,
                                    position: 'relative'
                                }}
                            >
                                {referral.isNew && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        right: '16px',
                                        background: '#22c55e',
                                        color: '#ffffff',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        letterSpacing: '0.05em',
                                        zIndex: 2
                                    }}>
                                        ⚡ NEWLY DISPATCHED
                                    </div>
                                )}

                                <ReferralCard
                                    referral={referral}
                                    facilityName={
                                        sendingFacility?.shortName ||
                                        referral.sendingFacility?.name ||
                                        'Sending PHC'
                                    }
                                    action={
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                className="button secondary"
                                                title="Listen to spoken audio alert"
                                                onClick={() => playAlert(referral)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                            >
                                                <Volume2 size={15} /> Listen Alert
                                            </button>

                                            {['Created', 'Facility Identified'].includes(referral.status) && (
                                                <>
                                                    <button
                                                        className="button secondary"
                                                        disabled={isActing}
                                                        onClick={() =>
                                                            update(
                                                                referral.id,
                                                                'Facility Identified'
                                                            )
                                                        }
                                                    >
                                                        {isActing ? 'Updating...' : "Can't accept"}
                                                    </button>

                                                    <button
                                                        className="button primary"
                                                        disabled={isActing}
                                                        onClick={() =>
                                                            update(
                                                                referral.id,
                                                                'Accepted'
                                                            )
                                                        }
                                                    >
                                                        {isActing ? 'Accepting...' : 'Accept'}
                                                    </button>
                                                </>
                                            )}

                                            {referral.status === 'Accepted' && (
                                                <>
                                                    <button
                                                        className="button secondary"
                                                        disabled={isActing}
                                                        onClick={() => update(referral.id, 'In Transit')}
                                                    >
                                                        Mark In Transit
                                                    </button>

                                                    <button
                                                        className="button primary"
                                                        disabled={isActing}
                                                        onClick={() => update(referral.id, 'Care Confirmed')}
                                                    >
                                                        Confirm Care
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    }
                                />
                            </div>
                        );
                    })
                ) : (
                    <div className="panel" style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                        {loading ? 'Checking for incoming referrals...' : 'No incoming referrals in queue at this time.'}
                    </div>
                )}
            </div>
        </div>
    );
}