import React, {
    useEffect,
    useState
} from 'react';

import { api } from '../services/api';

import {
    PageIntro,
    ReferralCard,
    StatCard
} from '../components/UI';


export default function Receiving({ user }) {
    const [refs, setRefs] = useState([]);


    const load = async () => {
        setRefs(
            await api.referrals.list({
                facilityId: user.facilityId,
                direction: 'received'
            })
        );
    };


    useEffect(() => {
        load();
    }, []);


    const update = async (id, status) => {
        await api.referrals.updateStatus(
            id,
            status
        );

        await load();
    };


    const awaiting = refs.filter(
        (referral) =>
            referral.status === 'Created'
    ).length;


    const urgent = refs.filter(
        (referral) =>
            [
                'Emergency',
                'Urgent'
            ].includes(referral.urgency)
    ).length;


    const accepted = refs.filter(
        (referral) =>
            referral.status === 'Accepted'
    ).length;


    return (
        <div>
            <PageIntro
                eyebrow="RECEIVING"
                title="Incoming referrals"
                subtitle="Review and respond to referrals sent to your facility."
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
                {refs.map((referral) => (
                    <ReferralCard
                        key={referral.id}
                        referral={referral}
                        facilityName={
                            referral.sendingFacilityId ===
                            'mushin-phc'
                                ? 'Mushin PHC'
                                : 'Surulere PHC'
                        }
                        action={
                            referral.status === 'Created' ? (
                                <>
                                    <button
                                        className="button secondary"
                                        onClick={() =>
                                            update(
                                                referral.id,
                                                'Facility Identified'
                                            )
                                        }
                                    >
                                        Can't accept
                                    </button>

                                    <button
                                        className="button primary"
                                        onClick={() =>
                                            update(
                                                referral.id,
                                                'Accepted'
                                            )
                                        }
                                    >
                                        Accept
                                    </button>
                                </>
                            ) : null
                        }
                    />
                ))}
            </div>
        </div>
    );
}