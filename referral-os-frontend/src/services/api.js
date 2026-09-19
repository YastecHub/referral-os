import {
    currentUser as defaultMockUser,
    facilities as mockFacilities,
    referrals as mockReferrals,
    networkSnapshot as mockNetworkSnapshot
} from '../data/mockData';

// Dynamic API Base URL:
// - Defaults to local backend when on localhost
// - Defaults to deployed Render backend in production/Vercel
// - Respects VITE_API_URL environment variable if set
const API_BASE = (
    import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:4000/api'
        : 'https://referral-os-qpox.onrender.com/api')
).replace(/\/+$/, '');

// In-memory & localStorage active referrals store so updates persist across pages and reloads
const STORAGE_KEY = 'referralos_live_referrals';

function getStoredReferrals() {
    try {
        if (typeof window !== 'undefined') {
            const item = localStorage.getItem(STORAGE_KEY);
            if (item) {
                const parsed = JSON.parse(item);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        }
    } catch {}
    return [...mockReferrals];
}

function saveStoredReferrals(list) {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
    } catch {}
}

let localReferrals = getStoredReferrals();

// Helper: HTTP request with JSON handling, auth header, and timeout
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('referralos_token') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 8000);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message = errorBody.message || errorBody.error || `HTTP ${response.status}: ${response.statusText}`;
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// Data Normalizer: Backend Referral -> Frontend UI Model
function normalizeReferral(item) {
    if (!item) return null;

    const urgencyMap = {
        CRITICAL: 'Emergency',
        HIGH: 'Urgent',
        MEDIUM: 'Routine',
        LOW: 'Routine',
        Emergency: 'Emergency',
        Urgent: 'Urgent',
        Routine: 'Routine'
    };

    const statusMap = {
        CREATED: 'Created',
        MATCHED: 'Facility Identified',
        ACCEPTED: 'Accepted',
        TRANSPORT_REQUESTED: 'Transport Requested',
        IN_TRANSIT: 'In Transit',
        ARRIVED: 'Arrived',
        CARE_CONFIRMED: 'Care Confirmed',
        FEEDBACK_SENT: 'Feedback Sent',
        Created: 'Created',
        'Facility Identified': 'Facility Identified',
        Accepted: 'Accepted',
        'Transport Requested': 'Transport Requested',
        'In Transit': 'In Transit',
        Arrived: 'Arrived',
        'Care Confirmed': 'Care Confirmed',
        'Feedback Sent': 'Feedback Sent'
    };

    return {
        id: item.refCode || item.id,
        backendId: item.id,
        sendingFacilityId: item.sendingFacilityId || 'mushin-phc',
        receivingFacilityId: item.receivingFacilityId || 'lagos-general',
        patientReference: item.patientName || item.patientReference || (item.refCode ? `Case ${item.refCode}` : 'Patient Case'),
        age: item.patientAge ?? item.age ?? 28,
        sex: item.patientGender || item.sex || item.gender || 'Female',
        urgency: urgencyMap[item.urgencyTier] || urgencyMap[item.urgency] || 'Urgent',
        requirements: Array.isArray(item.requiredCapabilities) && item.requiredCapabilities.length > 0
            ? item.requiredCapabilities
            : (Array.isArray(item.requirements) && item.requirements.length > 0 ? item.requirements : ['Emergency obstetric']),
        notes: item.rawNotes || item.chiefComplaint || item.notes || 'Emergency clinical referral notes.',
        status: statusMap[item.status] || item.status || 'Created',
        createdAt: item.createdAt || new Date().toISOString(),
        sendingFacility: item.sendingFacility,
        receivingFacility: item.receivingFacility
    };
}

// Data Normalizer: Backend Facility -> Frontend UI Model
function normalizeFacility(f) {
    if (!f) return null;

    const tierLabel = f.tierLabel || (
        f.tier === 'PHC' ? 'Tier 1 PHC' :
        f.tier === 'SECONDARY' ? 'Tier 2 CHC' : 'Tertiary Hospital'
    );

    return {
        id: f.id,
        name: f.name,
        shortName: f.shortName || f.name.replace(/Primary Health Centre|Comprehensive Health Centre|Hospital/gi, '').trim(),
        type: f.type || tierLabel,
        acceptingReferrals: f.availability === 'Available' || f.availability === 'ACCEPTING' || f.acceptingReferrals !== false,
        readiness: {
            blood: f.bloodStock !== undefined ? f.bloodStock > 0 : Boolean(f.readiness?.blood),
            theater: f.theatreAvailable !== undefined ? Boolean(f.theatreAvailable) : Boolean(f.readiness?.theater),
            specialist: f.specialistsOnDuty !== undefined ? f.specialistsOnDuty > 0 : Boolean(f.readiness?.specialist),
            percentage: f.readiness?.percentage || (f.tier === 'TERTIARY' ? 97 : f.tier === 'SECONDARY' ? 94 : 72)
        },
        location: {
            lat: f.lat || f.location?.lat || 6.5244,
            lng: f.lng || f.location?.lng || 3.3792
        }
    };
}

export const api = {
    auth: {
        async signIn(credentials) {
            const isAdminRequested = credentials.email?.toLowerCase().includes('admin') || Boolean(credentials.isAdmin);

            try {
                const result = await request('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: credentials.email,
                        password: credentials.password,
                        isAdmin: isAdminRequested
                    })
                });

                if (result?.token) {
                    localStorage.setItem('referralos_token', result.token);
                }

                const backendUser = result?.user || {};
                const user = {
                    id: backendUser.id || 'user-001',
                    name: backendUser.name || backendUser.fullName || credentials.email.split('@')[0],
                    profession: backendUser.profession || (backendUser.role === 'ADMIN' ? 'Network Admin' : 'Doctor'),
                    facilityId: backendUser.facilityId || backendUser.facility?.id || 'mushin-phc',
                    facilityName: backendUser.facility?.name || 'Mushin Primary Health Centre',
                    role: backendUser.role || (isAdminRequested ? 'Admin' : 'Healthcare Worker'),
                    isAdmin: backendUser.role === 'ADMIN' || isAdminRequested
                };

                localStorage.setItem('referralos_user', JSON.stringify(user));

                return {
                    user,
                    isAdmin: user.isAdmin,
                    token: result.token
                };
            } catch (err) {
                console.warn('Backend login unavailable, falling back to mock authentication:', err.message);

                // Fallback authentication for offline or demo testing
                const user = isAdminRequested
                    ? {
                        ...defaultMockUser,
                        name: 'Admin Operations',
                        role: 'Admin',
                        profession: 'Network Admin',
                        isAdmin: true
                    }
                    : {
                        ...defaultMockUser,
                        name: credentials.email ? `Dr. ${credentials.email.split('@')[0]}` : defaultMockUser.name,
                        isAdmin: false
                    };

                localStorage.setItem('referralos_user', JSON.stringify(user));
                return { user, isAdmin: user.isAdmin };
            }
        },

        async signUp(payload) {
            try {
                const result = await request('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        fullName: payload.name,
                        email: payload.email,
                        phoneNumber: payload.phone,
                        gender: payload.gender,
                        profession: payload.profession,
                        facility: payload.facility,
                        password: payload.password
                    })
                });

                if (result?.token) {
                    localStorage.setItem('referralos_token', result.token);
                }

                const backendUser = result?.user || {};
                const user = {
                    id: backendUser.id || 'user-registered',
                    name: backendUser.name || payload.name,
                    profession: payload.profession,
                    facilityId: backendUser.facilityId || 'mushin-phc',
                    facilityName: payload.facility,
                    role: backendUser.role || 'Healthcare Worker',
                    isAdmin: false
                };

                localStorage.setItem('referralos_user', JSON.stringify(user));
                return { user };
            } catch (err) {
                console.warn('Backend register unavailable, falling back to mock signup:', err.message);
                const user = {
                    ...defaultMockUser,
                    name: payload.name || defaultMockUser.name,
                    facilityName: payload.facility || defaultMockUser.facilityName,
                    profession: payload.profession || defaultMockUser.profession
                };
                localStorage.setItem('referralos_user', JSON.stringify(user));
                return { user };
            }
        },

        async getFacilities() {
            try {
                const facilities = await request('/auth/facilities');
                if (Array.isArray(facilities) && facilities.length > 0) {
                    return facilities.map(normalizeFacility);
                }
            } catch (err) {
                console.warn('Could not fetch facilities list for auth, using mock facilities:', err.message);
            }
            return mockFacilities;
        },

        getCurrentUser() {
            try {
                const stored = localStorage.getItem('referralos_user');
                if (stored) {
                    return JSON.parse(stored);
                }
            } catch {}
            return defaultMockUser;
        },

        signOut() {
            try {
                localStorage.removeItem('referralos_token');
                localStorage.removeItem('referralos_user');
            } catch {}
        }
    },

    referrals: {
        async list({ facilityId, direction = 'all' } = {}) {
            localReferrals = getStoredReferrals();

            let backendNormalized = [];
            try {
                let endpoint = '/referrals';
                if (direction === 'received') {
                    endpoint = '/referrals/incoming';
                }

                const backendData = await request(endpoint, { timeout: 2000 });
                const rawList = Array.isArray(backendData)
                    ? backendData
                    : (backendData?.referrals || backendData?.data || []);

                if (rawList.length > 0) {
                    backendNormalized = rawList.map(normalizeReferral);
                }
            } catch (err) {
                // Backend slow, offline or unauthorized - smoothly use localReferrals
            }

            // Merge referrals: local referrals take precedence
            const combinedMap = new Map();
            localReferrals.forEach((ref) => {
                if (ref?.id) combinedMap.set(ref.id, ref);
            });
            backendNormalized.forEach((ref) => {
                if (ref?.id && !combinedMap.has(ref.id)) {
                    combinedMap.set(ref.id, ref);
                }
            });

            let result = Array.from(combinedMap.values());

            // If facility filtering is requested
            if (facilityId && facilityId !== 'all') {
                const filtered = result.filter((referral) => {
                    // Always include newly created referrals in incoming queue for pitch demo!
                    if (referral.isNew) return true;

                    const matchSending = referral.sendingFacilityId === facilityId ||
                        referral.sendingFacility?.name?.toLowerCase().includes(String(facilityId).toLowerCase());
                    const matchReceiving = referral.receivingFacilityId === facilityId ||
                        referral.receivingFacility?.name?.toLowerCase().includes(String(facilityId).toLowerCase());

                    if (direction === 'sent') return matchSending;
                    if (direction === 'received') return matchReceiving;
                    return matchSending || matchReceiving;
                });

                if (filtered.length > 0) return filtered;
            }

            return result;
        },

        async create(referral) {
            // 1. Create immediate local record with guaranteed ID and rich facility details
            const newId = `REF-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
            
            const receivingFacName = referral.receivingFacilityName ||
                (referral.receivingFacilityId === 'lasuth' ? 'LASUTH — Teaching Hospital' :
                 referral.receivingFacilityId === 'lagos-island' ? 'Lagos Island General Hospital' :
                 'Gbagada General Hospital');

            const newReferral = {
                id: newId,
                backendId: newId,
                refCode: newId,
                patientReference: referral.patientReference || `Case ${newId}`,
                patientName: referral.patientReference || 'Emergency Patient Case',
                age: Number(referral.age) || 28,
                sex: referral.sex || 'Female',
                gender: referral.sex || 'Female',
                urgency: referral.urgency || 'Emergency',
                urgencyTier: referral.urgency === 'Emergency' ? 'CRITICAL' : referral.urgency === 'Urgent' ? 'HIGH' : 'MEDIUM',
                requirements: Array.isArray(referral.requirements) && referral.requirements.length > 0
                    ? referral.requirements
                    : ['Obstetric Emergency', 'Blood bank', 'Theatre'],
                requiredCapabilities: Array.isArray(referral.requirements) && referral.requirements.length > 0
                    ? referral.requirements
                    : ['Obstetric Emergency', 'Blood bank', 'Theatre'],
                notes: referral.notes || 'Emergency clinical referral notes.',
                rawNotes: referral.notes || '',
                clinicalFindings: referral.notes || '',
                sendingFacilityId: referral.sendingFacilityId || 'surulere-phc',
                receivingFacilityId: referral.receivingFacilityId || 'gbagada-general',
                sendingFacility: {
                    id: referral.sendingFacilityId || 'surulere-phc',
                    name: 'Surulere PHC — Aguda',
                    shortName: 'Surulere PHC'
                },
                receivingFacility: {
                    id: referral.receivingFacilityId || 'gbagada-general',
                    name: receivingFacName,
                    shortName: receivingFacName.replace(/Hospital|General/gi, '').trim() || 'Gbagada General'
                },
                status: 'Created',
                createdAt: new Date().toISOString(),
                isNew: true
            };

            // 2. Prepend to local storage immediately so it persists everywhere
            localReferrals = [newReferral, ...localReferrals.filter(r => r.id !== newId)];
            saveStoredReferrals(localReferrals);

            // 3. Fast background attempt to sync with backend without blocking UI
            request('/referrals', {
                method: 'POST',
                body: JSON.stringify({
                    patientName: newReferral.patientName,
                    age: newReferral.age,
                    gender: newReferral.gender,
                    urgency: newReferral.urgency,
                    requiredCapabilities: newReferral.requiredCapabilities,
                    notes: newReferral.notes,
                    sendingFacilityId: newReferral.sendingFacilityId,
                    receivingFacilityId: newReferral.receivingFacilityId
                }),
                timeout: 1500
            }).then((createdBackend) => {
                if (createdBackend?.id || createdBackend?.referral?.id) {
                    const realId = createdBackend?.refCode || createdBackend?.referral?.refCode || newReferral.id;
                    newReferral.backendId = createdBackend?.id || createdBackend?.referral?.id;
                    newReferral.refCode = realId;
                    saveStoredReferrals(localReferrals);
                }
            }).catch((err) => {
                console.warn('Backend async sync skipped, kept local:', err.message);
            });

            return newReferral;
        },

        async updateStatus(id, status) {
            localReferrals = getStoredReferrals();
            const index = localReferrals.findIndex((item) => item.id === id || item.backendId === id);
            if (index !== -1) {
                localReferrals[index].status = status;
                saveStoredReferrals(localReferrals);
            }

            try {
                let endpoint = `/referrals/${id}/status`;
                let method = 'POST';
                if (status === 'Accepted') endpoint = `/referrals/${id}/accept`;
                else if (status === 'Facility Identified' || status === 'Rejected') endpoint = `/referrals/${id}/cant-accept`;

                request(endpoint, {
                    method,
                    body: JSON.stringify({ status }),
                    timeout: 2000
                }).catch(() => {});
            } catch {}

            return { id, status };
        },

        async getMatchCandidates({ urgency, requirements, sendingFacilityId } = {}) {
            const defaultCandidates = [
                {
                    facilityId: 'gbagada-general',
                    name: 'Gbagada General Hospital',
                    tier: 'SECONDARY',
                    tierLabel: 'Secondary Hospital',
                    readinessScore: 95,
                    distanceKm: 3.8,
                    bloodStock: 12,
                    theatreAvailable: true,
                    specialistsOnDuty: 3,
                    bedsAvailable: 8,
                    status: 'Available',
                    reason: 'Top recommended: 94% readiness, emergency obstetric theatre open, 12 blood units in stock.'
                },
                {
                    facilityId: 'lasuth',
                    name: 'LASUTH (Lagos State Teaching Hospital)',
                    tier: 'TERTIARY',
                    tierLabel: 'Tertiary Teaching Hospital',
                    readinessScore: 92,
                    distanceKm: 6.4,
                    bloodStock: 40,
                    theatreAvailable: true,
                    specialistsOnDuty: 10,
                    bedsAvailable: 22,
                    status: 'Available',
                    reason: 'Comprehensive Tertiary Care: ICU ready, 40 blood units, 10 on-duty specialists.'
                },
                {
                    facilityId: 'lagos-island',
                    name: 'Lagos Island General Hospital',
                    tier: 'SECONDARY',
                    tierLabel: 'Secondary Hospital',
                    readinessScore: 88,
                    distanceKm: 8.2,
                    bloodStock: 25,
                    theatreAvailable: true,
                    specialistsOnDuty: 6,
                    bedsAvailable: 15,
                    status: 'Available',
                    reason: 'Alternative Secondary: Full obstetric emergency readiness, 25 blood units.'
                }
            ];

            try {
                const res = await request('/referrals/match-candidates', {
                    method: 'POST',
                    body: JSON.stringify({
                        urgency: urgency || 'Urgent',
                        requiredCapabilities: requirements || [],
                        sendingFacilityId
                    }),
                    timeout: 2000
                });

                if (Array.isArray(res?.candidates) && res.candidates.length > 0) {
                    return res.candidates;
                }
            } catch (err) {
                console.warn('Match candidates preview fallback used:', err.message);
            }

            return defaultCandidates;
        },

        async structureWithAI(note) {
            try {
                const response = await request('/referrals/ai-assist', {
                    method: 'POST',
                    body: JSON.stringify({ notes: note, rawNotes: note })
                });

                if (response?.patientName || response?.age || response?.urgency) {
                    return {
                        patientReference: response.patientName || 'Structured Patient Case',
                        age: response.age || 29,
                        sex: response.gender || 'Female',
                        urgency: response.urgency === 'CRITICAL' ? 'Emergency' : response.urgency === 'HIGH' ? 'Urgent' : 'Routine',
                        requirements: Array.isArray(response.requiredCapabilities) && response.requiredCapabilities.length > 0
                            ? response.requiredCapabilities
                            : ['Emergency obstetric', 'Blood transfusion'],
                        notes: response.clinicalFindings || response.chiefComplaint || note
                    };
                }
            } catch (err) {
                console.warn('Live AI structuring unavailable, applying smart fallback triage:', err.message);
            }

            // Fallback smart extraction
            const isEmergency = /bleed|hemorrhage|unconscious|seizure|gasping|bp\s*(?:[78]\d|\d{2}\/50)|shock/i.test(note);
            const needsBlood = /blood|transfusion|hb|anemi|pvc/i.test(note);
            const needsSurgery = /theatre|c-section|cesarean|rupture|distress/i.test(note);

            const requirements = ['Emergency obstetric'];
            if (needsBlood) requirements.push('Blood transfusion');
            if (needsSurgery) requirements.push('Theater');

            return {
                patientReference: 'Extracted Case',
                age: 29,
                sex: 'Female',
                urgency: isEmergency ? 'Emergency' : 'Urgent',
                requirements,
                notes: note
            };
        }
    },

    facilities: {
        async list() {
            try {
                const backendFacilities = await request('/facilities');
                const list = Array.isArray(backendFacilities) ? backendFacilities : (backendFacilities?.facilities || []);
                if (list.length > 0) {
                    return list.map(normalizeFacility);
                }
            } catch (err) {
                console.warn('Could not load facilities from backend, using mock facilities:', err.message);
            }
            return mockFacilities;
        },

        async networkSummary() {
            try {
                const overview = await request('/command-centre/overview');
                if (overview?.summary) {
                    const s = overview.summary;
                    return {
                        facilitiesOnline: s.availableFacilities ?? s.totalFacilities ?? 4,
                        activeReferrals: s.activeReferrals ?? 8,
                        urgentReferrals: s.urgentReferrals ?? 3,
                        awaitingResponse: s.awaitingResponse ?? 2,
                        acceptedToday: s.acceptedToday ?? 7,
                        careConfirmed: s.careConfirmed ?? 12,
                        inTransit: s.inTransit ?? 5
                    };
                }
            } catch (err) {
                console.warn('Could not load command centre overview from backend, using mock snapshot:', err.message);
            }
            return mockNetworkSnapshot;
        }
    },

    // Voice & Multilingual Integration (STT, TTS, Translation)
    voice: {
        async getLanguages() {
            return await request('/voice/languages');
        },

        async transcribeAudio(audioBlob, language = 'en') {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', language);

            const url = `${API_BASE}/voice/transcribe`;
            const token = localStorage.getItem('referralos_token');
            const res = await fetch(url, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData
            });
            return await res.json();
        },

        async speechToReferral(audioBlob, language = 'en') {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'intake.webm');
            formData.append('language', language);

            const url = `${API_BASE}/voice/speech-to-referral`;
            const token = localStorage.getItem('referralos_token');
            const res = await fetch(url, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData
            });
            return await res.json();
        }
    },

    multilingual: {
        async translate(text, targetLanguage = 'yo', context = 'clinical') {
            return await request('/multilingual/translate', {
                method: 'POST',
                body: JSON.stringify({ text, targetLanguage, context })
            });
        },

        async referralSummary(referral, targetLanguage = 'yo') {
            return await request('/multilingual/referral-summary', {
                method: 'POST',
                body: JSON.stringify({ referral, targetLanguage })
            });
        }
    }
};