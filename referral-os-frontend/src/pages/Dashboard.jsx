import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import { Link } from 'react-router-dom';

import { api } from '../services/api';
import { facilities } from '../data/mockData';

import {
    PageIntro,
    ReferralCard,
    StatCard,
    ReadinessRow
} from '../components/UI';


export default function Dashboard({ user }) {
    const [refs, setRefs] = useState([]);


    useEffect(() => {
        api.referrals
            .list({
                facilityId: user.facilityId
            })
            .then(setRefs);
    }, [user.facilityId]);


    const sent = useMemo(
        () =>
            refs.filter(
                (referral) =>
                    referral.sendingFacilityId ===
                    user.facilityId
            ),
        [refs, user.facilityId]
    );


    const received = useMemo(
        () =>
            refs.filter(
                (referral) =>
                    referral.receivingFacilityId ===
                    user.facilityId
            ),
        [refs, user.facilityId]
    );


    const active = refs.filter(
        (referral) =>
            ![
                'Care Confirmed',
                'Feedback Sent'
            ].includes(referral.status)
    );


    const awaiting = refs.filter(
        (referral) =>
            referral.status === 'Created'
    ).length;


    const facility = facilities.find(
        (item) => item.id === user.facilityId
    );


    return (
        <div>
            <PageIntro
                eyebrow="FACILITY DASHBOARD"
                title={`Good morning, ${user.name.replace(
                    'Dr. ',
                    ''
                )}`}
                subtitle={`${
                    facility?.shortName ||
                    user.facilityName
                } • Live`}
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
                <span className="active">
                    Active
                </span>

                <span>Sent</span>
                <span>Received</span>
                <span>Past</span>
            </div>


            <section>
                <div className="section-heading">
                    <div>
                        <h2>Active referrals</h2>

                        <p>
                            Referrals currently moving
                            through your facility.
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
                    {active
                        .slice(0, 3)
                        .map((referral) => (
                            <ReferralCard
                                key={referral.id}
                                referral={referral}
                                facilityName={
                                    referral.sendingFacilityId ===
                                    user.facilityId
                                        ? 'Lagos General'
                                        : facility.shortName
                                }
                            />
                        ))}
                </div>
            </section>


            <div className="dashboard-bottom-grid">
                <div className="panel readiness-panel">
                    <h2>Facility status</h2>

                    <ReadinessRow
                        label="Accepting referrals"
                        available={
                            facility.acceptingReferrals
                        }
                    />

                    <ReadinessRow
                        label="Theatre"
                        available={
                            facility.readiness.theater
                        }
                    />

                    <ReadinessRow
                        label="Blood"
                        available={
                            facility.readiness.blood
                        }
                    />
                </div>


                <div className="panel action-panel">
                    <h2>Need to act?</h2>

                    <p>
                        New referrals needing a response
                        appear in Receiving.
                    </p>

                    <Link
                        to="/receiving"
                        className="button secondary"
                    >
                        Review incoming
                    </Link>
                </div>
            </div>
        </div>
    );
}