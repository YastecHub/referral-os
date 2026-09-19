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

// In-memory active referrals fallback store so updates persist during the session
let localReferrals = [...mockReferrals];

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
            try {
                let endpoint = '/referrals';
                if (direction === 'received') {
                    endpoint = '/referrals/incoming';
                }

                const backendData = await request(endpoint);
                const rawList = Array.isArray(backendData)
                    ? backendData
                    : (backendData?.referrals || backendData?.data || []);

                if (rawList.length > 0) {
                    const normalized = rawList.map(normalizeReferral);
                    if (facilityId) {
                        return normalized.filter((ref) => {
                            if (direction === 'sent') return ref.sendingFacilityId === facilityId;
                            if (direction === 'received') return ref.receivingFacilityId === facilityId;
                            return ref.sendingFacilityId === facilityId || ref.receivingFacilityId === facilityId;
                        });
                    }
                    return normalized;
                }
            } catch (err) {
                console.warn('Could not load live referrals from backend, using session cache:', err.message);
            }

            // Fallback to in-memory local referrals
            let result = [...localReferrals];
            if (facilityId) {
                result = result.filter((referral) => {
                    if (direction === 'sent') return referral.sendingFacilityId === facilityId;
                    if (direction === 'received') return referral.receivingFacilityId === facilityId;
                    return referral.sendingFacilityId === facilityId || referral.receivingFacilityId === facilityId;
                });
            }
            return result;
        },

        async create(referral) {
            try {
                const backendPayload = {
                    patientName: referral.patientReference || 'Unknown Patient',
                    age: Number(referral.age) || 28,
                    gender: referral.sex || 'Female',
                    urgency: referral.urgency || 'Urgent',
                    requiredCapabilities: Array.isArray(referral.requirements) ? referral.requirements : ['Emergency obstetric'],
                    notes: referral.notes || '',
                    rawNotes: referral.notes || '',
                    sendingFacilityId: referral.sendingFacilityId,
                    receivingFacilityId: referral.receivingFacilityId
                };

                const createdBackend = await request('/referrals', {
                    method: 'POST',
                    body: JSON.stringify(backendPayload)
                });

                const normalized = normalizeReferral(createdBackend?.referral || createdBackend);
                localReferrals.unshift(normalized);
                return normalized;
            } catch (err) {
                console.warn('Backend referral creation failed, persisting locally:', err.message);
                const fallbackCreated = {
                    ...referral,
                    id: `REF-${Math.floor(2500 + Math.random() * 7000)}`,
                    status: 'Created',
                    createdAt: new Date().toISOString()
                };
                localReferrals.unshift(fallbackCreated);
                return fallbackCreated;
            }
        },

        async updateStatus(id, status) {
            try {
                let endpoint = `/referrals/${id}/status`;
                let method = 'POST';

                if (status === 'Accepted') {
                    endpoint = `/referrals/${id}/accept`;
                } else if (status === 'Facility Identified' || status === 'Rejected') {
                    endpoint = `/referrals/${id}/cant-accept`;
                }

                const updated = await request(endpoint, {
                    method,
                    body: JSON.stringify({ status })
                });

                // Update in local cache
                const index = localReferrals.findIndex((item) => item.id === id || item.backendId === id);
                if (index !== -1) {
                    localReferrals[index].status = status;
                }

                return normalizeReferral(updated?.referral || updated) || { id, status };
            } catch (err) {
                console.warn('Backend status update failed, updating locally:', err.message);
                const referral = localReferrals.find((item) => item.id === id || item.backendId === id);
                if (referral) {
                    referral.status = status;
                    return referral;
                }
                return { id, status };
            }
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