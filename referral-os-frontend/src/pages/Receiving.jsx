import React, {
    useEffect,
    useState
} from 'react';

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

    const facilityId = user?.facilityId || 'mushin-phc';

    const load = async () => {
        setLoading(true);
        try {
            const [referralsData, facilitiesData] = await Promise.all([
                api.referrals.list({
                    facilityId,
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
    }, [facilityId]);

    const update = async (id, status) => {
        setActionLoading((prev) => ({ ...prev, [id]: true }));
        try {
            await api.referrals.updateStatus(id, status);
            await load();
        } finally {
            setActionLoading((prev) => ({ ...prev, [id]: false }));
        }
    };

    const awaiting = refs.filter(
        (referral) => referral.status === 'Created'
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
                subtitle={`Review and respond to referrals sent to ${user?.facilityName || 'your facility'}.`}
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
                            <ReferralCard
                                key={referral.id}
                                referral={referral}
                                facilityName={
                                    sendingFacility?.shortName ||
                                    referral.sendingFacility?.name ||
                                    'Sending PHC'
                                }
                                action={
                                    referral.status === 'Created' ? (
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
                                    ) : null
                                }
                            />
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