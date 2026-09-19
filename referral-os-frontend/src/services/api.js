import {
    currentUser,
    facilities,
    referrals,
    networkSnapshot
} from '../data/mockData';


const delay = (value, milliseconds = 180) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(value);
        }, milliseconds);
    });
};


export const api = {
    auth: {
        async signIn(credentials) {
            const isAdmin =
                credentials.email
                    ?.toLowerCase()
                    .includes('admin');

            return delay({
                user: isAdmin
                    ? {
                        ...currentUser,
                        name: 'Admin Operations',
                        role: 'Admin'
                    }
                    : currentUser,
                isAdmin
            });
        },

        async signUp(payload) {
            return delay({
                user: {
                    ...currentUser,
                    ...payload
                }
            });
        }
    },


    referrals: {
        async list({
            facilityId,
            direction = 'all'
        } = {}) {
            let result = [...referrals];

            if (facilityId) {
                result = result.filter((referral) => {
                    if (direction === 'sent') {
                        return (
                            referral.sendingFacilityId ===
                            facilityId
                        );
                    }

                    if (direction === 'received') {
                        return (
                            referral.receivingFacilityId ===
                            facilityId
                        );
                    }

                    return (
                        referral.sendingFacilityId ===
                        facilityId ||
                        referral.receivingFacilityId ===
                        facilityId
                    );
                });
            }

            return delay(result);
        },


        async create(referral) {
            const created = {
                ...referral,
                id: `REF-${Math.floor(
                    2500 + Math.random() * 7000
                )}`,
                status: 'Created',
                createdAt: new Date().toISOString()
            };

            referrals.unshift(created);

            return delay(created);
        },


        async updateStatus(id, status) {
            const referral = referrals.find(
                (item) => item.id === id
            );

            if (!referral) {
                throw new Error('Referral not found');
            }

            referral.status = status;

            return delay(referral);
        },


        async structureWithAI(note) {
            return delay(
                {
                    patientReference: 'Synthetic case',
                    age: 29,
                    sex: 'Female',
                    urgency:
                        /bleed|unstable|emergency/i.test(
                            note
                        )
                            ? 'Emergency'
                            : 'Urgent',
                    requirements: [
                        'Emergency obstetric',
                        'Blood transfusion'
                    ],
                    notes: note
                },
                650
            );
        }
    },


    facilities: {
        async list() {
            return delay(facilities);
        },

        async networkSummary() {
            return delay(networkSnapshot);
        }
    }
};