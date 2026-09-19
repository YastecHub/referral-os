import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import { Link } from 'react-router-dom';

import { api } from '../services/api';
import { facilities as mockFacilities } from '../data/mockData';

import {
    PageIntro,
    ReferralCard,
    StatCard,
    ReadinessRow
} from '../components/UI';


export default function Dashboard({ user }) {
    const [refs, setRefs] = useState([]);
    const [facilityList, setFacilityList] = useState(mockFacilities);
    const [activeTab, setActiveTab] = useState('Active');
    const [loading, setLoading] = useState(true);

    const facilityId = user?.facilityId || 'mushin-phc';

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.referrals.list({ facilityId }),
            api.facilities.list()
        ])
            .then(([referralsData, facilitiesData]) => {
                if (Array.isArray(referralsData)) setRefs(referralsData);
                if (Array.isArray(facilitiesData) && facilitiesData.length > 0) {
                    setFacilityList(facilitiesData);
                }
            })
            .finally(() => setLoading(false));
    }, [facilityId]);

    const sent = useMemo(
        () => refs.filter((r) => r.sendingFacilityId === facilityId),
        [refs, facilityId]
    );

    const received = useMemo(
        () => refs.filter((r) => r.receivingFacilityId === facilityId),
        [refs, facilityId]
    );

    const active = useMemo(
        () => refs.filter((r) => !['Care Confirmed', 'Feedback Sent'].includes(r.status)),
        [refs]
    );

    const past = useMemo(
        () => refs.filter((r) => ['Care Confirmed', 'Feedback Sent'].includes(r.status)),
        [refs]
    );

    const awaiting = useMemo(
        () => refs.filter((r) => r.status === 'Created').length,
        [refs]
    );

    // Find the current facility from live facility list or default to a safe object
    const facility = useMemo(() => {
        const found = facilityList.find(
            (item) => item.id === facilityId || item.name === user?.facilityName
        );
        return (
            found || {
                id: facilityId,
                name: user?.facilityName || 'Facility Workspace',
                shortName: user?.facilityName || 'Facility',
                acceptingReferrals: true,
                readiness: {
                    blood: true,
                    theater: true,
                    specialist: true,
                    percentage: 85
                }
            }
        );
    }, [facilityList, facilityId, user?.facilityName]);

    // Determine referrals to display based on selected tab
    const displayedRefs = useMemo(() => {
        switch (activeTab) {
            case 'Sent':
                return sent;
            case 'Received':
                return received;
            case 'Past':
                return past;
            case 'Active':
            default:
                return active;
        }
    }, [activeTab, active, sent, received, past]);

    const tabCounts = {
        Active: active.length,
        Sent: sent.length,
        Received: received.length,
        Past: past.length
    };

    return (
        <div>
            <PageIntro
                eyebrow="FACILITY DASHBOARD"
                title={`Good morning, ${user?.name ? user.name.replace('Dr. ', '') : 'Doctor'}`}
                subtitle={`${facility.shortName || user?.facilityName} • Live`}
                action={
                    <Link
                        to="/sending"
                        className="button accent"
                    >
                        + Create referral
                    </Link>
                }
            />

            <div className="stats-grid">
                <StatCard
                    value={active.length}
                    label="Active referrals"
                />

                <StatCard
                    value={awaiting}
                    label="Awaiting response"
                    tone="warning"
                />

                <StatCard
                    value={refs.length}
                    label="Sent / received today"
                />

                <StatCard
                    value={received.length}
                    label="Received"
                />
            </div>

            <div className="dashboard-tabs">
                {['Active', 'Sent', 'Received', 'Past'].map((tab) => (
                    <span
                        key={tab}
                        className={activeTab === tab ? 'active' : ''}
                        onClick={() => setActiveTab(tab)}
                        style={{ cursor: 'pointer' }}
                    >
                        {tab} ({tabCounts[tab]})
                    </span>
                ))}
            </div>

            <section>
                <div className="section-heading">
                    <div>
                        <h2>{activeTab} referrals</h2>
                        <p>
                            {activeTab === 'Active' && 'Referrals currently moving through your facility.'}
                            {activeTab === 'Sent' && 'Referrals initiated by your facility to receiving centers.'}
                            {activeTab === 'Received' && 'Referrals directed to your facility for intake and care.'}
                            {activeTab === 'Past' && 'Completed referrals with care confirmed or feedback submitted.'}
                        </p>
                    </div>

                    <Link
                        to="/receiving"
                        className="button secondary small"
                    >
                        Respond to referral
                    </Link>
                </div>

                <div className="referral-list">
                    {displayedRefs.length > 0 ? (
                        displayedRefs.map((referral) => {
                            const otherFacility = facilityList.find(
                                (f) =>
                                    f.id === (referral.sendingFacilityId === facilityId
                                        ? referral.receivingFacilityId
                                        : referral.sendingFacilityId)
                            );
                            return (
                                <ReferralCard
                                    key={referral.id}
                                    referral={referral}
                                    facilityName={
                                        otherFacility?.shortName ||
                                        (referral.sendingFacilityId === facilityId
                                            ? 'Lagos General'
                                            : facility.shortName)
                                    }
                                />
                            );
                        })
                    ) : (
                        <div className="panel" style={{ textAlign: 'center', padding: '2.5rem', color: '#666' }}>
                            {loading ? 'Loading referrals from network...' : `No ${activeTab.toLowerCase()} referrals at this time.`}
                        </div>
                    )}
                </div>
            </section>

            <div className="dashboard-bottom-grid">
                <div className="panel readiness-panel">
                    <h2>Facility status</h2>

                    <ReadinessRow
                        label="Accepting referrals"
                        available={facility.acceptingReferrals}
                    />

                    <ReadinessRow
                        label="Theatre"
                        available={facility.readiness?.theater}
                    />

                    <ReadinessRow
                        label="Blood"
                        available={facility.readiness?.blood}
                    />
                </div>

                <div className="panel action-panel">
                    <h2>Need to act?</h2>
                    <p>
                        New referrals needing a response appear in Receiving.
                    </p>

                    <Link
                        to="/receiving"
                        className="button secondary"
                    >
                        Review incoming ({awaiting})
                    </Link>
                </div>
            </div>
        </div>
    );
}